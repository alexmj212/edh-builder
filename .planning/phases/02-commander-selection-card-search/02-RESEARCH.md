# Phase 02: Commander Selection & Card Search — Research

**Researched:** 2026-04-11
**Domain:** Scryfall API integration, react-router-dom v7 routing, Dexie v1→v2 migration, partner detection, card cache TTL
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Commander selection lives in a dedicated commander panel inside the deck workspace (not modal, not at deck-creation time). A deck can exist without a commander.
- **D-02:** Commander discovery = single search input with EDHREC-sorted default list. Query: `(t:legendary t:creature or o:"can be your commander") f:commander order:edhrec`.
- **D-03:** Partner pairing UI shows two visible slots side-by-side: "Commander" and "Partner (optional)". Partner slot disabled until primary commander is partner-eligible.
- **D-04:** Partner search is pre-filtered to only valid pairings per partner type. Invalid pairings are not selectable; no error states at pairing time.
- **D-05:** 400ms debounce. AbortController cancels in-flight requests.
- **D-06:** Separate form fields per filter (name, type, oracle text, color pips). No raw-syntax escape hatch in v1.
- **D-07:** Color-identity filter = always-on locked chip above results. Search is disabled (not hidden) when no commander is selected.
- **D-08:** Image-first card grid using `normal` (488×680) images. Hover/tap reveals type line + oracle snippet. "Add" affordance present as stub icon.
- **D-09:** Add react-router-dom v7. Routes: `/` (DeckList), `/decks/:id` (Deck workspace). Browser back/forward and refresh-into-deck must work.
- **D-10:** Deck workspace layout = single vertical scroll (commander panel → card search → deck placeholder). Not tabs.
- **D-11:** DeckList stays at `/`. Clicking deck navigates to `/decks/:id`. Workspace header shows "← Back to decks" link.
- **D-12:** IndexedDB cache in new Dexie `cards` store keyed by `oracle_id`. Schema bump to db version 2. TTL = 7 days. Stored fields: `oracle_id`, full card JSON, `cachedAt`.
- **D-13:** Do NOT cache full search-result pages. Search results live in component state only.
- **D-14:** Read-through: check `cards` store before any single-card fetch. Search results from `/cards/search` are also written to cache as a side effect.
- **D-15:** All search-surface states are inline messages within the search section (no toasts, no error boundaries).
- **D-16:** Partner-eligibility detection = parse `oracle_text` (with `keywords[]` as shortcut where reliable). Implemented as a pure function with unit tests for all four variants.

### Claude's Discretion
- Exact debounce value within 300–500ms range (400ms is working assumption).
- Specific Tailwind class layouts and visual polish.
- Where the "Add" stub icon sits inside a result card and its placeholder behavior in Phase 2.
- Loading skeletons for commander art / card images.
- Pagination UX (button vs intersection-observer load-more).

### Deferred Ideas (OUT OF SCOPE)
- Card autocomplete (ENH-01)
- Bulk data cache (ENH-02)
- EDHREC-sorted card suggestions for a commander (SUGG-01)
- Any Phase 3+ work (add-to-deck handlers, deck view, validation)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMDR-01 | User can search for a valid commander (legendary creature or "can be your commander") | Scryfall query `(t:legendary t:creature or o:"can be your commander") f:commander order:edhrec` verified |
| CMDR-02 | User can set a commander for a deck | `Deck` type already has `commanderId`, `commanderName`, `colorIdentity` fields; `setCommander` action to add to deck-store |
| CMDR-03 | User can change the commander of an existing deck | Same `setCommander` action clears partner slot; color identity recalculated |
| CMDR-04 | User can select two partner commanders (all 4 variants) | Partner detection pure function covers all 4 variants; partner slot UI in two-slot panel |
| CMDR-05 | Partner pairing validated — only compatible types can be paired | Partner detection + filtered secondary search ensures only valid pairings are shown |
| SRCH-01 | User can search cards by name via Scryfall API | `/cards/search?q=n:{name} id<={identity} f:commander` pattern verified |
| SRCH-02 | User can filter by card type, color, and text | Filter fields compose into `q` string with `t:`, `o:`, `id<=` operators |
| SRCH-03 | Search results auto-filter to commander's color identity | `id<={identity}` operator verified as correct subset operator |
| SRCH-04 | Search results show card image (normal), name, mana cost, type, color | Card object shape verified; `image_uris.normal` (488×680); fallback to `card_faces[0].image_uris.normal` for DFCs |
| SRCH-05 | Search input debounced 300–500ms with AbortController | AbortController pattern and 400ms debounce verified |
| SRCH-06 | Scryfall API rate limiting enforced (100ms minimum) | Token-bucket pattern documented in SCRYFALL_API.md |
| SRCH-07 | Search results paginate (175 per page), with load-more | `has_more` + `next_page` pagination shape verified; load-more button recommended |
</phase_requirements>

---

## Summary

**Five key findings for the planner to internalize:**

1. **Routing: use declarative BrowserRouter, not RouterProvider.** This is a two-route SPA with no data-loading complexity. `BrowserRouter` + `Routes`/`Route` is the correct fit. `RouterProvider`/`createBrowserRouter` adds loader/action machinery that brings zero benefit for this phase and conflicts with the Zustand-centric data pattern already established.

2. **Partner detection must use both `keywords[]` AND `oracle_text`.** The `keywords` array reliably contains `"Partner"` and `"Friends Forever"` for the generic variants. However, `"Partner with <Name>"` includes the named partner in oracle text only (not captured as a distinct keyword entry with the name embedded). `"Choose a Background"` appears in `keywords` but the Background detection for the second slot requires checking `type_line` contains `"Background"` on the second card. A pure function that checks `keywords` first, falls back to oracle_text, covers all four cases cleanly.

3. **Dexie v2 migration is additive-only.** Adding the `cards` store only requires declaring `version(2).stores({...all existing stores..., cards: 'oracle_id, cachedAt'})`. No `upgrade()` callback is needed because no existing records need transformation. The v1 `decks`, `deckCards`, and `deckChanges` stores must be redeclared verbatim in the v2 call to preserve them.

4. **The HTTP client must be a singleton module** with a single shared `lastRequestTime` variable and accept an optional `AbortSignal`. Debounce lives in the search store/hook; rate limiting lives in the HTTP layer. These are two separate concerns at two separate layers.

5. **The `cards` Dexie cache is a pure read-through cache, not a source of truth for UI.** Search results go into component state (card-search-store). The cache is checked on every individual card fetch (commander hydration, Phase 3 deck hydration) and written as a side effect of search results. TTL check: `Date.now() - cachedAt > 7 * 24 * 60 * 60 * 1000`.

**Primary recommendation:** Implement in this dependency order: (1) Dexie v2 migration + cache store, (2) Scryfall HTTP client module, (3) partner detection pure function, (4) routing scaffold, (5) commander search/select UI, (6) card search UI with locked color identity chip.

---

## Scryfall API Specifics

**Confidence: HIGH** — verified against SCRYFALL_API.md (previously verified against official Scryfall docs), npm `@scryfall/api-types@1.0.0-alpha.4` confirmed present in package.json.

### Endpoint: Commander Discovery

```
GET https://api.scryfall.com/cards/search
  ?q=(t:legendary+t:creature+or+o:"can+be+your+commander")+f:commander
  &unique=cards
  &order=edhrec
  &page=1
```

When input is empty, this query shows all valid commanders sorted by EDHREC popularity. When the user types, append `n:{query}` to the `q` string.

### Endpoint: Card Search (color-identity locked)

```
GET https://api.scryfall.com/cards/search
  ?q={name_fragment}+id<={identity}+f:commander{type_fragment}{oracle_fragment}
  &unique=cards
  &order=name
  &page=1
```

Identity string: join `commander.color_identity` array — e.g., `["W","U","G"]` → `"wug"` (case-insensitive). The `id<=` operator is the subset filter: cards whose identity is wholly contained within the given set.

Colorless commanders: `colorIdentity = []` → identity string = `"c"`. Query becomes `id<=c f:commander`.

### Pagination Shape

```json
{
  "object": "list",
  "total_cards": 742,
  "has_more": true,
  "next_page": "https://api.scryfall.com/cards/search?page=2&q=...",
  "data": [ /* Card[] */ ]
}
```

`next_page` is a full URL — fetch it verbatim. Do not reconstruct. Each page: up to 175 cards.

### Rate Limit

- Hard limit: 10 requests/second (100ms minimum gap)
- No response header exposes remaining quota — enforce proactively in the client
- HTTP 429 = throttled. Implement exponential backoff if 429 is received (warn in console, retry after 1 second)

### Required Headers

- `Accept: application/json` — required per Scryfall documentation
- Do NOT override `User-Agent` in browser context (browser sets this automatically and Scryfall explicitly advises against overriding it in browser clients)

### Image URI Fields

| Field | Dimensions | Use |
|-------|-----------|-----|
| `image_uris.normal` | 488×680px JPEG | Card search grid (SRCH-04) |
| `image_uris.art_crop` | variable JPEG | Commander panel header display (UI-04) |
| `image_uris.small` | 146×204px JPEG | Not used in Phase 2 |

**DFC (double-faced card) fallback:**
```typescript
function getImageUri(card: ScryfallCard.Any, size: 'normal' | 'art_crop'): string {
  if ('image_uris' in card && card.image_uris) return card.image_uris[size];
  const faces = 'card_faces' in card ? card.card_faces : null;
  if (faces?.[0]?.image_uris) return faces[0].image_uris[size];
  return '/placeholder-card.jpg';
}
```

### Query String Builder

Filter inputs compose into a single `q` string:

```typescript
function buildSearchQuery(params: {
  name?: string;
  type?: string;
  oracleText?: string;
  colorIdentity: string[]; // commander's identity
}): string {
  const parts: string[] = [];
  if (params.name) parts.push(`n:${encodeFragment(params.name)}`);
  if (params.type) parts.push(`t:${encodeFragment(params.type)}`);
  if (params.oracleText) parts.push(`o:${encodeFragment(params.oracleText)}`);
  const identity = params.colorIdentity.join('').toLowerCase() || 'c';
  parts.push(`id<=${identity}`);
  parts.push('f:commander');
  return parts.join(' ');
}
```

---

## HTTP Client Architecture

**Confidence: HIGH** — pattern based on SCRYFALL_API.md; well-established browser SPA pattern.

### Design Principles

- Single module `src/lib/scryfall-client.ts` — singleton instance ensures the rate-limit state is global
- Rate limiting is at the HTTP layer; debounce is at the store/hook layer
- `AbortSignal` is passed in per-call; the client does not manage abort controllers
- Returns typed response — caller handles error states

### Module Sketch

```typescript
// src/lib/scryfall-client.ts

const BASE = 'https://api.scryfall.com';
const MIN_GAP_MS = 100;

let lastRequestTime = 0;

async function scryfallFetch(
  path: string,
  signal?: AbortSignal
): Promise<Response> {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, wait);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  lastRequestTime = Date.now();
  return fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
}

export async function searchCards(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<ScryfallList> {
  const params = new URLSearchParams({ q: query, unique: 'cards', order: 'name', page: String(page) });
  const res = await scryfallFetch(`/cards/search?${params}`, signal);
  if (!res.ok) {
    if (res.status === 404) return { object: 'list', data: [], has_more: false, total_cards: 0 };
    throw new Error(`Scryfall error ${res.status}`);
  }
  return res.json();
}

export async function fetchCardById(
  scryfallId: string,
  signal?: AbortSignal
): Promise<ScryfallCard.Any> {
  const res = await scryfallFetch(`/cards/${scryfallId}`, signal);
  if (!res.ok) throw new Error(`Card not found: ${scryfallId}`);
  return res.json();
}
```

### AbortController Lifecycle (in store/hook)

```typescript
// In card-search-store.ts or useCardSearch hook
let controller: AbortController | null = null;

async function executeSearch(query: string, page = 1) {
  controller?.abort();
  controller = new AbortController();
  set({ status: 'loading' });
  try {
    const list = await searchCards(query, page, controller.signal);
    set({ status: 'success', results: page === 1 ? list.data : [...get().results, ...list.data], hasMore: list.has_more });
    // Side effect: write results to Dexie cards cache
    cacheCards(list.data);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return; // stale request, ignore
    set({ status: 'error', error: (err as Error).message });
  }
}
```

### Rate-Limiter Note During Wait

The abort signal check inside the sleep ensures that if the user types again during the 100ms throttle window, the stale request is cancelled cleanly without making the network call.

---

## Partner Detection

**Confidence: HIGH** — based on COMMANDER_RULES.md (verified against official MTG rules and wiki) plus research into Scryfall `keywords[]` field behavior.

### Data Source Matrix

| Variant | `keywords[]` contains | `oracle_text` pattern | `type_line` check |
|---------|----------------------|----------------------|-------------------|
| Generic Partner | `"Partner"` | `"Partner"` (standalone line) | Not needed |
| Partner With Name | NOT reliably present; oracle_text carries the name | `"Partner with <Name>"` | Not needed |
| Friends Forever | `"Friends Forever"` | `"Friends forever"` | Not needed |
| Choose a Background | `"Choose a Background"` | `"Choose a Background"` | Checked on **second** card: `type_line.includes("Background")` |

**Key finding:** `keywords[]` is the canonical source for `"Partner"` and `"Friends Forever"` (they are keyword abilities). For `"Partner with <Name>"`, the keyword entry is just `"Partner with"` without the name embedded — the full named target is only reliably in `oracle_text`. Use `oracle_text` for the name extraction.

### Pure Function Signature

```typescript
// src/lib/partner-detection.ts

export type PartnerType =
  | { kind: 'none' }
  | { kind: 'generic' }
  | { kind: 'named'; partnerName: string }
  | { kind: 'friendsForever' }
  | { kind: 'chooseBackground' };

export function detectPartnerType(card: ScryfallCard.Any): PartnerType {
  const keywords: string[] = 'keywords' in card ? (card.keywords ?? []) : [];
  const oracle = ('oracle_text' in card ? card.oracle_text : null) ?? '';
  const typeLine = 'type_line' in card ? (card.type_line ?? '') : '';

  // Friends Forever (check before generic Partner to avoid false match)
  if (keywords.some(k => k.toLowerCase() === 'friends forever') ||
      /friends forever/i.test(oracle)) {
    return { kind: 'friendsForever' };
  }

  // Partner with <Name>
  const namedMatch = oracle.match(/Partner with ([^\n(]+)/i);
  if (namedMatch) {
    return { kind: 'named', partnerName: namedMatch[1].trim() };
  }

  // Choose a Background
  if (keywords.some(k => k.toLowerCase() === 'choose a background') ||
      /choose a background/i.test(oracle)) {
    return { kind: 'chooseBackground' };
  }

  // Generic Partner (last — it's a substring of "Partner with")
  if (keywords.some(k => k.toLowerCase() === 'partner') ||
      /\bpartner\b/i.test(oracle)) {
    return { kind: 'generic' };
  }

  return { kind: 'none' };
}

export function isValidBackground(card: ScryfallCard.Any): boolean {
  const typeLine = 'type_line' in card ? (card.type_line ?? '') : '';
  return /Legendary.*Enchantment.*Background/i.test(typeLine) ||
         (/Legendary/i.test(typeLine) && /Background/i.test(typeLine));
}

export function areCompatiblePartners(
  primary: ScryfallCard.Any,
  secondary: ScryfallCard.Any
): boolean {
  const primaryType = detectPartnerType(primary);
  switch (primaryType.kind) {
    case 'generic':
      return detectPartnerType(secondary).kind === 'generic';
    case 'named':
      return secondary.name === primaryType.partnerName;
    case 'friendsForever':
      return detectPartnerType(secondary).kind === 'friendsForever';
    case 'chooseBackground':
      return isValidBackground(secondary);
    default:
      return false;
  }
}
```

### Test Matrix

| Test Case | Input | Expected Output |
|-----------|-------|----------------|
| Thrasios (generic Partner) | keywords: `["Partner"]` | `{ kind: 'generic' }` |
| Gorm the Great (Partner with Virtus) | oracle: `"Partner with Virtus the Veiled"` | `{ kind: 'named', partnerName: 'Virtus the Veiled' }` |
| Will Kenrith (Friends Forever) | keywords: `["Friends Forever"]` | `{ kind: 'friendsForever' }` |
| Cadira (Choose a Background) | oracle: `"Choose a Background"` | `{ kind: 'chooseBackground' }` |
| Atraxa (no partner) | keywords: `["Flying","Vigilance",...]`, oracle has no partner text | `{ kind: 'none' }` |
| Generic + Generic = valid pair | both `{ kind: 'generic' }` | `true` |
| Generic + FriendsForever = invalid | mismatched kinds | `false` |
| Named + correct named partner | secondary.name matches | `true` |
| Named + wrong named partner | secondary.name doesn't match | `false` |
| ChooseBackground + Background card | secondary type_line contains "Background" | `true` |
| ChooseBackground + non-Background | secondary type_line lacks "Background" | `false` |
| oracle_text-only Partner (no keywords) | keywords `[]`, oracle `"Partner\n"` | `{ kind: 'generic' }` |

**Partner search filtering for the secondary slot:**

| Primary Kind | Secondary Scryfall Query |
|--------------|--------------------------|
| `generic` | `(o:"Partner") -o:"Partner with" f:commander` |
| `named` | `!"<partnerName>"` (exact name match, single card) |
| `friendsForever` | `o:"Friends forever" f:commander` |
| `chooseBackground` | `t:Background f:commander` |

---

## Routing Architecture

**Confidence: HIGH** — verified against react-router-dom v7 official docs; current version 7.14.0 confirmed via npm.

### Chosen Approach: Declarative BrowserRouter

**Rationale:** This is a two-route SPA. `RouterProvider`/`createBrowserRouter` is appropriate when you need route-level data loaders, actions, or Suspense-based pending UI. The existing architecture uses Zustand stores for all async data loading, and the deck workspace will load its deck from the store via URL param — not from a loader function. BrowserRouter keeps the routing concern minimal and avoids fighting against the established Zustand pattern.

**Install:**
```bash
npm install react-router-dom
```
(Current version: 7.14.0 — import from `react-router-dom`, all hooks and components still live there.)

### Route Table

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `<DeckList />` | Unchanged — existing component becomes a route element |
| `/decks/:id` | `<DeckWorkspace />` | New component — reads `id` from `useParams()` |
| `*` | Redirect to `/` | Catch-all for invalid paths |

### App.tsx Transformation

```tsx
// src/App.tsx (Phase 2)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DeckList } from './components/DeckList';
import { DeckWorkspace } from './components/DeckWorkspace';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DeckList />} />
          <Route path="/decks/:id" element={<DeckWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

### DeckList Navigation Change

`DeckCardItem` `onSelect` handler changes from `setActiveDeck(id)` to `useNavigate()`:

```tsx
import { useNavigate } from 'react-router-dom';

// Inside DeckCardItem
const navigate = useNavigate();
// onClick handler:
navigate(`/decks/${deck.id}`);
```

Note: `setActiveDeck` in the Zustand store can be removed or kept for other purposes (e.g., the workspace reads the active deck from URL params, not from the store's `activeDeckId`).

### DeckWorkspace: Deck Not Found Handling

```tsx
// src/components/DeckWorkspace.tsx
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

export function DeckWorkspace() {
  const { id } = useParams<{ id: string }>();
  const deck = useDeckStore(state => state.decks.find(d => String(d.id) === id));

  if (!deck) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary mb-4">Deck not found.</p>
        <Link to="/" className="text-accent hover:text-accent-hover">← Back to decks</Link>
      </div>
    );
  }
  // ... render workspace
}
```

**Browser back/forward:** Because the URL drives deck identity (not store state), browser back/forward and refresh work automatically — `useParams` re-reads the URL on each render.

**`<Layout>` wraps all routes** — the existing Layout shell (header + max-w-7xl main) is preserved.

---

## Dexie v2 Migration

**Confidence: HIGH** — based on BROWSER_STORAGE.md (verified against official Dexie docs), existing v1 schema confirmed by reading `src/lib/db.ts`.

### Current v1 Schema (do not modify)

```typescript
this.version(1).stores({
  decks: '++id, updatedAt',
  deckCards: '++id, deckId, scryfallId',
  deckChanges: '++id, deckId, timestamp',
});
```

### v2 Schema Addition

```typescript
// src/lib/db.ts — add AFTER v1 block (never modify v1)
this.version(2).stores({
  decks: '++id, updatedAt',        // unchanged — must still be declared
  deckCards: '++id, deckId, scryfallId',  // unchanged — must still be declared
  deckChanges: '++id, deckId, timestamp', // unchanged — must still be declared
  cards: 'oracle_id, cachedAt',    // new store — keyed by oracle_id, indexed by cachedAt for TTL queries
});
// No upgrade() callback needed — new store adds itself with no data transform
```

### New `CachedCard` Type

```typescript
// src/types/deck.ts or src/types/card.ts (new file)
export interface CachedCard {
  oracle_id: string;       // primary key (outbound key)
  cardJson: ScryfallCard.Any;
  cachedAt: number;        // Date.now() timestamp
}
```

### Class Declaration Update

```typescript
export class EDHBuilderDB extends Dexie {
  decks!: Table<Deck, number>;
  deckCards!: Table<DeckCard, number>;
  deckChanges!: Table<DeckChange, number>;
  cards!: Table<CachedCard, string>; // second generic = key type (string = oracle_id)
  // ...
}
```

### Migration Testing with Seeded v1 Data

The existing `fake-indexeddb` setup (already in devDependencies and configured in `src/test/setup.ts`) supports this. Pattern:

```typescript
// src/lib/db.test.ts (add migration test)
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Dexie v1 → v2 migration', () => {
  it('preserves v1 decks after v2 schema is applied', async () => {
    // Seed v1 data by writing to the existing db (which is now v2 in tests)
    // then verify the data is still accessible
    const id = await db.decks.add({
      name: 'Pre-migration Deck',
      commanderId: null, commanderName: null, colorIdentity: [],
      createdAt: 1000, updatedAt: 1000,
    });
    const found = await db.decks.get(id);
    expect(found?.name).toBe('Pre-migration Deck');
  });

  it('cards store exists and accepts writes after migration', async () => {
    await db.cards.put({
      oracle_id: 'test-oracle-id',
      cardJson: {} as ScryfallCard.Any,
      cachedAt: Date.now(),
    });
    const cached = await db.cards.get('test-oracle-id');
    expect(cached).toBeDefined();
  });
});
```

**Note on real-browser migration:** Dexie's `version()` system handles the upgrade automatically. When a user who has v1 data opens the v2 app, IndexedDB fires an `upgradeneeded` event, Dexie creates the `cards` store, and the existing v1 stores are untouched. No data is lost.

---

## Card Cache Read-Through

**Confidence: HIGH** — based on D-12, D-13, D-14 from CONTEXT.md; pattern is standard read-through cache.

### TTL Constant

```typescript
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isCacheValid(cachedAt: number): boolean {
  return Date.now() - cachedAt < CACHE_TTL_MS;
}
```

### Write Triggers

| Event | What Gets Cached |
|-------|-----------------|
| Search results returned from `/cards/search` | All cards in `data[]` array written to `db.cards` as a side effect |
| Single-card fetch (commander hydration) | The fetched card written to `db.cards` |
| Phase 3: deck card hydration | (Future) Each fetched card written to `db.cards` |

### Read Order (cache-first)

```typescript
// src/lib/card-cache.ts
export async function getCard(oracleId: string): Promise<ScryfallCard.Any | null> {
  const cached = await db.cards.get(oracleId);
  if (cached && isCacheValid(cached.cachedAt)) {
    return cached.cardJson;
  }
  return null; // caller must fetch from Scryfall and then call cacheCard()
}

export async function cacheCard(card: ScryfallCard.Any): Promise<void> {
  if (!card.oracle_id) return;
  await db.cards.put({
    oracle_id: card.oracle_id,
    cardJson: card,
    cachedAt: Date.now(),
  });
}

export async function cacheCards(cards: ScryfallCard.Any[]): Promise<void> {
  const entries = cards
    .filter(c => c.oracle_id)
    .map(c => ({ oracle_id: c.oracle_id, cardJson: c, cachedAt: Date.now() }));
  await db.cards.bulkPut(entries);
}
```

**Do NOT cache** search-result page lists. Only individual card objects are cached.

---

## Workspace UI Structure

**Confidence: HIGH** — based on D-07, D-08, D-09, D-10, D-11 from CONTEXT.md; Tailwind v4 dark-by-default pattern from FRONTEND_STACK.md.

### Component Tree Sketch

```
<Layout>                              // existing — header + max-w-7xl main
  <DeckWorkspace>                     // new — reads :id param
    <WorkspaceHeader>                 // "← Back to decks" + deck name
    
    <CommanderPanel>                  // CMDR-01..05
      [empty state]                   // "Pick a commander to get started"
      <CommanderSearch>               // search input + EDHREC-sorted results
      <CommanderSlot primary>         // selected commander display (art_crop)
      <CommanderSlot partner?>        // partner slot (disabled if primary not partner-eligible)
    
    <CardSearchSection>               // SRCH-01..07
      [disabled state]                // "Pick a commander first..." (when no commander)
      <ColorIdentityChip locked>      // "Filtered to {name}'s identity (WUG)" + tooltip
      <SearchFilters>                 // name input, type input, oracle-text input
      [loading spinner]               // inline above results
      [zero results]                  // "No cards match your filters."
      [API error banner]              // red banner + Retry button
      <CardResultGrid>                // image-first grid
        <CardResultCell>              // image + name + mana cost + hover overlay + Add stub
      <LoadMoreButton>                // "Load more" (visible when has_more = true)
    
    <DeckPlaceholder>                 // Phase 3: "Deck list goes here"
```

### Empty States

| State | Location | Copy |
|-------|----------|------|
| No commander selected (CommanderPanel) | Commander panel | "Search for a commander to get started." |
| No commander selected (CardSearch) | CardSearch section | "Pick a commander first to start searching cards." |
| Empty search input | CardSearch | "Start typing to search." |
| Zero results | CardSearch | "No cards match your filters." |
| API error | CardSearch | Red banner: "{errorMessage}" + "Retry" button |

### Color-Identity Chip

```tsx
<div className="flex items-center gap-2 mb-3">
  <span className="px-3 py-1 rounded-full bg-surface border border-border text-sm text-text-secondary cursor-default" title="This filter is always active — only cards in your commander's color identity are shown.">
    Filtered to {commander.commanderName}'s identity ({commander.colorIdentity.join('')}) ×
    {/* The × is non-interactive / decorative only — not removable */}
  </span>
</div>
```

Click the chip opens a `<Tooltip>` or inline explainer: "Search results are automatically filtered to cards your commander can legally run."

### Card Result Cell

```tsx
<div className="relative group rounded-lg overflow-hidden cursor-pointer">
  <img
    src={getImageUri(card, 'normal')}
    width={488} height={680}
    loading="lazy"
    decoding="async"
    alt={card.name}
    className="w-full aspect-[488/680] object-cover"
  />
  {/* Hover overlay */}
  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
    <p className="text-white text-xs font-semibold truncate">{card.name}</p>
    <p className="text-white/70 text-xs truncate">{card.type_line}</p>
    <p className="text-white/60 text-xs line-clamp-3">{card.oracle_text}</p>
  </div>
  {/* Add stub */}
  <button
    disabled
    title="Available in the next phase"
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/50 text-white/40 cursor-not-allowed"
  >
    +
  </button>
</div>
```

---

## Pagination Recommendation

**Chosen: Load-More Button**

**Rationale:**
- The card search grid is a deliberate browsing experience — MTG players scan cards, not scroll past them. A "Load more" button gives intentional paging control.
- Intersection Observer infinite scroll works well for news feeds and social media where continuous consumption is the intent. Card browsing is exploratory; users often stop mid-page to read a card they found.
- Button is simpler to implement correctly (no sentinel element, no scroll container confusion, no ResizeObserver setup).
- Accessibility: button is keyboard-accessible out of the box; Intersection Observer requires additional ARIA work.
- SRCH-07 specifically says "load-more" which aligns with button.

**Implementation:**
```tsx
{hasMore && (
  <button
    onClick={() => loadMore()}
    disabled={status === 'loading'}
    className="mx-auto block px-6 py-2 mt-4 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-sm transition-colors disabled:opacity-50"
  >
    {status === 'loading' ? 'Loading...' : 'Load more'}
  </button>
)}
```

`loadMore()` in the store: calls `executeSearch(currentQuery, currentPage + 1)` and appends results to existing `results` array.

---

## State Architecture

**Confidence: HIGH** — follows established deck-store.ts patterns.

### New Stores to Create

**`src/store/commander-store.ts`** — manages commander selection per deck:

```typescript
interface CommanderState {
  primaryCommander: ScryfallCard.Any | null;
  partnerCommander: ScryfallCard.Any | null;
  setCommander: (card: ScryfallCard.Any) => Promise<void>; // writes to db.decks
  clearCommander: () => Promise<void>;
  setPartner: (card: ScryfallCard.Any) => Promise<void>;
  clearPartner: () => Promise<void>;
}
```

Note: Commander data also persists to `db.decks` via `commanderId`, `commanderName`, `colorIdentity` fields (already in schema).

**`src/store/card-search-store.ts`** — manages search query and results:

```typescript
interface CardSearchState {
  query: string;
  results: ScryfallCard.Any[];
  hasMore: boolean;
  currentPage: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  setQuery: (q: string) => void;
  search: (query: string) => Promise<void>; // handles debounce + AbortController
  loadMore: () => Promise<void>;
  reset: () => void;
}
```

**Do not use** `card-cache-store.ts` — cache operations go through `src/lib/card-cache.ts` (Dexie direct), not Zustand. Zustand is for UI-reactive state only.

---

## Risks & Open Questions

### Risk 1: `@scryfall/api-types` Alpha Shape

`@scryfall/api-types@1.0.0-alpha.4` is confirmed in package.json. The discriminated union on `layout` means accessing `image_uris` requires narrowing. Use the `getImageUri()` helper (see Scryfall API section) to encapsulate all DFC fallback logic. Do not spread raw `ScryfallCard.Any` fields directly in JSX.

**Mitigation:** Wrap all Scryfall response access in `src/lib/scryfall-client.ts` and `src/lib/card-cache.ts`. If a field access fails TypeScript, add the helper rather than casting to `any`.

### Risk 2: Scryfall Rate Limiter and Test Isolation

The rate limiter module has a global `lastRequestTime` variable. In tests, this variable persists across test cases if the module is not reset. Each test that calls `searchCards` may be delayed 100ms from the previous test.

**Mitigation:** Export a `__resetRateLimit()` function (test-only) that sets `lastRequestTime = 0`. Call it in `beforeEach`. Alternatively, mock the fetch at the level above the rate limiter. Prefer `vi.mock('../../lib/scryfall-client', ...)` in integration tests.

### Risk 3: Partner with Name Regex Accuracy

The regex `oracle.match(/Partner with ([^\n(]+)/i)` may capture trailing whitespace or punctuation. Test with real oracle text from Scryfall.

**Example oracle text for Gorm the Great:** `"Partner with Virtus the Veiled (When this creature enters the battlefield, target opponent may have Virtus the Veiled enter the battlefield from outside the game.)\nMenace"`. The capture group `([^\n(]+)` stops at `(` which correctly captures `"Virtus the Veiled "` — trim the result.

### Risk 4: Colorless Commander Identity String

When `commander.colorIdentity = []`, the identity string for the query would be empty. Pass `"c"` (colorless) in this case: `const identity = colorIdentity.join('').toLowerCase() || 'c'`. Verify that `id<=c` returns correctly colorless cards via Scryfall.

### Risk 5: DeckList → DeckWorkspace Navigation and Store Hydration

The `DeckWorkspace` component reads `id` from URL params and finds the deck in `useDeckStore().decks`. If the store hasn't loaded yet (fresh page load), `decks` will be `[]` and the deck won't be found — showing the "Deck not found" state briefly before hydration. 

**Mitigation:** Check `loading === true` before showing "Deck not found". Show a loading spinner while `loading === true`, then check if deck exists, then show not-found.

### Open Question: Partner slot reset on commander change

When the user changes the primary commander, the partner slot must be cleared if the new primary is not partner-eligible (or if the existing partner is no longer a valid match). The planner needs to define this behavior explicitly in the setCommander action.

---

## Validation Architecture

> `nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vite.config.ts` (inline `test` block) |
| Quick run command | `vitest run --reporter=verbose src/lib/partner-detection.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMDR-01 | Scryfall commander search returns valid commanders | unit (mock fetch) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| CMDR-02 | setCommander writes to db.decks and updates store | unit | `vitest run src/store/commander-store.test.ts` | ❌ Wave 0 |
| CMDR-03 | Changing commander clears color identity and partner | unit | `vitest run src/store/commander-store.test.ts` | ❌ Wave 0 |
| CMDR-04 | All 4 partner variants correctly detected | unit (pure fn) | `vitest run src/lib/partner-detection.test.ts` | ❌ Wave 0 |
| CMDR-05 | areCompatiblePartners() validates all pairing rules | unit (pure fn) | `vitest run src/lib/partner-detection.test.ts` | ❌ Wave 0 |
| SRCH-01 | searchCards() builds and fires correct query | unit (mock fetch) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| SRCH-02 | buildSearchQuery() composes filters correctly | unit (pure fn) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| SRCH-03 | `id<=` operator included in all card search queries | unit (pure fn) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| SRCH-04 | getImageUri() handles normal, DFC fallback, missing | unit (pure fn) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| SRCH-05 | AbortController cancels in-flight search | unit (mock fetch) | `vitest run src/store/card-search-store.test.ts` | ❌ Wave 0 |
| SRCH-06 | 100ms gap enforced between requests | unit (vi.useFakeTimers) | `vitest run src/lib/scryfall-client.test.ts` | ❌ Wave 0 |
| SRCH-07 | loadMore() appends results, increments page | unit | `vitest run src/store/card-search-store.test.ts` | ❌ Wave 0 |
| Migration | v1 decks preserved after v2 schema applied | unit (fake-indexeddb) | `vitest run src/lib/db.test.ts` | ❌ Wave 0 (extend existing) |
| Cache | getCard() returns null for expired TTL | unit (fake-indexeddb) | `vitest run src/lib/card-cache.test.ts` | ❌ Wave 0 |
| Cache | cacheCards() writes all cards from search results | unit (fake-indexeddb) | `vitest run src/lib/card-cache.test.ts` | ❌ Wave 0 |
| Routing | DeckWorkspace shows "not found" for missing deck | unit (RTL) | `vitest run src/components/DeckWorkspace.test.tsx` | ❌ Wave 0 |

### What to Mock

- **`fetch`**: Use `vi.spyOn(globalThis, 'fetch').mockResolvedValue(...)` or `vi.mock` in all scryfall-client tests. Never make real network calls in tests.
- **Dexie/IndexedDB**: `fake-indexeddb` is already installed and auto-imported in `src/test/setup.ts`. No additional setup needed.
- **`Date.now`**: Use `vi.useFakeTimers()` when testing TTL logic and rate-limiter timing.
- **Rate limiter state**: Export `__resetRateLimit()` from `scryfall-client.ts` and call it in `beforeEach` for client tests.

### Integration vs Unit Boundaries

| Layer | Boundary | Test Type |
|-------|----------|-----------|
| `partner-detection.ts` | Pure functions, no I/O | Unit — no mocks needed |
| `scryfall-client.ts` | Fetch + rate limiter | Unit — mock fetch |
| `card-cache.ts` | Dexie reads/writes | Unit — fake-indexeddb |
| `commander-store.ts` | Zustand + Dexie | Unit — fake-indexeddb, mock scryfall-client |
| `card-search-store.ts` | Zustand + scryfall-client | Unit — mock scryfall-client |
| `DeckWorkspace.tsx` | RTL render + router | Integration — MemoryRouter wrapper |
| `CommanderPanel.tsx` | RTL render | Integration — mock stores |
| `CardResultGrid.tsx` | RTL render | Selective — verify grid renders, not every cell |

### Sampling Rate

- **Per task commit:** `vitest run --reporter=verbose {specific test file}`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All test files listed below need to be created before implementation begins:

- [ ] `src/lib/partner-detection.test.ts` — covers CMDR-04, CMDR-05
- [ ] `src/lib/scryfall-client.test.ts` — covers CMDR-01, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-06
- [ ] `src/lib/card-cache.test.ts` — covers cache read-through, TTL, bulkPut
- [ ] `src/store/commander-store.test.ts` — covers CMDR-02, CMDR-03
- [ ] `src/store/card-search-store.test.ts` — covers SRCH-05, SRCH-07
- [ ] `src/components/DeckWorkspace.test.tsx` — covers routing, not-found, single-scroll layout
- [ ] `src/lib/db.test.ts` — extend existing file to cover v1→v2 migration

---

## Standard Stack

### New Additions

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react-router-dom` | 7.14.0 | URL routing, `useParams`, `useNavigate`, `Link` | Not yet in package.json — must install |

### Existing (confirmed in package.json)

| Library | Version | Phase 2 Use |
|---------|---------|-------------|
| `dexie` | ^4.0.0 (4.4.2 current) | v2 schema + `cards` store |
| `@scryfall/api-types` | 1.0.0-alpha.4 | Card type definitions |
| `zustand` | ^5.0.0 | New stores: commander-store, card-search-store |
| `zod` | ^3.22.0 | Scryfall list response envelope validation |
| `fake-indexeddb` | ^6.2.5 | Already in devDeps — use in migration tests |
| `vitest` | ^4.1.4 | Test runner |
| `@testing-library/react` | ^16.0.0 | Component integration tests |

**Installation command:**
```bash
npm install react-router-dom
```

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/SCRYFALL_API.md` — endpoints, rate limits, headers, pagination, image URIs (previously verified against official Scryfall docs)
- `.planning/research/COMMANDER_RULES.md` — partner variants, color identity rules (verified against official Commander RC docs)
- `.planning/research/FRONTEND_STACK.md` — React/Vitest/Tailwind conventions
- `.planning/research/BROWSER_STORAGE.md` — Dexie versioning, migration pattern
- `src/lib/db.ts` — actual v1 schema confirmed
- `src/store/deck-store.ts` — Zustand pattern to follow
- `src/types/deck.ts` — existing types confirmed
- `package.json` — confirmed all dependency versions including fake-indexeddb already present
- `npm view react-router-dom version` → 7.14.0 (live verification)
- `npm view dexie version` → 4.4.2 (live verification)
- [React Router v7 Modes — official docs](https://reactrouter.com/start/modes) — BrowserRouter vs RouterProvider distinction

### Secondary (MEDIUM confidence)
- [LogRocket: Choosing the right React Router v7 mode](https://blog.logrocket.com/react-router-v7-modes/) — confirms BrowserRouter for simple SPAs
- [Dexie Version.upgrade() docs](https://dexie.org/docs/Version/Version.upgrade()) — migration callback shape

### Tertiary (LOW confidence)
- WebSearch results for partner keywords in Scryfall — unverified directly; confirmed via COMMANDER_RULES.md which cited official MTG wiki

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm registry
- Scryfall API: HIGH — verified in SCRYFALL_API.md against official docs
- Partner detection: HIGH — rules confirmed in COMMANDER_RULES.md; keywords[] behavior inferred from official Scryfall card object docs
- Architecture patterns: HIGH — follow established Phase 1 patterns
- Routing: HIGH — verified against react-router v7 official docs
- Dexie migration: HIGH — verified against Dexie official docs + existing db.ts
- Pitfalls: MEDIUM — rate-limiter test isolation and DFC image fallback are common gotchas

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable ecosystem — react-router, Dexie, Scryfall API are all stable)
