import { useEffect, useRef, useState } from 'react';
import type { Card } from '../lib/scryfall';
import { searchCommanders, searchPartnersFor, getImageUri } from '../lib/scryfall';
import { areCompatiblePartners } from '../lib/partner-detection';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export interface CommanderSearchProps {
  mode: 'primary' | 'partner';
  primaryForPartner?: Card | null;
  onSelect: (card: Card) => void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function CommanderSearch({ mode, primaryForPartner, onSelect }: CommanderSearchProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode === 'partner' && !primaryForPartner) {
      setResults([]);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    const fetchPromise = mode === 'primary'
      ? searchCommanders(debounced, ctrl.signal)
      : searchPartnersFor(primaryForPartner!, debounced, ctrl.signal);
    fetchPromise
      .then(list => {
        if (ctrl.signal.aborted) return;
        setResults(list.data);
        setLoading(false);
      })
      .catch(err => {
        if (isAbortError(err)) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [debounced, mode, primaryForPartner]);

  const handleSelect = (card: Card) => {
    if (mode === 'partner' && primaryForPartner && !areCompatiblePartners(primaryForPartner, card)) {
      return;
    }
    onSelect(card);
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search for a commander..."
        aria-label={mode === 'primary' ? 'Search for a commander' : 'Search for a partner commander'}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-secondary"
      />
      {loading && (
        <ul className="mt-3 space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <li key={i} className="h-14 rounded bg-surface-hover animate-pulse" />
          ))}
        </ul>
      )}
      {!loading && error && (
        <div role="alert" className="mt-3 text-sm text-danger">
          Search failed: {error}
        </div>
      )}
      {!loading && !error && results.length === 0 && debounced && (
        <p className="text-text-secondary text-sm py-4 text-center">
          No commanders match your search.
        </p>
      )}
      {!loading && !error && results.length > 0 && (
        <ul className="mt-3">
          {results.map(card => (
            <li
              key={card.id}
              onClick={() => handleSelect(card)}
              className="flex items-center gap-3 py-2 px-3 rounded hover:bg-surface-hover cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') handleSelect(card); }}
            >
              <img
                src={getImageUri(card, 'art_crop')}
                alt=""
                className="w-12 h-12 rounded object-cover bg-surface-hover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{card.name}</p>
                <p className="text-xs text-text-secondary truncate">{card.type_line}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
