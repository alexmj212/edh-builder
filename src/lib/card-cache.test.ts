import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ScryfallCard } from '@scryfall/api-types';
import { db } from './db';
import { getCard, cacheCard, cacheCards, CACHE_TTL_MS } from './card-cache';

function fakeCard(oracleId: string): ScryfallCard.Any {
  return { oracle_id: oracleId, name: 'Fake Card' } as unknown as ScryfallCard.Any;
}

describe('card-cache', () => {
  beforeEach(async () => {
    // Reset DB before enabling fake timers — Dexie uses Promise microtasks
    // which hang if fake timers intercept them.
    await db.delete();
    await db.open();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-11T00:00:00Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await db.delete();
  });

  it('getCard returns cached JSON when within TTL (7 days)', async () => {
    const card = fakeCard('oracle-fresh');
    // Write directly to db with a fresh cachedAt
    await db.cards.put({ oracle_id: 'oracle-fresh', cardJson: card, cachedAt: Date.now() });
    const result = await getCard('oracle-fresh');
    expect(result).not.toBeNull();
    expect((result as ScryfallCard.Any & { oracle_id: string }).oracle_id).toBe('oracle-fresh');
  });

  it('getCard returns null when cache entry older than 7 days', async () => {
    const staleAt = Date.now() - CACHE_TTL_MS - 1;
    await db.cards.put({ oracle_id: 'oracle-stale', cardJson: fakeCard('oracle-stale'), cachedAt: staleAt });
    const result = await getCard('oracle-stale');
    expect(result).toBeNull();
  });

  it('getCard returns null when oracle_id not in cache', async () => {
    const result = await getCard('does-not-exist');
    expect(result).toBeNull();
  });

  it('cacheCard writes a single card with current cachedAt', async () => {
    const card = fakeCard('oracle-write');
    await cacheCard(card);
    const row = await db.cards.get('oracle-write');
    expect(row).toBeDefined();
    expect(row!.cachedAt).toBe(Date.now());
    expect(row!.oracle_id).toBe('oracle-write');
  });

  it('cacheCard skips cards with no oracle_id (returns without throwing)', async () => {
    await expect(cacheCard({} as ScryfallCard.Any)).resolves.toBeUndefined();
    const count = await db.cards.count();
    expect(count).toBe(0);
  });

  it('cacheCards bulkPuts every card with an oracle_id', async () => {
    const cards = [fakeCard('a'), fakeCard('b'), fakeCard('c')];
    await cacheCards(cards);
    const count = await db.cards.count();
    expect(count).toBe(3);
  });

  it('cacheCards filters out cards missing oracle_id', async () => {
    const cards: ScryfallCard.Any[] = [
      fakeCard('x'),
      fakeCard('y'),
      fakeCard('z'),
      {} as ScryfallCard.Any, // no oracle_id
    ];
    await cacheCards(cards);
    const count = await db.cards.count();
    expect(count).toBe(3);
  });
});
