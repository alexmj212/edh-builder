import Dexie, { type Table } from 'dexie';
import type { Deck, DeckCard, DeckChange } from '../types/deck';

export class EDHBuilderDB extends Dexie {
  decks!: Table<Deck, number>;
  deckCards!: Table<DeckCard, number>;
  deckChanges!: Table<DeckChange, number>;

  constructor() {
    super('EDHBuilder');

    this.version(1).stores({
      decks: '++id, updatedAt',
      deckCards: '++id, deckId, scryfallId',
      deckChanges: '++id, deckId, timestamp',
    });
  }
}

export const db = new EDHBuilderDB();
