import type { Card } from '../lib/scryfall';
import { getImageUri } from '../lib/scryfall';
import { isBasicLand } from '../lib/basic-lands';

export interface CardResultCellProps {
  card: Card;
  isInDeck: boolean;
  isAdding: boolean;
  onAdd: () => void | Promise<void>;
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="60"
        strokeDashoffset="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CardResultCell({ card, isInDeck, isAdding, onAdd }: CardResultCellProps) {
  const name = card.name;
  const manaCost = card.mana_cost ?? '';
  const typeLine = card.type_line;
  const oracleText = card.oracle_text ?? '';

  const isBasic = isBasicLand(card);
  const disabled = isAdding || (isInDeck && !isBasic);

  const ariaLabel = isAdding
    ? `Adding ${name}…`
    : isInDeck && !isBasic
      ? 'Already in deck'
      : `Add ${name} to deck`;

  const title = isInDeck && !isBasic && !isAdding ? 'Already in deck' : undefined;

  const stateClasses = isAdding
    ? 'opacity-50 cursor-not-allowed'
    : isInDeck && !isBasic
      ? 'opacity-40 cursor-not-allowed'
      : 'bg-accent opacity-90 hover:opacity-100 cursor-pointer';

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
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onClick={() => { if (!disabled) onAdd(); }}
        className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center p-1 -m-1 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background ${stateClasses}`}
      >
        {isAdding ? (
          <Spinner />
        ) : (
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
