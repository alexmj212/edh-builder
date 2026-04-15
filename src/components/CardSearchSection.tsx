import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../lib/scryfall';
import { useCardSearchStore } from '../store/card-search-store';
import { useCommanderStore } from '../store/commander-store';
import { useDeckCardsStore } from '../store/deck-cards-store';
import { buildSearchQuery } from '../lib/scryfall-queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ColorIdentityChip } from './ColorIdentityChip';
import { CardResultCell } from './CardResultCell';

const PIP_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;

function unionIdentity(
  primary: Card | null,
  partner: Card | null,
): string[] {
  const ci = (c: Card | null) => (c ? c.color_identity : []);
  const combined = new Set<string>([...ci(primary), ...ci(partner)]);
  return PIP_ORDER.filter(l => combined.has(l));
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="animate-spin h-5 w-5 text-text-secondary"
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

export function CardSearchSection() {
  const primary = useCommanderStore(s => s.primaryCommander);
  const partner = useCommanderStore(s => s.partnerCommander);
  const { filters, results, hasMore, status, error, setFilter, search, loadMore, reset } =
    useCardSearchStore();

  // Deck cards store for (+) button wiring
  const deckCards = useDeckCardsStore(s => s.cards);
  const deckId = useDeckCardsStore(s => s.deckId);
  const addCard = useDeckCardsStore(s => s.addCard);

  // Track in-flight adds per card id
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const identity = useMemo(() => unionIdentity(primary, partner), [primary, partner]);
  const hasCommander = !!primary;

  // `searchKey` is null when no commander is selected, so the null→non-null
  // transition when a commander loads is absorbed by the debouncer (single
  // eventual effect fire) instead of triggering the search effect twice —
  // once on the hasCommander flip and again 400ms later when debouncedKey
  // catches up.
  const searchKey = useMemo(
    () => (hasCommander ? JSON.stringify({ filters, identity }) : null),
    [filters, identity, hasCommander],
  );
  const debouncedKey = useDebouncedValue(searchKey, 400);

  // Reset results only when primary commander *changes* (not on first mount)
  const primaryOracleId = primary?.oracle_id ?? null;
  const prevPrimaryOracleId = useRef<string | null>(primaryOracleId);
  useEffect(() => {
    if (prevPrimaryOracleId.current !== primaryOracleId) {
      prevPrimaryOracleId.current = primaryOracleId;
      reset();
    }
  });

  // Fire debounced search when filters or identity change (and commander is selected).
  // hasCommander is intentionally NOT in the deps — it's encoded into searchKey/
  // debouncedKey, so including it here would cause a duplicate fire on the false→
  // true transition (one immediate with stale debouncedKey, one 400ms later).
  //
  // StrictMode-safe dedupe: mount effects run twice in dev (effect → cleanup →
  // effect). Without this ref the second invocation fires a redundant
  // /cards/search with the same inputs. DUP-4 established this pattern for
  // CommanderSearch; apply it here too. `reset()` above handles commander-
  // change invalidation (its searchKey will differ, so the ref miss re-fires).
  const lastFiredSearchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (debouncedKey === null) return;
    if (lastFiredSearchKeyRef.current === debouncedKey) return;
    lastFiredSearchKeyRef.current = debouncedKey;
    const q = buildSearchQuery({
      name: filters.name || undefined,
      type: filters.type || undefined,
      oracleText: filters.oracleText || undefined,
      colorIdentity: identity,
    });
    void search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey]);

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const errorCopy = isOffline
    ? 'You appear to be offline. Check your connection and try again.'
    : 'Something went wrong fetching cards. Check your connection and try again.';

  const handleRetry = () => {
    const q = buildSearchQuery({
      name: filters.name || undefined,
      type: filters.type || undefined,
      oracleText: filters.oracleText || undefined,
      colorIdentity: identity,
    });
    void search(q);
  };

  const handleAdd = async (card: Card) => {
    if (deckId == null) return;
    setAddingIds(prev => new Set(prev).add(card.id));
    try {
      await addCard(deckId, card);
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Card Search</h2>

      {!hasCommander && (
        <div
          role="status"
          className="text-sm text-text-secondary bg-surface border border-border rounded-lg p-2 mb-2"
        >
          Pick a commander first to start searching cards.
        </div>
      )}

      <ColorIdentityChip colorIdentity={hasCommander ? identity : null} />

      <div
        className={`grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 ${!hasCommander ? 'opacity-50 pointer-events-none' : ''}`}
        aria-disabled={!hasCommander || undefined}
      >
        <input
          type="text"
          aria-label="Filter by card name"
          placeholder="Card name..."
          value={filters.name}
          onChange={e => setFilter('name', e.target.value)}
          disabled={!hasCommander}
          className="bg-background border border-border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-secondary"
        />
        <input
          type="text"
          aria-label="Filter by card type"
          placeholder="Card type..."
          value={filters.type}
          onChange={e => setFilter('type', e.target.value)}
          disabled={!hasCommander}
          className="bg-background border border-border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-secondary"
        />
        <input
          type="text"
          aria-label="Filter by oracle text"
          placeholder="Oracle text..."
          value={filters.oracleText}
          onChange={e => setFilter('oracleText', e.target.value)}
          disabled={!hasCommander}
          className="bg-background border border-border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-secondary"
        />
        <div className="flex items-center gap-2">
          {/* Read-only color-identity pip display — pips reflect commander identity. */}
          {PIP_ORDER.map(letter => (
            <span
              key={letter}
              aria-label={identity.includes(letter)
                ? `${letter} (in commander identity)`
                : `${letter} (not in commander identity)`}
              className={`w-6 h-6 rounded-sm text-xs font-semibold flex items-center justify-center ${
                identity.includes(letter) ? 'ring-2 ring-accent' : 'opacity-50'
              }`}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {hasCommander && status === 'loading' && (
        <div role="status" className="flex items-center gap-2 text-text-secondary text-sm py-4">
          <Spinner />
          <span>Searching...</span>
        </div>
      )}

      {hasCommander && status === 'error' && (
        <div
          role="alert"
          className="border-l-4 border-danger bg-surface rounded-r-lg p-4 flex items-start gap-4"
        >
          <span className="text-danger" aria-hidden="true">
            ⚠
          </span>
          <div className="flex-1">
            <p className="text-sm text-text-primary">{errorCopy}</p>
            {error && <p className="text-xs text-text-secondary mt-1">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="text-accent hover:text-accent-hover text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {hasCommander && status === 'success' && results.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-8">No cards match your filters.</p>
      )}

      {hasCommander && results.length > 0 && (
        <>
          <div
            data-testid="card-results-grid"
            aria-busy={status === 'loading'}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {results.map(card => {
              const isInDeck = deckCards.some(c => c.scryfallId === card.id);
              const isAdding = addingIds.has(card.id);
              return (
                <CardResultCell
                  key={card.id}
                  card={card}
                  isInDeck={isInDeck}
                  isAdding={isAdding}
                  onAdd={() => handleAdd(card)}
                />
              );
            })}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  void loadMore();
                }}
                disabled={status === 'loading'}
                className="px-6 py-2 rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-hover text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Load more results
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
