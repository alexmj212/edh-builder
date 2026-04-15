import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DeckColumn } from './DeckColumn';
import { useDeckCardsStore } from '../store/deck-cards-store';
import { useCommanderStore } from '../store/commander-store';
import { db } from '../lib/db';
import type { DeckCardsState } from '../store/deck-cards-store';

function fakeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    oracle_id: 'o-1',
    name: 'Fake Commander',
    type_line: 'Legendary Creature',
    image_uris: { normal: 'https://img/normal.jpg', art_crop: 'https://img/art_crop.jpg', small: 'https://img/small.jpg' },
    color_identity: ['W'],
    keywords: [],
    mana_cost: '{4}',
    ...overrides,
  };
}

function fakeDeckCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    deckId: 1,
    scryfallId: 'c-1',
    cardName: 'Fake Card',
    quantity: 1,
    isCommander: false,
    addedAt: Date.now(),
    originalReleaseDate: null,
    ...overrides,
  };
}

function renderDeckColumn(deckId = 1, onViewToggle?: () => void) {
  return render(
    <MemoryRouter>
      <DeckColumn deckId={deckId} onViewToggle={onViewToggle} />
    </MemoryRouter>
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  // Default state: no commander, no cards
  useCommanderStore.setState({
    primaryCommander: null,
    partnerCommander: null,
    loadedDeckId: 1,
    loading: false,
    error: null,
  });
  // Stub loadForDeck by default so it does NOT overwrite test-seeded state
  useDeckCardsStore.setState({
    deckId: 1,
    cards: [],
    viewMode: 'list',
    loading: false,
    error: null,
    loadForDeck: vi.fn().mockResolvedValue(undefined),
  } as Partial<DeckCardsState>);
  vi.restoreAllMocks();
});

describe('DeckColumn', () => {
  it('renders ViewToggle and Cards:0 header', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    renderDeckColumn();
    expect(await screen.findByText('Your Deck')).toBeInTheDocument();
    expect(screen.getByText(/Cards: 0/)).toBeInTheDocument();
    // ViewToggle presence
    expect(screen.getByRole('group', { name: 'Deck view' })).toBeInTheDocument();
  });

  it('shows "Pick a commander first." gate when no commander is selected', () => {
    useCommanderStore.setState({ primaryCommander: null });
    renderDeckColumn();
    expect(screen.getByText('Pick a commander first.')).toBeInTheDocument();
    expect(screen.getByText('Card search will be enabled once a commander is selected.')).toBeInTheDocument();
  });

  it('shows "No cards yet." when commander set but cards empty', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    expect(screen.getByText('No cards yet.')).toBeInTheDocument();
    expect(screen.getByText('Add from search results on the left.')).toBeInTheDocument();
  });

  it('renders "Cards: {n}" live count in the header', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    useDeckCardsStore.setState({ cards: [fakeDeckCard() as any] });
    renderDeckColumn();
    expect(await screen.findByText(/Cards: 1/)).toBeInTheDocument();
  });

  it('renders DeckListView when viewMode=list', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    useDeckCardsStore.setState({ viewMode: 'list' });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    // List view: aria-pressed=true on List button
    const listBtn = screen.getByRole('button', { name: 'List' });
    expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders DeckGridView when viewMode=grid', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    useDeckCardsStore.setState({ viewMode: 'grid' });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    const gridBtn = screen.getByRole('button', { name: 'Grid' });
    expect(gridBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('defaults to list view when viewMode is list (default)', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    useDeckCardsStore.setState({ viewMode: 'list' });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    const listBtn = screen.getByRole('button', { name: 'List' });
    expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggling view calls store.setViewMode', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    const setViewMode = vi.fn().mockResolvedValue(undefined);
    useDeckCardsStore.setState({ setViewMode } as Partial<DeckCardsState>);
    renderDeckColumn();
    await screen.findByText('Your Deck');
    const gridBtn = screen.getByRole('button', { name: 'Grid' });
    fireEvent.click(gridBtn);
    expect(setViewMode).toHaveBeenCalledWith(1, 'grid');
  });

  describe('view-toggle scroll reset (Phase 03.1 UI polish)', () => {
    it('calls onViewToggle when user switches to Grid view', async () => {
      useCommanderStore.setState({ primaryCommander: fakeCard() as any });
      const setViewMode = vi.fn().mockResolvedValue(undefined);
      useDeckCardsStore.setState({ viewMode: 'list', setViewMode, cards: [fakeDeckCard() as any] } as Partial<DeckCardsState>);
      const onViewToggle = vi.fn();
      renderDeckColumn(1, onViewToggle);
      await screen.findByText('Your Deck');
      const gridBtn = screen.getByRole('button', { name: 'Grid' });
      fireEvent.click(gridBtn);
      expect(onViewToggle).toHaveBeenCalledTimes(1);
      // Regression guard: store wiring still intact
      expect(setViewMode).toHaveBeenCalledTimes(1);
      expect(setViewMode).toHaveBeenCalledWith(1, 'grid');
    });

    it('calls onViewToggle when user switches to List view', async () => {
      useCommanderStore.setState({ primaryCommander: fakeCard() as any });
      const setViewMode = vi.fn().mockResolvedValue(undefined);
      useDeckCardsStore.setState({ viewMode: 'grid', setViewMode, cards: [fakeDeckCard() as any] } as Partial<DeckCardsState>);
      const onViewToggle = vi.fn();
      renderDeckColumn(1, onViewToggle);
      await screen.findByText('Your Deck');
      const listBtn = screen.getByRole('button', { name: 'List' });
      fireEvent.click(listBtn);
      expect(onViewToggle).toHaveBeenCalledTimes(1);
      // Regression guard: store wiring still intact
      expect(setViewMode).toHaveBeenCalledTimes(1);
      expect(setViewMode).toHaveBeenCalledWith(1, 'list');
    });
  });

  it('subscribes to store.error and renders error banner with role="alert"', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    useDeckCardsStore.setState({ error: 'Could not add card. Check your browser storage settings and try again.' });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Could not add card');
  });

  it('art_crop delivery (UI-04): commander-strip-image src contains /art_crop/', async () => {
    useCommanderStore.setState({ primaryCommander: fakeCard() as any });
    renderDeckColumn();
    await screen.findByText('Your Deck');
    const img = await screen.findByTestId('commander-strip-image');
    expect(img.getAttribute('src')).toMatch(/art_crop/);
  });

  it('loadForDeck is StrictMode-safe: first invocation aborts, second runs for real', async () => {
    // The abort-based dedup contract (mirroring commander-store) means the
    // effect IS called twice under StrictMode, but the first invocation's
    // AbortController fires before its first await checkpoint, so it no-ops.
    // Architecture rule R-05: do not combine ref-dedup with abort-on-cleanup.
    const loadForDeck = vi.fn().mockResolvedValue(undefined);
    useDeckCardsStore.setState({ loadForDeck } as Partial<DeckCardsState>);
    render(
      <React.StrictMode>
        <MemoryRouter>
          <DeckColumn deckId={1} />
        </MemoryRouter>
      </React.StrictMode>
    );
    await waitFor(() => expect(loadForDeck.mock.calls.length).toBeGreaterThan(0));
    expect(loadForDeck.mock.calls.length).toBe(2);
    // Both calls target deckId=1 with an AbortSignal
    expect(loadForDeck).toHaveBeenNthCalledWith(1, 1, expect.any(AbortSignal));
    expect(loadForDeck).toHaveBeenNthCalledWith(2, 1, expect.any(AbortSignal));
    // First call's signal must be aborted (the StrictMode cleanup fired)
    const firstSignal = loadForDeck.mock.calls[0][1] as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    // Second call's signal must still be live
    const secondSignal = loadForDeck.mock.calls[1][1] as AbortSignal;
    expect(secondSignal.aborted).toBe(false);
  });
});
