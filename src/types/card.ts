import type { Card } from '../lib/scryfall';

export interface CachedCard {
  /** Scryfall oracle_id — primary key in Dexie cards store. */
  oracle_id: string;
  /** Full Scryfall card JSON as returned by /cards endpoints. */
  cardJson: Card;
  /** Date.now() timestamp when this record was written to the cache. */
  cachedAt: number;
}
