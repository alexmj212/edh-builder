import type { Card } from '../lib/scryfall';
import type { DeckCard } from '../types/deck';

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

// Zustand store implementation lands in 03-03-PLAN.md.
export const useDeckCardsStore = null as unknown as DeckCardsState;
