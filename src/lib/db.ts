import Dexie, { type Table } from 'dexie';
import type { Deck, DeckCard, DeckChange } from '../types/deck';
import type { CachedCard } from '../types/card';

export class EDHBuilderDB extends Dexie {
  decks!: Table<Deck, number>;
  deckCards!: Table<DeckCard, number>;
  deckChanges!: Table<DeckChange, number>;
  cards!: Table<CachedCard, string>;

  constructor() {
    super('EDHBuilder');

    this.version(1).stores({
      decks: '++id, updatedAt',
      deckCards: '++id, deckId, scryfallId',
      deckChanges: '++id, deckId, timestamp',
    });

    this.version(2).stores({
      decks: '++id, updatedAt',
      deckCards: '++id, deckId, scryfallId',
      deckChanges: '++id, deckId, timestamp',
      cards: 'oracle_id, cachedAt',
    });

    this.version(3).stores({
      decks: '++id, updatedAt',
      deckCards: '++id, deckId, scryfallId',
      deckChanges: '++id, deckId, timestamp',
      cards: 'oracle_id, cachedAt',
    });

    this.version(4).stores({
      decks: '++id, updatedAt',
      deckCards: '++id, deckId, scryfallId',
      deckChanges: '++id, deckId, timestamp',
      cards: 'oracle_id, cachedAt',
    });
  }
}

export const db = new EDHBuilderDB();
