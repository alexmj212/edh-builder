import type { DeckCard } from '../types/deck';
import type { Card } from '../lib/scryfall';
export interface DeckListViewProps {
  cards: DeckCard[];
  cardLookup: (scryfallId: string) => Card | undefined;
  onRemove: (deckCardId: number) => void;
}
export function DeckListView(_props: DeckListViewProps) {
  // Implementation lands in 03-04-PLAN.md.
  return null;
}
