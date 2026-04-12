import { create } from 'zustand';
import type { Card } from '../lib/scryfall';
import { db } from '../lib/db';
import { fetchCardById } from '../lib/scryfall';
import { cacheCard } from '../lib/card-cache';
import { detectPartnerType, areCompatiblePartners } from '../lib/partner-detection';

export interface CommanderState {
  primaryCommander: Card | null;
  partnerCommander: Card | null;
  loading: boolean;
  error: string | null;
  loadForDeck: (deckId: number) => Promise<void>;
  setCommander: (deckId: number, card: Card) => Promise<void>;
  clearCommander: (deckId: number) => Promise<void>;
  setPartner: (deckId: number, card: Card) => Promise<void>;
  clearPartner: (deckId: number) => Promise<void>;
}

function colorIdentityOf(card: Card): string[] {
  const ci = (card as unknown as { color_identity?: string[] }).color_identity;
  return Array.isArray(ci) ? ci : [];
}

function idOf(card: Card): string {
  return (card as unknown as { id: string }).id;
}

function nameOf(card: Card): string {
  return (card as unknown as { name: string }).name;
}

export const useCommanderStore = create<CommanderState>((set, get) => ({
  primaryCommander: null,
  partnerCommander: null,
  loading: false,
  error: null,

  loadForDeck: async (deckId) => {
    set({ loading: true, error: null, primaryCommander: null, partnerCommander: null });
    try {
      const deck = await db.decks.get(deckId);
      if (!deck || !deck.commanderId) {
        set({ loading: false });
        return;
      }
      const primary = await fetchCardById(deck.commanderId);
      await cacheCard(primary);

      let partner: Card | null = null;
      if (deck.partnerCommanderId) {
        try {
          partner = await fetchCardById(deck.partnerCommanderId);
          await cacheCard(partner);
        } catch (err) {
          // Partner hydration failure must not abort primary load.
          console.warn('[commander-store] partner hydration failed, clearing slot', err);
          partner = null;
        }
      }

      set({ primaryCommander: primary, partnerCommander: partner, loading: false });
    } catch (err) {
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
    // detectPartnerType is still typed against ScryfallCard.Any — retyping
    // deferred to plan 02.3-03. `as never` keeps the compile path clean.
    const newPrimaryKind = detectPartnerType(card as never).kind;
    let nextPartner = prevPartner;
    if (newPrimaryKind === 'none') {
      nextPartner = null;
    } else if (prevPartner && !areCompatiblePartners(card as never, prevPartner as never)) {
      nextPartner = null;
    }

    const partnerFields = nextPartner === null
      ? { partnerCommanderId: null, partnerCommanderName: null }
      : {};

    await db.decks.update(deckId, {
      commanderId: idOf(card),
      commanderName: nameOf(card),
      colorIdentity: colorIdentityOf(card),
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
      partnerCommanderId: idOf(card),
      partnerCommanderName: nameOf(card),
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
