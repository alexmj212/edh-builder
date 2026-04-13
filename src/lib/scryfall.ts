// src/lib/scryfall.ts
// Thin wrapper over scryfall-api (MarioMH8). Single module-level entry point
// for all Scryfall HTTP access — enforces D-01 shared throttle (library-owned,
// 100ms), D-04 abort semantics (promise-race), D-05 Zod validation boundary,
// D-07 Card type re-export.
import { Cards, MagicPageResult, ScryfallError } from 'scryfall-api';
import type { Card, CardSearch } from 'scryfall-api';
import { z } from 'zod';
import { buildCommanderSearchQuery, buildPartnerQuery } from './scryfall-queries';

export type { Card, CardSearch } from 'scryfall-api';

// Zod boundary (D-05). The library returns a MagicPageResult<Card> handle with
// a `.next()` that produces `Card[]` — we validate the array shape at the
// wrapper boundary so malformed responses cannot propagate to callers.
const CardLikeSchema = z.object({ id: z.string(), name: z.string() }).passthrough();
const CardArraySchema = z.array(CardLikeSchema);

export interface SearchResult {
  data: Card[];
  hasMore: boolean;
  totalCards: number;
  /** @internal opaque handle for fetchNextPage */
  _page: MagicPageResult<Card>;
}

export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      v => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      e => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

function validatedData(raw: unknown[]): Card[] {
  const parsed = CardArraySchema.parse(raw);
  return parsed as unknown as Card[];
}

async function toSearchResult(
  page: MagicPageResult<Card>,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const data = await abortable(page.next(), signal);
  return {
    data: validatedData(data),
    hasMore: page.hasMore,
    totalCards: page.count,
    _page: page,
  };
}

export async function searchCards(
  query: string,
  options?: CardSearch,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const page = Cards.search(query, options);
  return toSearchResult(page, signal);
}

export async function fetchNextPage(
  handle: SearchResult,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const data = await abortable(handle._page.next(), signal);
  return {
    data: validatedData(data),
    hasMore: handle._page.hasMore,
    totalCards: handle._page.count,
    _page: handle._page,
  };
}

export async function fetchCardById(id: string, signal?: AbortSignal): Promise<Card> {
  const card = await abortable(Cards.byId(id), signal);
  if (!card) throw new Error(`Card not found: ${id}`);
  return card;
}

export async function searchCommanders(
  fragment: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const q = buildCommanderSearchQuery({ nameFragment: fragment });
  return searchCards(q, { order: 'edhrec' }, signal);
}

export async function searchPartnersFor(
  primary: Card,
  fragment: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const q = buildPartnerQuery(primary, fragment);
  if (q === null) {
    // Synthetic empty result for 'none' partner kind — same behavior as old client.
    // We synthesize an inert MagicPageResult-shaped object rather than calling
    // Cards.search('') (which would build a handle capable of firing a
    // bad-request HTTP call to api.scryfall.com/cards/search?q= if .next() were
    // ever invoked). The returned SearchResult has hasMore:false, so the store
    // guard never reaches fetchNextPage with this handle — but in defense of
    // future callers, we keep the handle inert: .next() resolves to [] without
    // any network I/O.
    const emptyPage = {
      next: () => Promise.resolve<Card[]>([]),
      hasMore: false,
      count: 0,
    } as unknown as MagicPageResult<Card>;
    return { data: [], hasMore: false, totalCards: 0, _page: emptyPage };
  }
  return searchCards(q, { order: 'edhrec' }, signal);
}

export function getImageUri(
  card: Card,
  size: 'normal' | 'art_crop' | 'small',
): string {
  const fromCard = card.image_uris?.[size];
  if (fromCard) return fromCard;
  const fromFace = card.card_faces?.[0]?.image_uris?.[size];
  if (fromFace) return fromFace;
  return '/placeholder-card.jpg';
}

export { ScryfallError };
