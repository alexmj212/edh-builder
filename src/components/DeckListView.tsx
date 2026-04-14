import type { DeckCard } from '../types/deck';
import type { Card } from '../lib/scryfall';
import { getImageUri } from '../lib/scryfall';
import { categorizeCard, CATEGORY_ORDER, type Category } from '../lib/card-categorizer';

export interface DeckListViewProps {
  cards: DeckCard[];
  cardLookup: (scryfallId: string) => Card | undefined;
  onRemove: (deckCardId: number) => void;
}

interface RowData { deckCard: DeckCard; card: Card; }

export function DeckListView({ cards, cardLookup, onRemove }: DeckListViewProps) {
  // Resolve + group into category buckets
  const buckets = new Map<Category, RowData[]>();
  for (const cat of CATEGORY_ORDER) buckets.set(cat, []);
  for (const dc of cards) {
    const card = cardLookup(dc.scryfallId);
    if (!card) continue;
    const cat = categorizeCard(card.type_line);
    buckets.get(cat)!.push({ deckCard: dc, card });
  }

  return (
    <div>
      {CATEGORY_ORDER.map(cat => {
        const rows = buckets.get(cat)!;
        if (rows.length === 0) return null;
        return (
          <section key={cat} aria-label={`${cat} (${rows.length})`}>
            <div className="flex items-center justify-between px-2 py-2 bg-surface border-b border-border sticky top-0 z-10">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{cat}</span>
              <span className="text-xs text-text-secondary">{rows.length}</span>
            </div>
            <ul>
              {rows.map(({ deckCard, card }) => (
                <li key={deckCard.id}
                  className="flex items-center gap-2 px-2 py-2 hover:bg-surface-hover transition-colors group">
                  <img
                    src={getImageUri(card, 'small')}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="w-8 h-8 rounded object-cover flex-shrink-0 bg-surface"
                  />
                  <span className="flex-1 text-sm text-text-primary line-clamp-1">{card.name}</span>
                  {card.mana_cost && (
                    <span className="text-xs text-text-secondary flex-shrink-0">{card.mana_cost}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${card.name} from deck`}
                    onClick={() => onRemove(deckCard.id!)}
                    className="w-8 h-8 flex items-center justify-center rounded text-text-secondary hover:text-danger focus:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent transition-all flex-shrink-0"
                  >
                    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                      <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
