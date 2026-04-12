import type { ScryfallCard } from '@scryfall/api-types';
import { getImageUri } from '../lib/scryfall-client';

export interface CardResultCellProps {
  card: ScryfallCard.Any;
}

function get<T>(card: ScryfallCard.Any, key: string): T | undefined {
  return (card as unknown as Record<string, unknown>)[key] as T | undefined;
}

export function CardResultCell({ card }: CardResultCellProps) {
  const name = get<string>(card, 'name') ?? '';
  const manaCost = get<string>(card, 'mana_cost') ?? '';
  const typeLine = get<string>(card, 'type_line') ?? '';
  const oracleText = get<string>(card, 'oracle_text') ?? '';

  return (
    <div
      data-testid="card-result-cell"
      className="relative rounded-lg overflow-hidden bg-surface border border-border cursor-pointer group"
      tabIndex={0}
    >
      <img
        src={getImageUri(card, 'normal')}
        alt={name}
        loading="lazy"
        decoding="async"
        className="w-full aspect-[488/680] object-cover"
      />
      <div className="absolute inset-0 bg-background/90 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        <p className="text-sm font-semibold text-text-primary line-clamp-1">{name}</p>
        {manaCost && <p className="text-xs text-text-secondary">{manaCost}</p>}
        {typeLine && <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{typeLine}</p>}
        {oracleText && <p className="text-xs text-text-secondary line-clamp-2 mt-1">{oracleText}</p>}
      </div>
      <button
        type="button"
        disabled
        title="Add to deck — coming in Phase 3"
        aria-label="Add to deck (coming in Phase 3)"
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center opacity-50 cursor-not-allowed p-1 -m-1"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
