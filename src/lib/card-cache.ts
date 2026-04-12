import type { Card } from './scryfall';
import { db } from './db';
import type { CachedCard } from '../types/card';

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hasOracleId(c: Card): c is Card & { oracle_id: string } {
  return (
    'oracle_id' in c &&
    typeof (c as { oracle_id?: unknown }).oracle_id === 'string' &&
    ((c as { oracle_id: string }).oracle_id.length > 0)
  );
}

export async function getCard(oracleId: string): Promise<Card | null> {
  if (!oracleId) return null;
  const cached = await db.cards.get(oracleId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt >= CACHE_TTL_MS) return null;
  return cached.cardJson;
}

export async function cacheCard(card: Card): Promise<void> {
  if (!hasOracleId(card)) return;
  const entry: CachedCard = {
    oracle_id: card.oracle_id,
    cardJson: card,
    cachedAt: Date.now(),
  };
  await db.cards.put(entry);
}

export async function cacheCards(cards: Card[]): Promise<void> {
  const now = Date.now();
  const entries: CachedCard[] = cards
    .filter(hasOracleId)
    .map(c => ({ oracle_id: c.oracle_id, cardJson: c, cachedAt: now }));
  if (entries.length === 0) return;
  await db.cards.bulkPut(entries);
}
