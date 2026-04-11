# Scryfall API Research

**Project:** EDH Deck Builder
**Researched:** 2026-04-11
**Overall confidence:** HIGH (official docs, verified via multiple sources and community SDKs)

---

## 1. API Overview

Base URL: `https://api.scryfall.com`

The Scryfall API is a free, unauthenticated REST API returning JSON. No API key is required. CORS is fully supported for browser-based SPA calls — `api.scryfall.com` and all Scryfall image origins set CORS headers for GET, HEAD, POST, and OPTIONS requests.

**No backend proxy is needed.** Direct client-to-Scryfall calls work correctly from a browser SPA, provided the correct headers are sent.

---

## 2. Relevant Endpoints

### Card Search — `/cards/search`

```
GET https://api.scryfall.com/cards/search?q={query}&unique=cards&order=name&page=1
```

The primary endpoint for all search UI. Accepts the full Scryfall search syntax as the `q` parameter — the same syntax used on scryfall.com. Returns paginated results of 175 cards per page.

**Parameters:**

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `q` | Scryfall search string | The search query |
| `unique` | `cards` (default), `art`, `prints` | De-duplication strategy — use `cards` to get one result per unique card name |
| `order` | `name`, `cmc`, `edhrec`, `released`, etc. | Sort order |
| `dir` | `auto`, `asc`, `desc` | Sort direction |
| `page` | integer | Page number for pagination |

**Useful `q` syntax for EDH deck builder:**

| Query Goal | Syntax Example |
|------------|----------------|
| Search by name | `name` (bare word searches name by default) |
| Exact name | `!"Lightning Bolt"` |
| Name contains word | `n:lightning` |
| Text contains word | `o:flying` or `oracle:flying` |
| Type contains word | `t:creature` or `type:creature` |
| Color identity fits commander | `id:wug` or `id<=wug` (subset filter) |
| Legal in Commander format | `f:commander` or `legal:commander` |
| Banned in Commander | `banned:commander` |
| Legendary creatures (commanders) | `t:legendary t:creature` |
| Cards that can be commanders | `(t:legendary t:creature) or o:"can be your commander"` |
| Color (not identity) | `c:u` (mono-blue), `c:wu` (white+blue) |
| Mana value | `cmc=3`, `cmc<=4` |
| Combine filters | `t:instant f:commander o:draw` |

**Pagination response shape:**

```json
{
  "object": "list",
  "total_cards": 742,
  "has_more": true,
  "next_page": "https://api.scryfall.com/cards/search?page=2&q=...",
  "data": [ /* array of Card objects */ ]
}
```

When `has_more` is `true`, fetch `next_page` to get subsequent pages. Each page returns up to 175 cards.

---

### Card by Exact or Fuzzy Name — `/cards/named`

```
GET https://api.scryfall.com/cards/named?exact=Lightning+Bolt
GET https://api.scryfall.com/cards/named?fuzzy=ligntning+bolt
```

Returns a single Card object. Use `exact` when you have a confirmed name (e.g., importing a deck list). Use `fuzzy` for forgiving lookup (corrects minor typos). Returns 404 if no match; fuzzy returns a 200 with the best match or a 404 if ambiguous.

---

### Card Autocomplete — `/cards/autocomplete`

```
GET https://api.scryfall.com/cards/autocomplete?q=lightning
```

Returns a Catalog object with up to 20 full English card names matching the prefix. Designed specifically for assistive UI (typeahead). Very fast — use this for live search suggestions as the user types.

```json
{
  "object": "catalog",
  "total_values": 5,
  "data": ["Lightning Bolt", "Lightning Helix", "Lightning Strike", ...]
}
```

---

### Card by Scryfall ID — `/cards/:id`

```
GET https://api.scryfall.com/cards/5f8287b1-5bb6-5f4c-ad17-316a40d5bb0c
```

Returns a single Card object by Scryfall UUID. Use this to fetch full card data for a card whose ID was returned from a prior search or bulk data lookup. This is the most reliable single-card fetch — IDs are stable.

---

### Batch Card Fetch — `/cards/collection`

```
POST https://api.scryfall.com/cards/collection
Content-Type: application/json

{
  "identifiers": [
    { "name": "Lightning Bolt" },
    { "id": "5f8287b1-5bb6-5f4c-ad17-316a40d5bb0c" },
    { "name": "Counterspell", "set": "mmq" }
  ]
}
```

Fetches up to 75 cards in a single request. Returns a list object with `data` (found cards) and `not_found` (unresolved identifiers). This is the correct approach for importing a saved deck list — batch-resolve all card names in one or a few requests instead of one request per card.

Identifier types accepted: `id`, `mtgo_id`, `multiverse_id`, `oracle_id`, `illustration_id`, `name`, `name+set`, `collector_number+set`.

---

### Bulk Data Index — `/bulk-data`

```
GET https://api.scryfall.com/bulk-data
```

Returns a list of available bulk data files with their current download URLs and metadata. URLs change daily (timestamp-based), so always fetch this endpoint first to get the current download URL before downloading a bulk file.

---

## 3. Rate Limiting

**Hard limit:** 10 requests per second (100ms minimum between requests).

**Required behavior:**
- Maintain at least 50–100ms delay between consecutive requests. The Scryfall SDK enforces 100ms by default and refuses to set it below 50ms.
- Receiving repeated HTTP 429 responses can result in your IP/origin being throttled or blocked.
- Scryfall asks developers to cache results locally to avoid redundant requests.

**Recommended implementation for a browser SPA:**

```typescript
// Token-bucket style — enforce minimum gap between calls
let lastRequestTime = 0;
const MIN_GAP_MS = 100;

async function scryfallFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { "Accept": "application/json" }
  });
}
```

**For search-as-you-type:** Debounce the input with 300–500ms delay before firing any request. This both respects rate limits and avoids fetching for incomplete queries.

```typescript
// 400ms debounce — fire only after user pauses typing
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 400);
```

**For batch imports:** Use `/cards/collection` (up to 75 cards per POST) to resolve an entire deck list in 1–2 requests rather than 99 individual calls.

---

## 4. Required HTTP Headers

**User-Agent:** Required for all server-side clients. For browser-based JavaScript, do NOT override the browser's User-Agent — let the browser send its default value. Scryfall explicitly says browser clients should not change this header.

**Accept:** Must be present. Use `application/json` or `*/*`.

**Origin:** Automatically sent by the browser for cross-origin requests. CORS headers are returned by Scryfall only when `Origin` is present and matches the current page's domain+protocol. This is standard browser behavior — no manual work needed.

**Content-Security-Policy (if needed):** Allowlist `*.scryfall.com` for API calls and card images.

---

## 5. Card Object Response Shape

A Card object contains the following fields relevant to this app:

### Core Identity

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Scryfall's unique ID — stable across reprints |
| `oracle_id` | string (UUID) | Unique per Oracle card text — same across all printings |
| `name` | string | Full card name, e.g. `"Lightning Bolt"` |
| `lang` | string | Language code, e.g. `"en"` |
| `released_at` | string | ISO date of this printing |
| `set` | string | 3-5 char set code, e.g. `"m10"` |
| `set_name` | string | Full set name |
| `collector_number` | string | Collector number within the set |
| `rarity` | string | `"common"`, `"uncommon"`, `"rare"`, `"mythic"` |

### Game Rules Data

| Field | Type | Notes |
|-------|------|-------|
| `mana_cost` | string or null | Mana cost in `{W}{U}{B}{R}{G}` notation. Null for lands and some tokens |
| `cmc` | number | Converted mana cost / mana value. May be fractional (rare) |
| `type_line` | string | Full type line, e.g. `"Legendary Creature — Elf Warrior"` |
| `oracle_text` | string or null | Rules text. Null for some tokens. May be empty string |
| `power` | string or null | Power (may be `"*"`) |
| `toughness` | string or null | Toughness (may be `"*"`) |
| `loyalty` | string or null | Planeswalker loyalty |
| `keywords` | string[] | Keyword abilities, e.g. `["Flying", "Vigilance"]` |

### Color Data

| Field | Type | Notes |
|-------|------|-------|
| `colors` | string[] or null | Card's colors per rules. e.g. `["W","U"]`. Null for some card faces |
| `color_identity` | string[] | **The color identity.** Array of color letters: `["W"]`, `["U","G"]`, `[]` for colorless. This is what you compare against the commander's color identity |
| `color_indicator` | string[] or null | Colors shown in the color indicator (hybrid/devoid cards) |
| `produced_mana` | string[] or null | Colors of mana the card can produce |

Color letters: `W` (white), `U` (blue), `B` (black), `R` (red), `G` (green).

### Legality Data

The `legalities` field is an object with a key per supported format and value of `"legal"`, `"not_legal"`, `"restricted"`, or `"banned"`:

```json
"legalities": {
  "standard": "not_legal",
  "pioneer": "legal",
  "modern": "legal",
  "legacy": "legal",
  "vintage": "legal",
  "commander": "legal",
  "pauper": "not_legal",
  "oathbreaker": "legal",
  "paupercommander": "not_legal",
  "duel": "legal",
  "brawl": "not_legal",
  "standardbrawl": "not_legal",
  "alchemy": "not_legal",
  "explorer": "legal",
  "historic": "legal",
  "timeless": "legal",
  "predh": "legal"
}
```

To check Commander legality: `card.legalities.commander === "legal"`.
To check if banned in Commander: `card.legalities.commander === "banned"`.

There is no separate `banned_as_commander` field — the `legalities.commander` field covers both deck inclusion and commander use.

### Image Data

The `image_uris` field is present on most cards. For double-faced/split cards, `image_uris` may be absent at the top level — in that case, each `card_faces` entry has its own `image_uris`.

```json
"image_uris": {
  "small":       "https://cards.scryfall.io/small/...jpg",
  "normal":      "https://cards.scryfall.io/normal/...jpg",
  "large":       "https://cards.scryfall.io/large/...jpg",
  "png":         "https://cards.scryfall.io/png/...png",
  "art_crop":    "https://cards.scryfall.io/art_crop/...jpg",
  "border_crop": "https://cards.scryfall.io/border_crop/...jpg"
}
```

| Size | Dimensions | Format | Use case |
|------|------------|--------|----------|
| `small` | ~146×204px | JPEG | Thumbnail grid |
| `normal` | ~488×680px | JPEG | Standard display |
| `large` | ~672×936px | JPEG | Detail view / zoom |
| `png` | ~745×1040px | PNG | Full quality, transparent |
| `art_crop` | varies | JPEG | Art-only crop (commander header, etc.) |
| `border_crop` | ~480×680px | JPEG | Full card, borders removed |

**Recommendation:** Use `normal` for the deck builder card grid. Use `art_crop` for commander selection thumbnails. Use `large` only for a card detail modal.

### Multi-Face Cards

Double-faced cards (DFCs), split cards, and adventure cards have a `card_faces` array. Each face is a sub-object with its own `name`, `mana_cost`, `type_line`, `oracle_text`, `colors`, `image_uris`, `power`, and `toughness`. The top-level card retains `color_identity` (union of both faces) and `legalities`.

```typescript
// Safe image URI getter that handles DFCs
function getCardImage(card: ScryfallCard, size = "normal"): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return PLACEHOLDER_IMAGE_URL;
}
```

### Commander-Specific Fields

| Field | Type | Notes |
|-------|------|-------|
| `color_identity` | string[] | The definitive field for Commander color identity validation |
| `legalities.commander` | string | `"legal"` or `"banned"` for Commander format |
| `edhrec_rank` | number or null | EDHREC popularity rank — useful for sorting commander search results |
| `game_changer` | boolean or null | Whether this card is on the Commander Rules Committee's Game Changer list (high-power card designation) |

---

## 6. Commander-Specific Data Patterns

### Finding Valid Commanders

Query: `(t:legendary t:creature) or o:"can be your commander"` combined with `f:commander`

```
GET /cards/search?q=(t:legendary+t:creature+or+o:"can+be+your+commander")+f:commander&unique=cards&order=edhrec
```

This returns all valid commander candidates ordered by popularity. Paginate through results (175 per page).

### Filtering Cards by Color Identity

To find cards that fit inside a given commander's color identity, pass the commander's `color_identity` array as a search constraint:

```typescript
// commander.color_identity = ["W", "U", "G"]
const identityStr = commander.color_identity.join(""); // "WUG"
const query = `id<=${identityStr} f:commander`;
// id<= means "color identity is a subset of WUG"
```

The `id<=` operator is critical — it returns cards whose identity is a **subset** of the given identity, which is the correct Commander rule.

### Checking Banned List

The `legalities.commander` field on each card is authoritative. Values:
- `"legal"` — can be included in a Commander deck
- `"banned"` — on the Commander banned list, cannot be included
- `"not_legal"` — not legal for other reasons (e.g., acorn cards, token-only)

There is no need to maintain a separate banned list — every card's legality is embedded in its data. The bulk data file or per-card fetch will have current legality.

---

## 7. Bulk Data

### Available Files

Scryfall publishes bulk data files updated every 12 hours. Get current download URLs by querying the index first:

```
GET https://api.scryfall.com/bulk-data
```

The index returns a list of objects, each with:

| Field | Description |
|-------|-------------|
| `type` | Identifier string (e.g., `"oracle_cards"`) |
| `name` | Human-readable name |
| `description` | What the file contains |
| `download_uri` | Current download URL (changes daily — always use this, never hardcode) |
| `updated_at` | ISO timestamp of last update |
| `size` | Uncompressed file size in bytes |
| `compressed_size` | Gzip-compressed size in bytes |

**Available bulk file types:**

| Type | Description | Approx. Size |
|------|-------------|--------------|
| `oracle_cards` | One card per Oracle ID (unique card text) | ~130MB uncompressed |
| `unique_artwork` | One card per unique illustration | larger |
| `default_cards` | One card per printing (default printing per set) | ~250MB+ |
| `all_cards` | Every printing of every card, all languages | 1GB+ |
| `rulings` | All card rulings | small |

### Recommendation for This App

**Use the `oracle_cards` bulk file.** It gives one entry per distinct card (not per printing), which maps to deck-building needs. At ~130MB uncompressed, it is the smallest file containing full gameplay data. Gzip-compressed it is roughly 25–35MB for download.

### Bulk Data Strategy for Browser SPA

Full bulk download is viable but requires careful implementation:

**Approach A — Live API search only (recommended for MVP)**
- All searches go to `/cards/search` with appropriate `q` parameters
- Cache individual card objects in IndexedDB after first fetch
- No upfront download; works immediately; always fresh data
- Rate limit exposure: only when user is actively searching

**Approach B — Bulk download for offline/fast local search**
- On first use, fetch `oracle_cards` JSON (~130MB)
- Parse and store in IndexedDB (IndexedDB can handle hundreds of MB)
- Run all searches locally against cached data
- Re-fetch bulk file weekly or at set release (data rarely changes between releases)
- CORS note: `objects.scryfall.io` (the CDN hosting bulk files) may or may not send CORS headers — verify at build time or proxy through a service worker

**Tradeoffs:**

| Factor | Live API | Bulk Cache |
|--------|----------|------------|
| First-time experience | Instant | ~30s download |
| Search speed | 200–800ms round trip | <5ms local |
| Offline support | None | Full |
| Data freshness | Always current | Up to 12h stale |
| Implementation complexity | Low | High |
| Rate limit risk | Present | None (after download) |

For the v1 MVP (no backend, browser-only), **start with live API search**, add bulk caching as a progressive enhancement later if search performance is a problem.

---

## 8. Best Practices for Browser SPA

### Request Throttling

Enforce 100ms between API calls at the HTTP layer. Do not fire requests faster than this regardless of UI state.

### Debounce Search Input

Apply a 300–500ms debounce to the card search input. This prevents hammering the API on every keystroke and reduces perceived latency (the search fires only when the user pauses, so the result arrives faster than mid-word fetches).

### Cancel Stale Requests

Use `AbortController` to cancel in-flight search requests when the user types a new query. This prevents race conditions where older results overwrite newer ones.

```typescript
let controller: AbortController | null = null;

function searchCards(query: string) {
  controller?.abort();
  controller = new AbortController();
  return fetch(`/cards/search?q=${encodeURIComponent(query)}`, {
    signal: controller.signal,
    headers: { "Accept": "application/json" }
  });
}
```

### Cache Card Objects in IndexedDB

After fetching a card (by search or by ID), store it in IndexedDB keyed by `oracle_id`. Before any network request, check the cache first. Card Oracle text and legality data changes rarely — a 1-week TTL is reasonable. Images are served from Scryfall's CDN with long cache headers, so do not cache image blobs locally.

### Use `/cards/collection` for Deck Import

When importing a text deck list (99+ card names), resolve all names in batches of 75 via `/cards/collection`. This converts ~99 API calls into 1–2 calls.

### Handle 404 Gracefully on `/cards/named`

If exact name lookup returns 404, fall back to fuzzy lookup or surface a "Card not found" error. Fuzzy lookup returns the single best match, not a list.

### Do Not Cache Prices

Scryfall warns that price data in bulk files is stale within 24 hours. Since this app explicitly excludes price tracking, ignore all `prices` fields.

### Pagination Pattern

For search results that span multiple pages, lazy-load: show the first 175 results immediately, fetch the next page only if the user scrolls near the bottom or clicks "Load more". Do not eagerly fetch all pages — a query like `f:commander` matches tens of thousands of cards.

---

## 9. Key Search Query Reference

These are the most important query patterns for the EDH deck builder:

```
# Find all valid commanders, sorted by EDHREC popularity
(t:legendary t:creature or o:"can be your commander") f:commander
order:edhrec

# Find all cards legal in a W/U/G (Bant) deck
id<=wug f:commander

# Find cards by name fragment
n:llanowar

# Find cards with specific text
o:draw o:card t:instant f:commander

# Find artifacts that fit in commander's identity
t:artifact id<=br f:commander

# Find banned cards (for validation display)
banned:commander
```

---

## Sources

- [Scryfall REST API Documentation](https://scryfall.com/docs/api)
- [Card Objects Reference](https://scryfall.com/docs/api/cards)
- [/cards/search Endpoint](https://scryfall.com/docs/api/cards/search)
- [/cards/named Endpoint](https://scryfall.com/docs/api/cards/named)
- [/cards/autocomplete Endpoint](https://scryfall.com/docs/api/cards/autocomplete)
- [/cards/collection Endpoint](https://scryfall.com/docs/api/cards/collection)
- [Bulk Data Files](https://scryfall.com/docs/api/bulk-data)
- [CORS and CSP Documentation](https://scryfall.com/docs/api/http-concerns)
- [Rate Limits](https://scryfall.com/docs/api/rate-limits)
- [Card Imagery](https://scryfall.com/docs/api/images)
- [Search Reference / Syntax](https://scryfall.com/docs/syntax)
- [User-Agent and Accept header requirement announcement](https://scryfall.com/blog/user-agent-and-accept-header-now-required-on-the-api-225)
- [scryfall-types TypeScript definitions](https://github.com/rubenrangel/scryfall-types)
- [scryfall-sdk documentation](https://github.com/ChiriVulpes/scryfall-sdk/blob/main/DOCUMENTATION.md)
- [Rust scryfall Card struct](https://docs.rs/scryfall/latest/scryfall/card/struct.Card.html) — confidence HIGH for field list
