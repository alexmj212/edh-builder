import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ScryfallCard } from '@scryfall/api-types';
import {
  searchCards,
  buildSearchQuery,
  getImageUri,
  __resetRateLimit,
} from './scryfall-client';

function makeListResponse(overrides: object = {}) {
  return JSON.stringify({
    object: 'list',
    has_more: false,
    data: [],
    total_cards: 0,
    ...overrides,
  });
}

function mockFetch(status: number, body: string) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(new Response(body, { status }))
  );
}

describe('scryfall-client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetRateLimit();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('searchCards fires GET /cards/search with correct URLSearchParams (q, unique=cards, order=name, page)', async () => {
    const spy = mockFetch(200, makeListResponse());
    const promise = searchCards('n:bolt id<=r f:commander', 2);
    await vi.runAllTimersAsync();
    await promise;
    expect(spy).toHaveBeenCalledOnce();
    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/cards/search');
    expect(url).toContain('q=n%3Abolt');
    expect(url).toContain('unique=cards');
    expect(url).toContain('order=name');
    expect(url).toContain('page=2');
  });

  it('searchCards includes Accept: application/json header', async () => {
    const spy = mockFetch(200, makeListResponse());
    const promise = searchCards('test');
    await vi.runAllTimersAsync();
    await promise;
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init?.headers as Record<string, string>)?.Accept).toBe('application/json');
  });

  it('searchCards returns parsed ScryfallList on 200', async () => {
    mockFetch(200, makeListResponse({ total_cards: 42, has_more: true }));
    const promise = searchCards('test');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.object).toBe('list');
    expect(result.total_cards).toBe(42);
    expect(result.has_more).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('searchCards returns empty list shape (has_more=false, data=[]) on 404', async () => {
    mockFetch(404, 'Not Found');
    const promise = searchCards('no-match');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.data).toEqual([]);
    expect(result.has_more).toBe(false);
  });

  it('searchCards throws on other 4xx/5xx', async () => {
    mockFetch(500, 'Server Error');
    const promise = searchCards('error');
    // Attach noop catch immediately so Node does not flag as unhandled before
    // the rejects assertion captures it.
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Scryfall error 500');
  });

  it('buildSearchQuery composes n:, t:, o:, id<=, f:commander correctly', () => {
    const result = buildSearchQuery({
      name: 'bolt',
      type: 'instant',
      oracleText: 'deals damage',
      colorIdentity: ['W', 'U'],
    });
    expect(result).toContain('n:bolt');
    expect(result).toContain('t:instant');
    expect(result).toContain('f:commander');
    expect(result).toContain('id<=wu');
    // oracleText has spaces — should be quoted
    expect(result).toContain('o:"deals damage"');
  });

  it('buildSearchQuery uses "c" for empty colorIdentity (colorless commander)', () => {
    const result = buildSearchQuery({ colorIdentity: [] });
    expect(result).toContain('id<=c');
    expect(result).toContain('f:commander');
  });

  it('getImageUri returns image_uris.normal for single-faced cards', () => {
    const c = {
      image_uris: { normal: 'https://example.com/normal.jpg', art_crop: 'https://example.com/art.jpg' },
    } as unknown as ScryfallCard.Any;
    expect(getImageUri(c, 'normal')).toBe('https://example.com/normal.jpg');
  });

  it('getImageUri falls back to card_faces[0].image_uris.normal for DFC', () => {
    const c = {
      card_faces: [
        { image_uris: { normal: 'https://example.com/face0.jpg' } },
        { image_uris: { normal: 'https://example.com/face1.jpg' } },
      ],
    } as unknown as ScryfallCard.Any;
    expect(getImageUri(c, 'normal')).toBe('https://example.com/face0.jpg');
  });

  it('getImageUri returns placeholder for cards with neither', () => {
    const c = {} as unknown as ScryfallCard.Any;
    expect(getImageUri(c, 'normal')).toBe('/placeholder-card.jpg');
  });

  it('rate limiter enforces 100ms gap between requests (use vi.useFakeTimers)', async () => {
    const spy = mockFetch(200, makeListResponse());

    // First call should go through immediately
    const p1 = searchCards('q1');
    await vi.advanceTimersByTimeAsync(0);
    await p1;
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call: only 50ms elapsed — still waiting
    const p2 = searchCards('q2');
    await vi.advanceTimersByTimeAsync(50);
    // fetch was not yet called a second time (still waiting for 100ms gap)
    expect(spy).toHaveBeenCalledTimes(1);

    // Now advance past 100ms — second fetch fires
    await vi.advanceTimersByTimeAsync(60);
    await p2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('rate limiter aborts cleanly when AbortSignal fires mid-wait', async () => {
    mockFetch(200, makeListResponse());

    // First call to set lastRequestTime
    const p1 = searchCards('q1');
    await vi.advanceTimersByTimeAsync(0);
    await p1;

    // Second call with abort signal; abort immediately (before 100ms gap elapsed)
    const controller = new AbortController();
    const p2 = searchCards('q2', 1, controller.signal);
    // Attach noop catch immediately so Node does not flag as unhandled
    p2.catch(() => {});
    controller.abort();
    await vi.runAllTimersAsync();
    await expect(p2).rejects.toThrow();
  });

  it('__resetRateLimit() resets lastRequestTime to 0', async () => {
    const spy = mockFetch(200, makeListResponse());

    // Fire a first call to set lastRequestTime
    const p1 = searchCards('q1');
    await vi.advanceTimersByTimeAsync(0);
    await p1;

    // Reset — next call should fire immediately without waiting
    __resetRateLimit();

    const p2 = searchCards('q2');
    await vi.advanceTimersByTimeAsync(0);
    await p2;
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
