import type { ScryfallCard } from '@scryfall/api-types';

export interface CachedCard {
  /** Scryfall oracle_id — primary key in Dexie cards store. */
  oracle_id: string;
  /** Full Scryfall card JSON as returned by /cards endpoints. */
  cardJson: ScryfallCard.Any;
  /** Date.now() timestamp when this record was written to the cache. */
  cachedAt: number;
}
