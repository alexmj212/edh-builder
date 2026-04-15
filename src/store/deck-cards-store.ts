import { create } from 'zustand';
import { db } from '../lib/db';
import { searchCards } from '../lib/scryfall';
import type { Card } from '../lib/scryfall';
import type { DeckCard } from '../types/deck';
import { isBasicLand } from '../lib/basic-lands';

export type AddResult =
  | { ok: true; deckCardId: number }
  | { ok: false; reason: 'already-in-deck' | 'storage-error' };

export interface DeckCardsState {
  deckId: number | null;
  cards: DeckCard[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  error: string | null;
  loadForDeck: (deckId: number, signal?: AbortSignal) => Promise<void>;
  addCard: (deckId: number, card: Card) => Promise<AddResult>;
  removeCard: (deckCardId: number) => Promise<void>;
  setViewMode: (deckId: number, mode: 'grid' | 'list') => Promise<void>;
}

/**
 * Resolves the original release date for a card.
 * Operator locked from 03-ORACLEID-PROBE.md: `oracleid:<oracle_id>`
 *
 * 1. Cross-deck dedupe: if any existing deckCards row has the same scryfallId and
 *    a non-null originalReleaseDate, reuse it without calling Scryfall.
 * 2. Call searchCards with the locked operator, unique:'prints', order:'released', dir:'asc'.
 * 3. Extract released_at from the first result (it's a Date object per Pitfall 1).
 * 4. Format as YYYY-MM-DD via toISOString().slice(0, 10).
 * 5. Return null on any failure (non-blocking per BUILD-08).
 */
async function resolveOriginalReleaseDate(card: Card): Promise<string | null> {
  // Step 1: Cross-deck dedupe — reuse existing value if any deck already has it
  const existing = await db.deckCards
    .filter((dc) => dc.scryfallId === card.id && dc.originalReleaseDate != null)
    .first();
  if (existing?.originalReleaseDate) {
    return existing.originalReleaseDate;
  }

  // Step 2: Fire prints lookup with the locked oracleid: operator
  try {
    const result = await searchCards(
      `oracleid:${card.oracle_id}`,
      { unique: 'prints', order: 'released', dir: 'asc' },
    );

    // Step 3: Extract released_at from the first result
    const released = result.data[0]?.released_at;

    // Step 4: Format as YYYY-MM-DD (released_at is a Date per Pitfall 1)
    if (released instanceof Date && !isNaN(released.getTime())) {
      return released.toISOString().slice(0, 10);
    }
    return null;
  } catch (err) {
    console.warn('[deck-cards-store] originalReleaseDate lookup failed', err);
    return null;
  }
}

export const useDeckCardsStore = create<DeckCardsState>()((set, get) => ({
  deckId: null,
  cards: [],
  viewMode: 'list',
  loading: false,
  error: null,

  loadForDeck: async (deckId: number, signal?: AbortSignal) => {
    // deckId MUST be set synchronously before the first await — mirrors
    // commander-store's loadedDeckId pattern so any subscriber that reads
    // `deckId` between this call and its resolution sees the target deck,
    // not the previously-loaded one. See architecture rule R-03.
    set({ deckId, loading: true, error: null });
    const deck = await db.decks.get(deckId);
    if (signal?.aborted) return;
    const cards = await db.deckCards.where('deckId').equals(deckId).toArray();
    if (signal?.aborted) return;
    set({
      deckId,
      cards,
      viewMode: deck?.viewMode ?? 'list',
      loading: false,
      error: null,
    });
  },

  addCard: async (deckId: number, card: Card): Promise<AddResult> => {
    const state = get();

    // Step 1: Singleton check — block duplicate non-basics
    const alreadyInDeck = state.cards.find((c) => c.scryfallId === card.id);
    if (alreadyInDeck && !isBasicLand(card)) {
      return { ok: false, reason: 'already-in-deck' };
    }

    // Step 2: Resolve originalReleaseDate (non-blocking — null on failure)
    const originalReleaseDate = await resolveOriginalReleaseDate(card);

    // Step 3: Atomic 3-table transaction
    const now = Date.now();
    const row: Omit<DeckCard, 'id'> = {
      deckId,
      scryfallId: card.id,
      cardName: card.name,
      quantity: 1,
      isCommander: false,
      addedAt: now,
      originalReleaseDate,
    };

    try {
      let newId: number | null = null;
      await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => {
        // Step 3a: Re-check duplicate INSIDE the transaction against Dexie truth
        // rather than the in-memory snapshot captured before the Scryfall await.
        // Architecture rule R-07: store-level duplicate guards must re-check
        // from the authoritative source immediately before write, not before
        // the async gap. Two rapid clicks race past the in-memory guard; this
        // catches them.
        if (!isBasicLand(card)) {
          // Query by deckId index, then filter to scryfallId. A Commander deck
          // is bounded to ~100 rows so this scan is trivial and does not need
          // a compound index.
          const existing = await db.deckCards
            .where('deckId').equals(deckId)
            .filter((dc) => dc.scryfallId === card.id)
            .first();
          if (existing) return; // abort transaction work; newId stays null
        }
        newId = (await db.deckCards.add(row)) as number;
        await db.deckChanges.add({
          deckId,
          type: 'add',
          cardName: card.name,
          scryfallId: card.id,
          timestamp: now,
        });
        await db.decks.update(deckId, { updatedAt: now });
      });

      // If the in-transaction dedupe caught a concurrent add, surface the
      // already-in-deck reason just like the pre-await guard would.
      if (newId === null) {
        return { ok: false, reason: 'already-in-deck' };
      }

      // Step 4: Update in-memory state post-commit
      set((s) => ({
        cards: [...s.cards, { id: newId as number, ...row }],
      }));

      return { ok: true, deckCardId: newId };
    } catch (err) {
      set({ error: 'Could not add card. Check your browser storage settings and try again.' });
      return { ok: false, reason: 'storage-error' };
    }
  },

  removeCard: async (deckCardId: number) => {
    const state = get();
    const row = state.cards.find((c) => c.id === deckCardId);
    if (!row) return;

    const now = Date.now();
    try {
      await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => {
        await db.deckCards.delete(deckCardId);
        await db.deckChanges.add({
          deckId: row.deckId,
          type: 'remove',
          cardName: row.cardName,
          scryfallId: row.scryfallId,
          timestamp: now,
        });
        await db.decks.update(row.deckId, { updatedAt: now });
      });
      set((s) => ({
        cards: s.cards.filter((c) => c.id !== deckCardId),
      }));
    } catch (err) {
      set({ error: 'Could not remove card. Check your browser storage settings and try again.' });
    }
  },

  setViewMode: async (deckId: number, mode: 'grid' | 'list') => {
    await db.decks.update(deckId, { viewMode: mode, updatedAt: Date.now() });
    set({ viewMode: mode });
  },
}));
