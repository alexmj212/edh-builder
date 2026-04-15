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
  /** Optional callback fired after a view-mode change so the parent can reset its own scroll. */
  onViewToggle?: () => void;
}

export function DeckColumn({ deckId, onViewToggle }: DeckColumnProps) {
  const cards = useDeckCardsStore(s => s.cards);
  const viewMode = useDeckCardsStore(s => s.viewMode);
  const loadForDeck = useDeckCardsStore(s => s.loadForDeck);
  const removeCard = useDeckCardsStore(s => s.removeCard);
  const setViewMode = useDeckCardsStore(s => s.setViewMode);
  const error = useDeckCardsStore(s => s.error);

  const primaryCommander = useCommanderStore(s => s.primaryCommander);

  // StrictMode-safe loadForDeck. The AbortController is created per-effect-instance
  // and aborted on cleanup, so the second StrictMode invocation (and any rapid
  // deckId change) cancels the in-flight load before it can write stale state.
  // Signal is threaded all the way through to Dexie checkpoints.
  useEffect(() => {
    const ctrl = new AbortController();
    void loadForDeck(deckId, ctrl.signal);
    return () => { ctrl.abort(); };
  }, [deckId, loadForDeck]);

  // Card lookup map: populated from search results (warm) + on-demand fetchCardById.
  // Failed-id set tracks Scryfall misses so a transient network failure (or invalid
  // id) does not cause the missing-cards effect to re-fetch the same id every render
  // — see architecture rule R-04 (effects that setX must not also watch x).
  const [lookupMap, setLookupMap] = useState<Map<string, Card>>(new Map());
  const failedIdsRef = useRef<Set<string>>(new Set());

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

  // Fetch any missing cards by Scryfall id. lookupMap is intentionally NOT in
  // the dep array — we use the functional setter form and read from prev inside,
  // so the effect only needs to react to deckCards changes. Including lookupMap
  // here creates a render loop because the effect calls setLookupMap.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const ids = Array.from(new Set(cards.map(c => c.scryfallId)));
      // Re-read the latest lookupMap via functional setState on write; for the
      // missing-list computation we snapshot once — stale is fine because the
      // effect re-runs when cards changes, and Effect 1 handles search-derived warming.
      const missing = ids.filter(id => !lookupMap.has(id) && !failedIdsRef.current.has(id));
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(id => fetchCardById(id, controller.signal).catch(() => null))
      );
      // Guard: if this effect instance was aborted during the Promise.all, drop the
      // write. Prevents post-unmount state updates and stale-result races on rapid
      // navigation (architecture rule R-03).
      if (controller.signal.aborted) return;
      // Record failures so the next render does not re-retry the same ids forever.
      missing.forEach((id, i) => {
        if (results[i] == null) failedIdsRef.current.add(id);
      });
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
  }, [cards]);

  const cardLookup = (id: string) => lookupMap.get(id);

  function handleToggle(mode: 'grid' | 'list') {
    void setViewMode(deckId, mode);
    onViewToggle?.();
  }

  return (
    <div
      data-testid="deck-column"
      className="rounded-lg bg-surface border border-border p-4"
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
