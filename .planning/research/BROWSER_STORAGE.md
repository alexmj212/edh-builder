# Browser Storage for Deck Persistence

**Project:** EDH Deck Builder
**Researched:** 2026-04-11
**Overall confidence:** HIGH (verified via official docs, multiple current sources)

---

## 1. IndexedDB vs localStorage

### Verdict: Use IndexedDB

For this app, localStorage is the wrong tool. Here is why:

**localStorage limits:**
- 5 MB hard cap per origin (Chrome, Safari); Firefox allows 10 MB
- Stores strings only — deck objects must be JSON-serialized/deserialized manually
- Synchronous API — blocks the main thread on read/write
- Exceeding quota throws `QuotaExceededError` with no graceful degradation

**IndexedDB limits:**
- Up to 80% of available disk space (Chromium); effectively gigabytes in practice
- Stores structured JavaScript objects natively (no JSON.stringify needed)
- Asynchronous, non-blocking API
- Supports indexes for efficient queries (find decks by commander, find cards by name)
- Supported in all modern browsers

**For this app specifically:**
A user with 20 decks of 100 cards each is storing ~2,000 card reference objects plus deck metadata. Each Scryfall card object with name, oracle text, image URIs, color identity, and legality fields is roughly 2-5 KB. Storing 2,000 of those hits 4-10 MB — right at or above localStorage's limit. IndexedDB is the only viable choice.

**localStorage is appropriate for:**
- UI preferences (current view mode: grid vs. list)
- Last selected deck ID
- App settings (theme, etc.)
These are small (<1 KB total) and benefit from localStorage's synchronous simplicity.

**Sources:**
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [RxDB: LocalStorage vs IndexedDB vs Cookies vs OPFS vs WASM-SQLite](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)
- [RxDB: IndexedDB Max Storage Limit](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

---

## 2. Data Model Design

### Recommended Schema

Use two object stores (tables):

**`decks` store** — one record per deck

```typescript
interface Deck {
  id: string;               // uuid, primary key
  name: string;             // "My Atraxa Build"
  commanderId: string;      // Scryfall card ID
  commanderName: string;    // denormalized for display without extra lookup
  colorIdentity: string[];  // ['W','U','B','G'] — cached from commander
  createdAt: number;        // Date.now() timestamp
  updatedAt: number;        // Date.now() timestamp
}
```

**`deckCards` store** — one record per card-in-deck slot

```typescript
interface DeckCard {
  id: string;               // uuid, primary key
  deckId: string;           // foreign key → decks.id (indexed)
  scryfallId: string;       // Scryfall card ID (indexed)
  cardName: string;         // denormalized for display and text export
  quantity: number;         // always 1 for Commander except basic lands
  isCommander: boolean;     // true for the commander slot
  addedAt: number;          // Date.now()
}
```

### Why Not Store Full Card Objects

Do NOT store complete Scryfall card data (oracle text, image URIs, all printings, legality map) in IndexedDB. Reasons:
1. Scryfall card JSON is 2-5 KB each. 100 cards = up to 500 KB per deck. With 10+ decks, this is 5+ MB just for card details.
2. Card data changes (errata, new printings, bans). Stale oracle text / legality in IndexedDB would cause silent bugs.
3. Scryfall has an aggressive CDN cache — fetching card details is fast when the app needs them.

**The right pattern:** Store only `scryfallId` and `cardName` as references. Fetch full card data from Scryfall on demand (with caching in memory during the session). If offline support is needed in a later phase, add a dedicated `cardCache` object store with a TTL field.

### Indexes to Define

On `deckCards`:
- Index on `deckId` — to load all cards for a deck with a single range query
- Index on `scryfallId` — to check "is this card already in a deck?" across decks

On `decks`:
- Index on `updatedAt` — to sort decks by recently modified

### Querying Example (Dexie.js syntax)

```typescript
// Load all cards for a deck
const cards = await db.deckCards.where('deckId').equals(deckId).toArray();

// Count cards in a deck (for 100-card validation)
const count = await db.deckCards.where('deckId').equals(deckId).count();
```

---

## 3. Libraries: Use Dexie.js

### Recommendation: Dexie.js v4

**Dexie.js is the right choice for this project.** Here is why, compared to the alternatives:

| Library | Bundle Size | Weekly Downloads | API Style | Schema Versioning | React Integration |
|---------|------------|-----------------|-----------|-------------------|-------------------|
| **Dexie.js v4** | ~65 KB | ~3M | ORM-like, table-based | Built-in, first-class | `useLiveQuery` hook |
| idb | ~3 KB | ~3M | Thin promisified wrapper | Manual | None built-in |
| localForage | ~8 KB | ~5M | Simple key-value (get/set) | None | None |

**Why Dexie over idb:**
idb is excellent for library authors or when raw IndexedDB control is needed. For an app that needs queries (find all cards for deck X), sorted results, and React reactivity, Dexie eliminates hundreds of lines of boilerplate. The 65 KB bundle cost is worth it.

**Why Dexie over localForage:**
localForage only does key-value storage. It cannot efficiently query "all cards where deckId = X" without loading all cards and filtering in JavaScript. That does not scale past a few decks.

**Dexie's killer feature for this app:** `useLiveQuery`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

function DeckView({ deckId }: { deckId: string }) {
  const cards = useLiveQuery(
    () => db.deckCards.where('deckId').equals(deckId).toArray(),
    [deckId]
  );
  // cards auto-updates whenever anything changes in deckCards for this deckId
}
```

This eliminates the need for manual state management for deck card lists. Any add/remove triggers a re-render automatically.

**Installation:**

```bash
npm install dexie dexie-react-hooks
```

**Sources:**
- [Dexie.js official site](https://dexie.org/)
- [pkgpulse: Dexie.js vs localForage vs idb 2026](https://www.pkgpulse.com/blog/dexie-vs-localforage-vs-idb-indexeddb-browser-storage-2026)
- [npm-compare: dexie vs idb vs localforage](https://npm-compare.com/dexie,idb,localforage)
- [LogRocket: Dexie.js in React apps](https://blog.logrocket.com/dexie-js-indexeddb-react-apps-offline-data-storage/)

---

## 4. Import/Export — Deck List Text Format

### Standard Format

The universally accepted MTG deck list text format is:

```
1 Atraxa, Praetors' Voice
1 Demonic Tutor
1 Path to Exile
4 Forest
```

One line per card. Quantity followed by a space, then the full card name. This is what Moxfield, Archidekt, MTGGoldfish, and MTGO all export and import.

### Custom Parser (Recommended over npm library)

The `mtg-decklist-parser` npm package exists but its last commit was August 2021 and it shows minimal maintenance. For a format this simple, a custom parser is 20 lines and has zero dependencies:

```typescript
interface ParsedDeckLine {
  quantity: number;
  name: string;
}

function parseDeckList(rawText: string): ParsedDeckLine[] {
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//'))
    .flatMap(line => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) return [];
      return [{ quantity: parseInt(match[1], 10), name: match[2].trim() }];
    });
}
```

### Export

```typescript
function exportDeckList(deckName: string, cards: DeckCard[]): string {
  const lines = cards.map(c => `${c.quantity} ${c.cardName}`);
  return lines.join('\n');
}
```

### Import Flow

Importing requires resolving card names to Scryfall IDs, which means API calls:

1. Parse text → array of `{ quantity, name }` objects
2. For each name, call Scryfall's `/cards/named?exact={name}` endpoint
3. Respect Scryfall's rate limit (50-100ms between requests — use a queue)
4. On success: add to `deckCards` store
5. On failure (card not found): collect errors and show to user after bulk import

Handle cards not found gracefully — typos and set-specific names are common in user-pasted deck lists.

---

## 5. Migration / Versioning

### Use Dexie's Built-in Versioning

Dexie handles schema versioning natively through its `version()` API. This is one of its strongest features compared to raw IndexedDB.

**Core principle:** Never modify an existing version definition. Only add new version blocks. Dexie runs upgrade functions when the user's stored database version is lower than the current app version.

```typescript
const db = new Dexie('EDHBuilder');

// Version 1 — initial schema (shipped in Phase 1)
db.version(1).stores({
  decks: '++id, updatedAt',
  deckCards: '++id, deckId, scryfallId',
});

// Version 2 — example: add tags to decks (shipped in Phase N)
db.version(2).stores({
  decks: '++id, updatedAt, *tags',  // *tags = multi-entry index
  deckCards: '++id, deckId, scryfallId',
}).upgrade(tx => {
  // Migrate existing records
  return tx.table('decks').toCollection().modify(deck => {
    deck.tags = [];
  });
});
```

### Rules for Safe Migrations

1. **Always increment version numbers** — never decrement or skip
2. **Repeat unchanged stores** — if `deckCards` schema did not change in v2, still include it
3. **Use `upgrade()` for data transforms** — setting default values for new fields
4. **Do not delete old versions from code** — Dexie needs the full version history to upgrade from any starting version
5. **Test upgrades from v1** by clearing IndexedDB in DevTools and reloading

### What to Version From the Start

Define version 1 carefully because adding indexes later requires a version bump. Indexes to define upfront:
- `deckCards` by `deckId` (essential for loading a deck's cards)
- `deckCards` by `scryfallId` (for duplicate detection)
- `decks` by `updatedAt` (for sort order)

**Source:** [Dexie.version() documentation](https://dexie.org/docs/Dexie/Dexie.version())

---

## 6. Performance

### Is Performance a Concern for This App?

**No, not meaningfully.** The data scale is small:
- 20 decks × 100 cards = 2,000 `deckCard` records
- Each record is a tiny object (~5 fields, all strings/booleans)
- Total IndexedDB payload: well under 1 MB

At this scale, IndexedDB reads and writes are fast enough that no optimization is needed. Loading all cards for a 100-card deck is a single indexed range query returning 100 small objects — this takes 1-5ms in practice.

### Where Performance Could Matter

**1. Bulk import**
Importing a full 100-card deck means 100 `deckCards.add()` calls. Do this in a single transaction, not 100 individual transactions. Dexie's `bulkAdd()` handles this:

```typescript
await db.deckCards.bulkAdd(newCards); // single transaction, fast
```

Doing 100 individual `add()` calls would be ~10x slower due to transaction overhead.

**2. Scryfall API calls during import**
The bottleneck during import is the 100 Scryfall API calls, not IndexedDB writes. Rate-limit these to 50-100ms intervals (Scryfall's documented request policy). A 100-card import will take ~10-15 seconds at that rate — this is expected and acceptable.

**3. `useLiveQuery` re-render scope**
Scope `useLiveQuery` queries tightly. A query watching all `deckCards` (all decks) will re-render on any card change in any deck. A query scoped to `deckCards.where('deckId').equals(activeDeckId)` only re-renders for the active deck. Always scope to the active deck.

### Storage Quota Request

Call `navigator.storage.persist()` on first launch to request persistent storage mode. Without this, the browser may evict IndexedDB data if the device is low on storage. With it, data is protected until the user explicitly clears it.

```typescript
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`Persistent storage: ${granted ? 'granted' : 'not granted'}`);
  }
}
```

**Sources:**
- [Speeding up IndexedDB reads and writes (Nolan Lawson)](https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/)
- [RxDB: Solving IndexedDB Slowness](https://rxdb.info/slow-indexeddb.html)
- [LogRocket: Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary storage | IndexedDB | localStorage's 5 MB limit is too tight; card data grows quickly |
| Settings storage | localStorage | Tiny payloads, synchronous access is fine |
| IndexedDB library | Dexie.js v4 | React `useLiveQuery` hook, built-in versioning, ORM-like queries |
| Card data storage | References only (scryfallId + name) | Full card objects would bloat storage and go stale |
| Schema design | Two stores: `decks` + `deckCards` | Clean separation, efficient indexed queries |
| Import parsing | Custom regex parser | mtg-decklist-parser is unmaintained; format is trivially simple |
| Bulk writes | Dexie `bulkAdd()` | Single transaction avoids per-record overhead |
| Storage protection | `navigator.storage.persist()` | Prevents browser eviction of user data |

---

## Open Questions / Gaps

- **Offline card cache**: If users want to view existing decks offline (not just edit), a `cardCache` store with TTL is needed. Defer to a later phase; Scryfall is the source of truth for card details.
- **Cross-device sync**: Explicitly out of scope for v1, but users will eventually want it. The `scryfallId`-based data model is sync-friendly if a backend is ever added.
- **Safari quirks**: Safari has historically had IndexedDB quirks (especially in private browsing mode, where IndexedDB throws on access). Worth testing; a graceful fallback error message is sufficient for v1.
