import { describe, it } from 'vitest';
// NOTE: import path is forward-declared — Wave 1 implements this module.
// This file is intentionally RED/pending. Wave 1 replaces it.todo with real assertions.

describe('card-cache', () => {
  it.todo('getCard returns cached JSON when within TTL (7 days)');
  it.todo('getCard returns null when cache entry older than 7 days');
  it.todo('getCard returns null when oracle_id not in cache');
  it.todo('cacheCard writes a single card with current cachedAt');
  it.todo('cacheCard skips cards with no oracle_id (returns without throwing)');
  it.todo('cacheCards bulkPuts every card with an oracle_id');
  it.todo('cacheCards filters out cards missing oracle_id');
});
