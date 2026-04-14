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
  loadForDeck: (deckId: number) => Promise<void>;
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

  loadForDeck: async (deckId: number) => {
    set({ loading: true, error: null });
    const deck = await db.decks.get(deckId);
    const cards = await db.deckCards.where('deckId').equals(deckId).toArray();
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
      let newId!: number;
      await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => {
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

      // Step 4: Update in-memory state post-commit
      set((s) => ({
        cards: [...s.cards, { id: newId, ...row }],
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
  },

  setViewMode: async (deckId: number, mode: 'grid' | 'list') => {
    await db.decks.update(deckId, { viewMode: mode, updatedAt: Date.now() });
    set({ viewMode: mode });
  },
}));
