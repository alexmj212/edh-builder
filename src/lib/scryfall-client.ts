import { z } from 'zod';
import type { ScryfallCard } from '@scryfall/api-types';

const BASE = 'https://api.scryfall.com';
const MIN_GAP_MS = 100;
let lastRequestTime = 0;

export function __resetRateLimit(): void {
  lastRequestTime = 0;
}

const ScryfallListSchema = z.object({
  object: z.literal('list'),
  has_more: z.boolean(),
  data: z.array(z.unknown()),
  total_cards: z.number().optional(),
  next_page: z.string().url().optional(),
});

export interface ScryfallList {
  object: 'list';
  has_more: boolean;
  data: ScryfallCard.Any[];
  total_cards?: number;
  next_page?: string;
}

async function waitForRateLimit(signal?: AbortSignal): Promise<void> {
  const wait = MIN_GAP_MS - (Date.now() - lastRequestTime);
  if (wait <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, wait);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function scryfallFetch(input: string, signal?: AbortSignal): Promise<Response> {
  await waitForRateLimit(signal);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  lastRequestTime = Date.now();
  const url = input.startsWith('http') ? input : `${BASE}${input}`;
  return fetch(url, { headers: { Accept: 'application/json' }, signal });
}

function encodeFragment(v: string): string {
  const cleaned = v.replace(/"/g, '').trim();
  if (!cleaned) return '';
  return /[\s"()]/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

export function buildSearchQuery(params: {
  name?: string;
  type?: string;
  oracleText?: string;
  colorIdentity: string[];
}): string {
  const parts: string[] = [];
  if (params.name) {
    const f = encodeFragment(params.name);
    if (f) parts.push(`n:${f}`);
  }
  if (params.type) {
    const f = encodeFragment(params.type);
    if (f) parts.push(`t:${f}`);
  }
  if (params.oracleText) {
    const f = encodeFragment(params.oracleText);
    if (f) parts.push(`o:${f}`);
  }
  const identity = params.colorIdentity.join('').toLowerCase() || 'c';
  parts.push(`id<=${identity}`);
  parts.push('f:commander');
  return parts.join(' ');
}

export function buildCommanderSearchQuery(params: { nameFragment?: string }): string {
  const parts: string[] = [
    '(t:legendary t:creature or o:"can be your commander")',
    'f:commander',
  ];
  if (params.nameFragment) {
    const f = encodeFragment(params.nameFragment);
    if (f) parts.push(`n:${f}`);
  }
  return parts.join(' ');
}

export async function searchCards(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<ScryfallList> {
  const sp = new URLSearchParams({
    q: query,
    unique: 'cards',
    order: 'name',
    page: String(page),
  });
  const res = await scryfallFetch(`/cards/search?${sp}`, signal);
  if (res.status === 404) {
    return { object: 'list', data: [], has_more: false, total_cards: 0 };
  }
  if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
  const json = await res.json();
  const parsed = ScryfallListSchema.parse(json);
  return parsed as ScryfallList;
}

export async function fetchNextPage(
  nextPageUrl: string,
  signal?: AbortSignal,
): Promise<ScryfallList> {
  const res = await scryfallFetch(nextPageUrl, signal);
  if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
  const json = await res.json();
  return ScryfallListSchema.parse(json) as ScryfallList;
}

export async function fetchCardById(
  scryfallId: string,
  signal?: AbortSignal,
): Promise<ScryfallCard.Any> {
  const res = await scryfallFetch(`/cards/${encodeURIComponent(scryfallId)}`, signal);
  if (!res.ok) throw new Error(`Card not found: ${scryfallId}`);
  return (await res.json()) as ScryfallCard.Any;
}

import { detectPartnerType } from './partner-detection';

export async function searchCommanders(fragment: string, signal?: AbortSignal): Promise<ScryfallList> {
  const q = buildCommanderSearchQuery({ nameFragment: fragment });
  const sp = new URLSearchParams({ q, unique: 'cards', order: 'edhrec', page: '1' });
  const res = await scryfallFetch(`/cards/search?${sp}`, signal);
  if (res.status === 404) return { object: 'list', data: [], has_more: false, total_cards: 0 };
  if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
  return ScryfallListSchema.parse(await res.json()) as ScryfallList;
}

export async function searchPartnersFor(
  primary: ScryfallCard.Any,
  fragment: string,
  signal?: AbortSignal,
): Promise<ScryfallList> {
  const kind = detectPartnerType(primary);
  let qBase: string;
  switch (kind.kind) {
    case 'generic':
      qBase = '(o:"Partner") -o:"Partner with" f:commander';
      break;
    case 'friendsForever':
      qBase = 'o:"Friends forever" f:commander';
      break;
    case 'chooseBackground':
      qBase = 't:Background f:commander';
      break;
    case 'named':
      qBase = `!"${kind.partnerName.replace(/"/g, '')}"`;
      break;
    default:
      return { object: 'list', data: [], has_more: false, total_cards: 0 };
  }
  const frag = fragment.trim();
  const q = frag ? `${qBase} ${encodeFragment(frag) ? `n:${encodeFragment(frag)}` : ''}`.trim() : qBase;
  const sp = new URLSearchParams({ q, unique: 'cards', order: 'edhrec', page: '1' });
  const res = await scryfallFetch(`/cards/search?${sp}`, signal);
  if (res.status === 404) return { object: 'list', data: [], has_more: false, total_cards: 0 };
  if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
  return ScryfallListSchema.parse(await res.json()) as ScryfallList;
}

export function getImageUri(
  card: ScryfallCard.Any,
  size: 'normal' | 'art_crop' | 'small',
): string {
  const anyCard = card as unknown as {
    image_uris?: Record<string, string>;
    card_faces?: Array<{ image_uris?: Record<string, string> }>;
  };
  if (anyCard.image_uris?.[size]) return anyCard.image_uris[size];
  const face0 = anyCard.card_faces?.[0];
  if (face0?.image_uris?.[size]) return face0.image_uris[size];
  return '/placeholder-card.jpg';
}
