import { useEffect, useRef, useState } from 'react';
import type { Card } from '../lib/scryfall';
import { fetchCardById } from '../lib/scryfall';
import { useDeckCardsStore } from '../store/deck-cards-store';
import { useCommanderStore } from '../store/commander-store';
import { useCardSearchStore } from '../store/card-search-store';
import { ViewToggle } from './ViewToggle';
import { DeckListView } from './DeckListView';
import { DeckGridView } from './DeckGridView';
import { CommanderPanel } from './CommanderPanel';

export interface DeckColumnProps {
  deckId: number;
}

export function DeckColumn({ deckId }: DeckColumnProps) {
  const cards = useDeckCardsStore(s => s.cards);
  const viewMode = useDeckCardsStore(s => s.viewMode);
  const loadForDeck = useDeckCardsStore(s => s.loadForDeck);
  const removeCard = useDeckCardsStore(s => s.removeCard);
  const setViewMode = useDeckCardsStore(s => s.setViewMode);
  const error = useDeckCardsStore(s => s.error);

  const primaryCommander = useCommanderStore(s => s.primaryCommander);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLoadedDeckIdRef = useRef<number | null>(null);

  // StrictMode-safe loadForDeck gate — mirrors CardSearchSection.tsx pattern
  useEffect(() => {
    if (lastLoadedDeckIdRef.current === deckId) return;
    lastLoadedDeckIdRef.current = deckId;
    void loadForDeck(deckId);
  }, [deckId, loadForDeck]);

  // Card lookup map: populated from search results (warm) + on-demand fetchCardById
  const [lookupMap, setLookupMap] = useState<Map<string, Card>>(new Map());

  // Seed from search store results reactively — subscribes so new results warm
  // the map even when the card list hasn't changed.
  const searchResults = useCardSearchStore(s => s.results);
  useEffect(() => {
    if (searchResults.length > 0) {
      setLookupMap(prev => {
        const next = new Map(prev);
        for (const c of searchResults) next.set(c.id, c);
        return next;
      });
    }
  }, [searchResults]);

  // Fetch any missing cards by Scryfall id
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const ids = Array.from(new Set(cards.map(c => c.scryfallId)));
      const missing = ids.filter(id => !lookupMap.has(id));
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(id => fetchCardById(id, controller.signal).catch(() => null))
      );
      setLookupMap(prev => {
        const next = new Map(prev);
        missing.forEach((id, i) => {
          const c = results[i];
          if (c) next.set(id, c);
        });
        return next;
      });
    })();
    return () => controller.abort();
  }, [cards, lookupMap]);

  const cardLookup = (id: string) => lookupMap.get(id);

  function handleToggle(mode: 'grid' | 'list') {
    void setViewMode(deckId, mode);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  return (
    <div
      ref={scrollRef}
      data-testid="deck-column"
      className="rounded-lg bg-surface border border-border p-4 overflow-y-auto"
    >
      {/* Header: title + card count + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Your Deck
          <span className="ml-2 text-sm font-normal text-text-secondary">
            Cards: {cards.length}
          </span>
        </h2>
        <ViewToggle mode={viewMode} onChange={handleToggle} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="border-l-4 border-danger bg-surface rounded-r-lg p-4 text-sm text-text-primary mb-4"
        >
          {error}
        </div>
      )}

      {/* Commander art strip — always visible (handles own no-commander / loading states) */}
      <CommanderPanel deckId={deckId} variant="art_crop" />

      {/* Card section: gate on commander, then show empty state or card view */}
      {!primaryCommander ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-secondary text-sm">Pick a commander first.</p>
          <p className="text-text-secondary text-sm mt-1">
            Card search will be enabled once a commander is selected.
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-secondary text-sm">No cards yet.</p>
          <p className="text-text-secondary text-sm mt-1">
            Add from search results on the left.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <DeckListView
          cards={cards}
          cardLookup={cardLookup}
          onRemove={id => void removeCard(id)}
        />
      ) : (
        <DeckGridView
          cards={cards}
          cardLookup={cardLookup}
          onRemove={id => void removeCard(id)}
        />
      )}
    </div>
  );
}
