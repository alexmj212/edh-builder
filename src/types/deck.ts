export interface Deck {
  id?: number;
  name: string;
  commanderId: string | null;
  commanderName: string | null;
  colorIdentity: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DeckCard {
  id?: number;
  deckId: number;
  scryfallId: string;
  cardName: string;
  quantity: number;
  isCommander: boolean;
  addedAt: number;
}

export interface DeckChange {
  id?: number;
  deckId: number;
  type: 'add' | 'remove';
  cardName: string;
  scryfallId: string;
  timestamp: number;
}
