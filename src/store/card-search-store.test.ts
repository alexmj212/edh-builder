import { describe, it } from 'vitest';
// NOTE: import path is forward-declared — Wave 2 implements this module.
// This file is intentionally RED/pending. Wave 2 replaces it.todo with real assertions.

describe('card-search-store', () => {
  it.todo('search() calls scryfall-client searchCards with a query string');
  it.todo('search() populates results on success and sets status to \'success\'');
  it.todo('search() aborts the in-flight request when called again before first resolves');
  it.todo('search() ignores AbortError and does not set error status');
  it.todo('loadMore() increments currentPage and appends to results (not replaces)');
  it.todo('loadMore() sets hasMore=false when response has_more is false');
  it.todo('reset() clears query, results, currentPage, and sets status to \'idle\'');
});
