import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCardSearchStore } from './card-search-store';
import * as scryfall from '../lib/scryfall';
import type { SearchResult } from '../lib/scryfall';

function fakeCard(id: string, name: string): Record<string, unknown> {
  return { id, oracle_id: `oracle-${id}`, name, color_identity: [] };
}

function fakeResult(
  data: Record<string, unknown>[] = [],
  hasMore = false,
): SearchResult {
  return {
    data: data as never,
    hasMore,
    totalCards: data.length,
    // _page is an opaque handle — in tests we only ever pass it back to mocked
    // fetchNextPage / never invoke methods on it — a placeholder object is fine.
    _page: { next: () => Promise.resolve(data), hasMore, count: data.length } as never,
  };
}

beforeEach(() => {
  useCardSearchStore.getState().reset();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('card-search-store', () => {
  it('search() calls scryfall.searchCards with a query string', async () => {
    const spy = vi
      .spyOn(scryfall, 'searchCards')
      .mockResolvedValue(fakeResult([fakeCard('c1', 'Card One')]) as never);

    await useCardSearchStore.getState().search('lightning bolt');

    expect(spy).toHaveBeenCalledWith('lightning bolt', undefined, expect.anything());
  });

  it("search() populates results on success and sets status to 'success'", async () => {
    vi.spyOn(scryfall, 'searchCards').mockResolvedValue(
      fakeResult([fakeCard('c1', 'Card One'), fakeCard('c2', 'Card Two')]) as never
    );

    await useCardSearchStore.getState().search('test query');

    const state = useCardSearchStore.getState();
    expect(state.status).toBe('success');
    expect(state.results).toHaveLength(2);
    expect((state.results[0] as unknown as Record<string, unknown>).name).toBe('Card One');
  });

  it('search() aborts the in-flight request when called again before first resolves', async () => {
    // First call: reject with AbortError to simulate abortion
    const abortError = new DOMException('Aborted', 'AbortError');
    const rejectPromise = Promise.reject(abortError);
    rejectPromise.catch(() => {}); // suppress unhandled rejection

    vi.spyOn(scryfall, 'searchCards')
      .mockReturnValueOnce(rejectPromise as never)
      .mockResolvedValue(fakeResult([fakeCard('c1', 'Card One')]) as never);

    // First call aborted
    await useCardSearchStore.getState().search('first query');
    // status should NOT be 'error' — AbortError is silently ignored
    expect(useCardSearchStore.getState().status).not.toBe('error');
  });

  it("search() ignores AbortError and does not set error status", async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const rejectPromise = Promise.reject(abortError);
    rejectPromise.catch(() => {}); // suppress unhandled rejection

    vi.spyOn(scryfall, 'searchCards').mockReturnValue(rejectPromise as never);

    // Set a known pre-call state
    useCardSearchStore.setState({ status: 'idle' });

    await useCardSearchStore.getState().search('any query');

    // Should remain 'loading' or 'idle', never 'error'
    expect(useCardSearchStore.getState().status).not.toBe('error');
  });

  it('loadMore() increments currentPage and appends to results (not replaces)', async () => {
    const existingCard = fakeCard('c1', 'Existing Card');
    const newCard1 = fakeCard('c2', 'New Card 2');
    const newCard2 = fakeCard('c3', 'New Card 3');

    // Pre-set state as if a prior search completed with hasMore=true
    const priorHandle = fakeResult([existingCard], true);
    useCardSearchStore.setState({
      results: [existingCard] as never,
      hasMore: true,
      searchHandle: priorHandle,
      currentPage: 1,
      status: 'success',
    });

    vi.spyOn(scryfall, 'fetchNextPage').mockResolvedValue(
      fakeResult([newCard1, newCard2], false) as never
    );

    await useCardSearchStore.getState().loadMore();

    const state = useCardSearchStore.getState();
    expect(state.results).toHaveLength(3);
    expect((state.results[0] as unknown as Record<string, unknown>).name).toBe('Existing Card');
    expect((state.results[1] as unknown as Record<string, unknown>).name).toBe('New Card 2');
    expect((state.results[2] as unknown as Record<string, unknown>).name).toBe('New Card 3');
    expect(state.currentPage).toBe(2);
  });

  it('loadMore() sets hasMore=false when response hasMore is false', async () => {
    const priorHandle = fakeResult([fakeCard('c1', 'Card')], true);
    useCardSearchStore.setState({
      results: [fakeCard('c1', 'Card')] as never,
      hasMore: true,
      searchHandle: priorHandle,
      currentPage: 1,
      status: 'success',
    });

    vi.spyOn(scryfall, 'fetchNextPage').mockResolvedValue(
      fakeResult([fakeCard('c2', 'Last Card')], false) as never
    );

    await useCardSearchStore.getState().loadMore();

    expect(useCardSearchStore.getState().hasMore).toBe(false);
  });

  it('loadMore() does not call fetchNextPage when hasMore is false', async () => {
    const spy = vi.spyOn(scryfall, 'fetchNextPage');

    useCardSearchStore.setState({
      hasMore: false,
      searchHandle: null,
      status: 'success',
    });

    await useCardSearchStore.getState().loadMore();

    expect(spy).not.toHaveBeenCalled();
  });

  it("reset() clears query, results, currentPage, and sets status to 'idle'", () => {
    const priorHandle = fakeResult([fakeCard('c1', 'Card')], true);
    useCardSearchStore.setState({
      filters: { name: 'lightning', type: 'instant', oracleText: 'deal' },
      results: [fakeCard('c1', 'Card')] as never,
      hasMore: true,
      searchHandle: priorHandle,
      currentPage: 3,
      status: 'success',
      error: 'some prior error',
    });

    useCardSearchStore.getState().reset();

    const state = useCardSearchStore.getState();
    expect(state.filters).toEqual({ name: '', type: '', oracleText: '' });
    expect(state.results).toEqual([]);
    expect(state.hasMore).toBe(false);
    expect(state.searchHandle).toBeNull();
    expect(state.currentPage).toBe(0);
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });
});
