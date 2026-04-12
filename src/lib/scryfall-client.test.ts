import { describe, it } from 'vitest';
// NOTE: import path is forward-declared — Wave 1 implements this module.
// This file is intentionally RED/pending. Wave 1 replaces it.todo with real assertions.

describe('scryfall-client', () => {
  it.todo('searchCards fires GET /cards/search with correct URLSearchParams (q, unique=cards, order=name, page)');
  it.todo('searchCards includes Accept: application/json header');
  it.todo('searchCards returns parsed ScryfallList on 200');
  it.todo('searchCards returns empty list shape (has_more=false, data=[]) on 404');
  it.todo('searchCards throws on other 4xx/5xx');
  it.todo('buildSearchQuery composes n:, t:, o:, id<=, f:commander correctly');
  it.todo('buildSearchQuery uses "c" for empty colorIdentity (colorless commander)');
  it.todo('getImageUri returns image_uris.normal for single-faced cards');
  it.todo('getImageUri falls back to card_faces[0].image_uris.normal for DFC');
  it.todo('getImageUri returns placeholder for cards with neither');
  it.todo('rate limiter enforces 100ms gap between requests (use vi.useFakeTimers)');
  it.todo('rate limiter aborts cleanly when AbortSignal fires mid-wait');
  it.todo('__resetRateLimit() resets lastRequestTime to 0');
});
