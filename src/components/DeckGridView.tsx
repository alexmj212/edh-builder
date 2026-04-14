import { useState } from 'react';
import type { DeckCard } from '../types/deck';
import type { Card } from '../lib/scryfall';
import { getImageUri } from '../lib/scryfall';

export interface DeckGridViewProps {
  cards: DeckCard[];
  cardLookup: (scryfallId: string) => Card | undefined;
  onRemove: (deckCardId: number) => void;
}

function GridCell({ card, onRemove }: { deckCard: DeckCard; card: Card; onRemove: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative rounded overflow-hidden bg-surface aspect-[146/204]">
      {!loaded && (
        <div className="absolute inset-0 bg-surface animate-pulse" aria-hidden="true" />
      )}
      <img
        src={getImageUri(card, 'small')}
        alt={card.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover relative z-10"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${card.name} from deck`}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 z-20 flex items-center justify-center text-text-secondary hover:text-danger focus:text-danger focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function DeckGridView({ cards, cardLookup, onRemove }: DeckGridViewProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2">
      {cards.map(dc => {
        const card = cardLookup(dc.scryfallId);
        if (!card) return null;
        return (
          <GridCell
            key={dc.id}
            deckCard={dc}
            card={card}
            onRemove={() => onRemove(dc.id!)}
          />
        );
      })}
    </div>
  );
}
