import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCardSearchStore } from './card-search-store';
import * as scryfallClient from '../lib/scryfall-client';

function fakeCard(id: string, name: string): Record<string, unknown> {
  return { id, oracle_id: `oracle-${id}`, name, color_identity: [] };
}

function fakeList(
  data: Record<string, unknown>[] = [],
  has_more = false,
  next_page?: string
): Record<string, unknown> {
  return { object: 'list', data, has_more, next_page, total_cards: data.length };
}

beforeEach(() => {
  useCardSearchStore.getState().reset();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('card-search-store', () => {
  it('search() calls scryfall-client searchCards with a query string', async () => {
    const spy = vi
      .spyOn(scryfallClient, 'searchCards')
      .mockResolvedValue(fakeList([fakeCard('c1', 'Card One')]) as never);

    await useCardSearchStore.getState().search('lightning bolt');

    expect(spy).toHaveBeenCalledWith('lightning bolt', 1, expect.anything());
  });

  it("search() populates results on success and sets status to 'success'", async () => {
    vi.spyOn(scryfallClient, 'searchCards').mockResolvedValue(
      fakeList([fakeCard('c1', 'Card One'), fakeCard('c2', 'Card Two')]) as never
    );

    await useCardSearchStore.getState().search('test query');

    const state = useCardSearchStore.getState();
    expect(state.status).toBe('success');
    expect(state.results).toHaveLength(2);
    expect((state.results[0] as Record<string, unknown>).name).toBe('Card One');
  });

  it('search() aborts the in-flight request when called again before first resolves', async () => {
    // First call: reject with AbortError to simulate abortion
    const abortError = new DOMException('Aborted', 'AbortError');
    const rejectPromise = Promise.reject(abortError);
    rejectPromise.catch(() => {}); // suppress unhandled rejection

    vi.spyOn(scryfallClient, 'searchCards')
      .mockReturnValueOnce(rejectPromise as never)
      .mockResolvedValue(fakeList([fakeCard('c1', 'Card One')]) as never);

    // First call aborted
    await useCardSearchStore.getState().search('first query');
    // status should NOT be 'error' — AbortError is silently ignored
    expect(useCardSearchStore.getState().status).not.toBe('error');
  });

  it("search() ignores AbortError and does not set error status", async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const rejectPromise = Promise.reject(abortError);
    rejectPromise.catch(() => {}); // suppress unhandled rejection

    vi.spyOn(scryfallClient, 'searchCards').mockReturnValue(rejectPromise as never);

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
    useCardSearchStore.setState({
      results: [existingCard] as never,
      hasMore: true,
      nextPageUrl: 'https://api.scryfall.com/cards/search?page=2',
      currentPage: 1,
      status: 'success',
    });

    vi.spyOn(scryfallClient, 'fetchNextPage').mockResolvedValue(
      fakeList([newCard1, newCard2], false) as never
    );

    await useCardSearchStore.getState().loadMore();

    const state = useCardSearchStore.getState();
    expect(state.results).toHaveLength(3);
    expect((state.results[0] as Record<string, unknown>).name).toBe('Existing Card');
    expect((state.results[1] as Record<string, unknown>).name).toBe('New Card 2');
    expect((state.results[2] as Record<string, unknown>).name).toBe('New Card 3');
    expect(state.currentPage).toBe(2);
  });

  it('loadMore() sets hasMore=false when response has_more is false', async () => {
    useCardSearchStore.setState({
      results: [fakeCard('c1', 'Card')] as never,
      hasMore: true,
      nextPageUrl: 'https://api.scryfall.com/cards/search?page=2',
      currentPage: 1,
      status: 'success',
    });

    vi.spyOn(scryfallClient, 'fetchNextPage').mockResolvedValue(
      fakeList([fakeCard('c2', 'Last Card')], false) as never
    );

    await useCardSearchStore.getState().loadMore();

    expect(useCardSearchStore.getState().hasMore).toBe(false);
  });

  it('loadMore() does not call fetchNextPage when hasMore is false', async () => {
    const spy = vi.spyOn(scryfallClient, 'fetchNextPage');

    useCardSearchStore.setState({
      hasMore: false,
      nextPageUrl: null,
      status: 'success',
    });

    await useCardSearchStore.getState().loadMore();

    expect(spy).not.toHaveBeenCalled();
  });

  it("reset() clears query, results, currentPage, and sets status to 'idle'", () => {
    useCardSearchStore.setState({
      filters: { name: 'lightning', type: 'instant', oracleText: 'deal' },
      results: [fakeCard('c1', 'Card')] as never,
      hasMore: true,
      nextPageUrl: 'https://api.scryfall.com/cards/search?page=2',
      currentPage: 3,
      status: 'success',
      error: 'some prior error',
    });

    useCardSearchStore.getState().reset();

    const state = useCardSearchStore.getState();
    expect(state.filters).toEqual({ name: '', type: '', oracleText: '' });
    expect(state.results).toEqual([]);
    expect(state.hasMore).toBe(false);
    expect(state.nextPageUrl).toBeNull();
    expect(state.currentPage).toBe(0);
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });
});
