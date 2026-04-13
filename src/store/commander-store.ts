import { create } from 'zustand';
import type { Card } from '../lib/scryfall';
import { db } from '../lib/db';
import { fetchCardById } from '../lib/scryfall';
import { cacheCard } from '../lib/card-cache';
import { detectPartnerType, areCompatiblePartners } from '../lib/partner-detection';

export interface CommanderState {
  primaryCommander: Card | null;
  partnerCommander: Card | null;
  /** Which deck this store is hydrated for. null = never loaded. Used by
   * CommanderPanel to distinguish "store has no commander for deck 2 yet"
   * from "store authoritatively says deck 2 has no commander". Without
   * this, a fresh client-side navigation to /decks/N renders the empty
   * state (and dispatches CommanderSearch's EDHREC browse) in the window
   * between DeckWorkspace's render commit and its load effect firing. */
  loadedDeckId: number | null;
  loading: boolean;
  error: string | null;
  loadForDeck: (deckId: number, signal?: AbortSignal) => Promise<void>;
  setCommander: (deckId: number, card: Card) => Promise<void>;
  clearCommander: (deckId: number) => Promise<void>;
  setPartner: (deckId: number, card: Card) => Promise<void>;
  clearPartner: (deckId: number) => Promise<void>;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export const useCommanderStore = create<CommanderState>((set, get) => ({
  primaryCommander: null,
  partnerCommander: null,
  loadedDeckId: null,
  loading: false,
  error: null,

  loadForDeck: async (deckId, signal) => {
    // MUST set loadedDeckId synchronously before the first await so the
    // very next render sees "store is being hydrated for this deck" and
    // CommanderPanel gates correctly. Moving this after the await
    // reopens the homepage → /decks/N empty-browse bug.
    //
    // Only wipe primary/partner on *cross-deck* navigation. On same-deck
    // revisit (e.g. decks → deck 1 → back → deck 1) keep the existing
    // commanders in place — downstream subscribers like CardSearchSection
    // derive `searchKey` from primary.oracle_id+filters; a brief primary→null
    // flicker aborts the in-flight search via CardSearchSection's reset effect
    // but the post-flicker key is identical to the pre-flicker key, so the
    // search effect doesn't re-fire and results stay empty forever. Cross-deck
    // still wipes so atraxa's cards don't briefly appear on thrasios's deck.
    const isSameDeck = get().loadedDeckId === deckId;
    set({
      loadedDeckId: deckId,
      loading: true,
      error: null,
      ...(isSameDeck ? {} : { primaryCommander: null, partnerCommander: null }),
    });
    try {
      const deck = await db.decks.get(deckId);
      if (signal?.aborted) return;
      if (!deck || !deck.commanderId) {
        set({ loading: false });
        return;
      }
      const primary = await fetchCardById(deck.commanderId, signal);
      if (signal?.aborted) return;
      await cacheCard(primary);

      let partner: Card | null = null;
      if (deck.partnerCommanderId) {
        try {
          partner = await fetchCardById(deck.partnerCommanderId, signal);
          await cacheCard(partner);
        } catch (err) {
          if (isAbortError(err)) throw err;
          // Partner hydration failure must not abort primary load.
          console.warn('[commander-store] partner hydration failed, clearing slot', err);
          partner = null;
        }
      }

      if (signal?.aborted) return;
      set({ primaryCommander: primary, partnerCommander: partner, loading: false });
    } catch (err) {
      // Silent on abort — state stays at loading:true, next (unaborted) effect invocation
      // will resolve it. Prevents flashing an error banner on StrictMode double-mount.
      if (isAbortError(err)) return;
      set({
        loading: false,
        error: (err as Error).message,
        primaryCommander: null,
        partnerCommander: null,
      });
    }
  },

  setCommander: async (deckId, card) => {
    const prevPartner = get().partnerCommander;
    const newPrimaryKind = detectPartnerType(card).kind;
    let nextPartner = prevPartner;
    if (newPrimaryKind === 'none') {
      nextPartner = null;
    } else if (prevPartner && !areCompatiblePartners(card, prevPartner)) {
      nextPartner = null;
    }

    const partnerFields = nextPartner === null
      ? { partnerCommanderId: null, partnerCommanderName: null }
      : {};

    await db.decks.update(deckId, {
      commanderId: card.id,
      commanderName: card.name,
      colorIdentity: card.color_identity,
      updatedAt: Date.now(),
      ...partnerFields,
    });
    await cacheCard(card);

    set({ primaryCommander: card, partnerCommander: nextPartner, error: null });
  },

  clearCommander: async (deckId) => {
    await db.decks.update(deckId, {
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      partnerCommanderId: null,
      partnerCommanderName: null,
      updatedAt: Date.now(),
    });
    set({ primaryCommander: null, partnerCommander: null });
  },

  setPartner: async (deckId, card) => {
    await db.decks.update(deckId, {
      partnerCommanderId: card.id,
      partnerCommanderName: card.name,
      updatedAt: Date.now(),
    });
    await cacheCard(card);
    set({ partnerCommander: card });
  },

  clearPartner: async (deckId) => {
    await db.decks.update(deckId, {
      partnerCommanderId: null,
      partnerCommanderName: null,
      updatedAt: Date.now(),
    });
    set({ partnerCommander: null });
  },
}));
