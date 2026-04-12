import { create } from 'zustand';
import type { ScryfallCard } from '@scryfall/api-types';
import { db } from '../lib/db';
import { fetchCardById } from '../lib/scryfall-client';
import { cacheCard } from '../lib/card-cache';
import { detectPartnerType, areCompatiblePartners } from '../lib/partner-detection';

export interface CommanderState {
  primaryCommander: ScryfallCard.Any | null;
  partnerCommander: ScryfallCard.Any | null;
  loading: boolean;
  error: string | null;
  loadForDeck: (deckId: number) => Promise<void>;
  setCommander: (deckId: number, card: ScryfallCard.Any) => Promise<void>;
  clearCommander: (deckId: number) => Promise<void>;
  setPartner: (card: ScryfallCard.Any) => void;
  clearPartner: () => void;
}

function colorIdentityOf(card: ScryfallCard.Any): string[] {
  const ci = (card as unknown as { color_identity?: string[] }).color_identity;
  return Array.isArray(ci) ? ci : [];
}

function idOf(card: ScryfallCard.Any): string {
  return (card as unknown as { id: string }).id;
}

function nameOf(card: ScryfallCard.Any): string {
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
      const card = await fetchCardById(deck.commanderId);
      await cacheCard(card);
      set({ primaryCommander: card, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  setCommander: async (deckId, card) => {
    await db.decks.update(deckId, {
      commanderId: idOf(card),
      commanderName: nameOf(card),
      colorIdentity: colorIdentityOf(card),
      updatedAt: Date.now(),
    });
    await cacheCard(card);

    const prevPartner = get().partnerCommander;
    const newPrimaryKind = detectPartnerType(card).kind;
    let nextPartner = prevPartner;
    if (newPrimaryKind === 'none') {
      nextPartner = null;
    } else if (prevPartner && !areCompatiblePartners(card, prevPartner)) {
      nextPartner = null;
    }
    set({ primaryCommander: card, partnerCommander: nextPartner, error: null });
  },

  clearCommander: async (deckId) => {
    await db.decks.update(deckId, {
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      updatedAt: Date.now(),
    });
    set({ primaryCommander: null, partnerCommander: null });
  },

  setPartner: (card) => {
    set({ partnerCommander: card });
  },

  clearPartner: () => {
    set({ partnerCommander: null });
  },
}));
