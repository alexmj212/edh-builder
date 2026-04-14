import type { DeckCard } from '../types/deck';
import type { Card } from '../lib/scryfall';
export interface DeckGridViewProps {
  cards: DeckCard[];
  cardLookup: (scryfallId: string) => Card | undefined;
  onRemove: (deckCardId: number) => void;
}
export function DeckGridView(_props: DeckGridViewProps) {
  // Implementation lands in 03-04-PLAN.md.
  return null;
}
