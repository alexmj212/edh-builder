import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CardSearchSection } from './CardSearchSection';
import { useCommanderStore } from '../store/commander-store';
import { useCardSearchStore } from '../store/card-search-store';
import type { CardSearchState } from '../store/card-search-store';

function fakeCommander(colorIdentity: string[] = ['W', 'U']): Record<string, unknown> {
  return {
    id: 'c-1',
    oracle_id: 'o-1',
    name: 'Fake',
    type_line: 'Legendary Creature',
    color_identity: colorIdentity,
  };
}

function fakeCard(id: string): Record<string, unknown> {
  return {
    id,
    name: `Card ${id}`,
    type_line: 'Instant',
    mana_cost: '{R}',
    image_uris: { normal: 'x' },
  };
}

/** Stub out search + loadMore so tests that pre-set store state aren't overridden by effects. */
function stubSearchStore() {
  const search = vi.fn().mockResolvedValue(undefined);
  const loadMore = vi.fn().mockResolvedValue(undefined);
  const reset = vi.fn();
  useCardSearchStore.setState({
    search,
    loadMore,
    reset,
  } as any);
  return { search, loadMore, reset };
}

beforeEach(() => {
  vi.useFakeTimers();
  useCommanderStore.setState({
    primaryCommander: null,
    partnerCommander: null,
    loading: false,
    error: null,
  });
  useCardSearchStore.setState({
    filters: { name: '', type: '', oracleText: '' },
    results: [],
    hasMore: false,
    nextPageUrl: null,
    currentPage: 0,
    status: 'idle',
    error: null,
  } as unknown as CardSearchState);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CardSearchSection — no commander', () => {
  it('shows "Pick a commander first" banner and disables inputs', () => {
    render(<CardSearchSection />);
    expect(screen.getByText(/Pick a commander first to start searching cards/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by card name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Filter by card type/i)).toBeDisabled();
    expect(screen.getByLabelText(/Filter by oracle text/i)).toBeDisabled();
  });

  it('shows ColorIdentityChip placeholder copy when no commander', () => {
    render(<CardSearchSection />);
    expect(screen.getByText(/Filtered to: Pick a commander first/i)).toBeInTheDocument();
  });
});

describe('CardSearchSection — with commander', () => {
  beforeEach(() => {
    useCommanderStore.setState({ primaryCommander: fakeCommander(['W', 'U']) as any });
  });

  it('renders ColorIdentityChip with commander pips', () => {
    stubSearchStore();
    render(<CardSearchSection />);
    expect(screen.getByLabelText('White')).toBeInTheDocument();
    expect(screen.getByLabelText('Blue')).toBeInTheDocument();
  });

  it('fires search with id<=wu query after 400ms debounce on mount', async () => {
    // Mock the store's search action directly (store imports searchCards as a local binding
    // so vi.spyOn on the module export won't intercept calls made from within the store).
    const search = vi.fn().mockResolvedValue(undefined);
    useCardSearchStore.setState({ search } as any);
    render(<CardSearchSection />);
    // debouncedKey initialises equal to filterKey on first render, so effect fires immediately.
    // Advance timers and flush microtasks.
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(search).toHaveBeenCalled();
    const firstCallArg = search.mock.calls[0][0] as string;
    expect(firstCallArg).toContain('id<=wu');
    expect(firstCallArg).toContain('f:commander');
  });

  it('typing in name filter triggers debounced search with name:<value>', async () => {
    const search = vi.fn().mockResolvedValue(undefined);
    useCardSearchStore.setState({ search } as any);
    render(<CardSearchSection />);
    // Let the initial search fire
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    search.mockClear();

    // Type a filter value
    fireEvent.change(screen.getByLabelText(/Filter by card name/i), { target: { value: 'bolt' } });

    // Before debounce completes (200ms of 400ms elapsed), no new call
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(search).not.toHaveBeenCalled();

    // After full debounce (another 300ms = 500ms total since change), search fires with name:bolt
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(search).toHaveBeenCalled();
    expect(search.mock.calls[0][0] as string).toContain('name:bolt');
    // Regression: Scryfall has no `n:` shorthand — it silently ignores the filter.
    expect(search.mock.calls[0][0] as string).not.toMatch(/(^|\s)n:/);
  });

  it('renders loading spinner when status is loading', () => {
    stubSearchStore();
    useCardSearchStore.setState({ status: 'loading' } as any);
    render(<CardSearchSection />);
    expect(screen.getByText(/Searching/i)).toBeInTheDocument();
  });

  it('renders zero-results copy when status=success and results is empty', () => {
    stubSearchStore();
    useCardSearchStore.setState({ status: 'success', results: [] } as any);
    render(<CardSearchSection />);
    expect(screen.getByText(/No cards match your filters/i)).toBeInTheDocument();
  });

  it('renders results grid and Load More button when hasMore', () => {
    stubSearchStore();
    useCardSearchStore.setState({
      status: 'success',
      results: [fakeCard('1'), fakeCard('2')],
      hasMore: true,
      nextPageUrl: 'https://api/next',
    } as any);
    render(<CardSearchSection />);
    expect(screen.getByTestId('card-results-grid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load more results/i })).toBeInTheDocument();
  });

  it('error banner shows Try again button', () => {
    stubSearchStore();
    useCardSearchStore.setState({ status: 'error', error: 'boom', results: [] } as any);
    render(<CardSearchSection />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('Load More button calls loadMore', () => {
    const { loadMore } = stubSearchStore();
    useCardSearchStore.setState({
      status: 'success',
      results: [fakeCard('1')],
      hasMore: true,
      nextPageUrl: 'x',
    } as any);
    render(<CardSearchSection />);
    fireEvent.click(screen.getByRole('button', { name: /Load more results/i }));
    expect(loadMore).toHaveBeenCalled();
  });
});
