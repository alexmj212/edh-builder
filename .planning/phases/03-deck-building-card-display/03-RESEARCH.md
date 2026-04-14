# Phase 3: Deck Building & Card Display - Research

**Researched:** 2026-04-13
**Domain:** Deck-state management, Dexie v4 migration, lazy-loaded card rendering, Scryfall prints lookup
**Confidence:** HIGH

## Summary

Phase 3 has an unusually rich upstream context. `03-CONTEXT.md` locks virtually every layout, UX, and persistence decision (60/40 split, view toggle via `Deck.viewMode`, additive Dexie v4 migration, non-blocking `originalReleaseDate` fetch via `oracle_id` + `unique:'prints'`, singleton enforcement against the 12 basic-land types, `(×)` always-keyboard-accessible remove, scroll-top reset on view switch). `03-UI-SPEC.md` locks class names, spacing, colors, and copywriting down to the SVG viewBox on the `(×)` icon. This leaves the planner with:

1. File decomposition inside the deck column (`DeckColumn` vs. `DeckListView` + `DeckGridView`).
2. Whether the add/remove slice lives inside `deck-store` or a new `deckCards-store`.
3. Test scaffolding and E2E locator conventions (follow existing `e2e/specs/*.spec.ts` + `stubScryfall` fixture).

This research confirms the decisions are technically sound, surfaces three implementation landmines that would silently break Phase 3 if missed (Date-reviver on `released_at`, StrictMode double-add, `prints_search_uri` vs. `q=oracle_id:`), and enumerates the exact test types, files, and integration points the planner must schedule.

**Primary recommendation:** Add a `DeckColumn` component that composes a new `deck-cards-store` Zustand slice. Introduce a Dexie `version(4)` additive migration that adds `Deck.viewMode` and types `DeckCard.originalReleaseDate` (indexing not required). Persist `originalReleaseDate` as an ISO `string | null` — do NOT persist the `Date` object the library returns. Gate all add/remove/view-mode side effects behind StrictMode-safe refs. Ship Playwright spec `e2e/specs/13-deck-building.spec.ts` covering the eight success criteria in the ROADMAP.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout & Selection Column**
- Split ratio **60/40** at `lg` (≥1024px): search results on the left (5-col grid fits), selected deck on the right.
- Below `lg`: **stack vertically** — search on top, deck below. No tabbed switcher, no drawer.
- Default sort in the deck column: **by type category** — mirrors the categorized list view.
- Deck column is an **independent scroll pane** (sticky on desktop). Search pagination does not push the deck off-screen.

**Add/Remove UX**
- **Add** reuses the existing disabled `(+)` button on `CardResultCell` (src/components/CardResultCell.tsx:33-48). Phase 3 enables it, wires the click handler, drops "coming in Phase 3" copy.
- **Duplicate non-basic feedback**: button becomes disabled with tooltip / aria-label "Already in deck." Inline, non-blocking. No toast, no modal.
- **Remove**: explicit `(×)` button on each deck row (both list and grid views). Keyboard-accessible, not hover-reveal.
- **Undo**: deferred to v2. `deckChanges` log already captures events.

**Grid vs List View**
- View toggle lives at the top of the deck column. Persisted **per-deck** via a new `Deck.viewMode: 'grid' | 'list'` field.
- **Dexie v4 additive migration** (version(4).stores({...}) with same key signatures + no upgrade callback) — consistent with v2 and v3 pattern.
- Default view: **list** (categorized).
- List grouping buckets: **Creatures, Planeswalkers, Instants, Sorceries, Artifacts, Enchantments, Lands** (7 categories, fixed order). Land type always wins regardless of other type words. Each bucket shows its own count in the header.
- Grid image size: `small` (146×204). Lazy-load with a skeleton placeholder at the same aspect ratio. UI-02 satisfied via `<img loading="lazy">` + a sized placeholder div to avoid layout shift.

**originalReleaseDate Fetching**
- On add, call `search({ q: 'oracle_id:<id>', unique: 'prints', order: 'released', dir: 'asc' })` via the Phase 02.3 `scryfall-api` wrapper (`src/lib/scryfall.ts`). Take the first result's `released_at`.
- Persist on the `DeckCard` row as `originalReleaseDate: string | null`. Travels with the deck card, survives `cards` cache eviction.
- **Non-blocking on failure**: if the prints lookup throws or returns no results, still persist the deckCard with `originalReleaseDate: null`, and emit a `console.warn`. Add must not fail because of a Scryfall hiccup.
- **Dedupe across the app**: before firing the prints query, check if ANY existing `deckCard` (across all decks) already has a non-null `originalReleaseDate` for the same `scryfallId` / `oracle_id`. If so, reuse it. First-add-ever pays the API cost; subsequent adds are free.

### Claude's Discretion
- Concrete Tailwind classes, spacing, and hover/focus states — follow patterns already established by `CardSearchSection` and `CardResultCell`.
- Component/file decomposition inside the deck column (single `DeckColumn` vs `DeckListView` + `DeckGridView` children) — planner's call.
- Exact Playwright locators and test scaffolding — follow the `e2e/specs/` conventions established in Phase 02.2.

### Deferred Ideas (OUT OF SCOPE)
- Undo/redo affordance for add/remove (deckChanges log already captures the events — deferred to a future phase).
- Drag-and-drop between search and deck columns — nice-to-have, not required.
- Bulk operations (add 4-of basic lands in one click) — ergonomic win but out of v1 scope.
- Per-category collapse/expand in list view — possible polish for Phase 5.
- `originalReleaseDate` backfill for decks built before Phase 3 — not needed yet; no prior decks have cards.
- Live format-validation sidebar (Phase 4), import/export (Phase 5), hover tooltips (999.1), card detail modal (999.2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | User can add a card from search results to the active deck | `CardResultCell.tsx:33-48` disabled `(+)` enabled; Zustand `addCard(card)` action writes `deckCards` row + `deckChanges` row atomically inside `db.transaction('rw', ...)` |
| BUILD-02 | User can remove a card from the deck | `(×)` button per row (list) and per thumbnail (grid); `removeCard(deckCardId)` action deletes row + writes `deckChanges{type:'remove'}` atomically |
| BUILD-03 | Deck prevents adding duplicate non-basic-land cards (singleton enforcement) | Pre-insert check: `db.deckCards.where({deckId}).and(c => c.scryfallId === id).count()` OR in-memory list check; if >0 AND card is non-basic → block + disabled `(+)` state |
| BUILD-04 | Deck allows multiple copies of basic lands (12 basic land types recognized) | Basic-land detector function tested against the 12 type-line strings: Plains, Island, Swamp, Mountain, Forest, Wastes + `Snow-Covered Plains/Island/Swamp/Mountain/Forest/Wastes`. Land-type wins regardless of other words in `type_line` |
| BUILD-05 | User can view deck as a visual card image grid | `DeckGridView` renders `grid grid-cols-3 gap-2`; skeleton `bg-surface animate-pulse` behind `<img loading="lazy">` at `aspect-[146/204]`; uses `getImageUri(card, 'small')` from `src/lib/scryfall.ts:125` |
| BUILD-06 | User can view deck as a categorized text list (grouped by type) | `DeckListView` derives buckets from `type_line` via a pure `categorizeCard(type_line): Category` function; 7 fixed-order sections (Creatures, Planeswalkers, Instants, Sorceries, Artifacts, Enchantments, Lands); empty buckets omitted |
| BUILD-07 | User can toggle between grid and list views | `<ViewToggle>` segmented control (two buttons w/ `aria-pressed`); click calls `setViewMode(deckId, mode)` which writes Dexie `decks.update(deckId, {viewMode})` then `set()`; scroll position reset to 0 on toggle (per UI-SPEC §Scroll restoration) |
| BUILD-08 | Card references store `originalReleaseDate` | On add: `searchCards('oracle_id:<id>', {unique:'prints', order:'released', dir:'asc'})` → `results[0].released_at` → **convert to ISO string** `toISOString().split('T')[0]` → persist as `string`. Non-blocking — null on failure. Dedupe across decks before firing query |
| DECK-09 | Every card add/remove writes a changelog entry to `deckChanges` | `deckChanges` table already exists (Phase 1). Add transaction: `db.transaction('rw', [deckCards, deckChanges, decks], async () => { deckCards.add(...); deckChanges.add({type:'add',deckId,cardName,scryfallId,timestamp}); decks.update(deckId,{updatedAt}) })`. Symmetric for remove |
| UI-02 | Card images lazy-load with placeholder skeletons | `<img loading="lazy" decoding="async">` on all card images. Grid cells wrap in `aspect-[146/204]` + sibling `bg-surface animate-pulse` skeleton div removed/faded on `img.onLoad`. List rows use 32×32 thumbnail with same pattern. No layout shift because aspect-ratio container reserves space |
| UI-04 | Commander displayed prominently at top of deck view with art_crop image | Reuse existing `CommanderPanel` (src/components/CommanderPanel.tsx) as first child of `DeckColumn`. `CommanderPanel` already shows primary + partner slots with `normal` image. **Note**: UI-SPEC §Commander strip says reuse as-is; ROADMAP says `art_crop`. Planner must reconcile — recommended: reuse `CommanderPanel` unchanged (meets "prominent" requirement), defer art_crop variant to polish if deemed necessary |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No project-level `./CLAUDE.md` exists in the repo root. User's global instructions apply (from `~/.claude/CLAUDE.md`):

- Delegate a reasonable amount of prompts to available agents.
- Commit early and often; allow review before merging.
- Use Context7 MCP first when looking for library documentation.
- User acknowledges "I'm not always right."

Auto-memory (project-specific feedback) that constrains this plan:

- **Comprehensive tests per phase** — write thorough tests before code review; review code AND tests together for coverage + quality.
- **Commit files as you go** — working tree should rarely have unstaged changes; commit incrementally per unit of work.
- **Verify external API queries against the live API** — stubbed-response tests pass while the real API silently drops invalid query keywords. The `oracle_id:<uuid>` prints query MUST be verified once against live Scryfall before relying on stubbed tests.
- **Every phase ships with integration/E2E tests** — Playwright specs must cover user-facing flows before a phase is marked complete. Phase 02.2-05 established this as a standing rule.
- **StrictMode-safe components need StrictMode-wrapped tests** — wrap unit tests in `<StrictMode>`, assert exact call counts, pair with e2e that checks BOTH request count AND UI-rendered content. Directly applicable to the `originalReleaseDate` fetch on-add (must fire exactly once per add).
- **Scope library replacements by what they actually replace** — N/A this phase.
- **npm tooling pinned to Node 25 / npm 11.12+** — use existing lockfile; no new package installs anticipated for this phase.
- **Flag clear-context moments between workflow steps** — volunteer `/clear` suggestions at GSD boundaries.
- **Self-answer UAT ambiguity** — during `/gsd-verify-work`, inspect code yourself instead of bouncing derivable questions.

## Standard Stack

### Core (already installed, no new deps anticipated)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Project baseline [VERIFIED: package.json:23] |
| Dexie | ^4.0.0 | IndexedDB wrapper | Phase 1 decision; additive migration pattern established [VERIFIED: package.json:21] |
| Zustand | ^5.0.0 | Store slice | Established per-domain pattern [VERIFIED: package.json:29] |
| scryfall-api | ^4.0.5 | Scryfall client | Phase 02.3 adopted; `src/lib/scryfall.ts` is the sole boundary [VERIFIED: package.json:26, node_modules/scryfall-api/package.json] |
| Tailwind CSS | ^4.0.0 | Styling | Project baseline, OKLCH tokens in `src/index.css` [VERIFIED: package.json:27] |
| Zod | ^3.22.0 | Validation boundary | Already in scryfall wrapper; no new validation needed this phase [VERIFIED: package.json:28] |

### Supporting (testing)

| Library | Version | Purpose |
|---------|---------|---------|
| Vitest | ^4.1.4 | Unit tests [VERIFIED: package.json:50] |
| @testing-library/react | ^16.0.0 | Component tests [VERIFIED: package.json:36] |
| @playwright/test | ^1.59.1 | E2E tests [VERIFIED: package.json:34] |
| fake-indexeddb | ^6.2.5 | Dexie test harness [VERIFIED: package.json:43] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Decision |
|------------|-----------|----------|----------|
| Dexie additive migration | `version(4).upgrade(tx => ...)` to pre-fill `viewMode: 'list'` on existing decks | Explicit default vs. implicit `undefined` | Context7 pattern + project Phase 02.1/02.3 pattern = additive-only. `viewMode ?? 'list'` read in UI covers undefined. [CITED: CONTEXT.md Decisions] |
| Zustand extension of `deck-store` | New `deck-cards-store` | Single store = fewer files; split store = smaller rerender blast radius | Planner's discretion (per CONTEXT §Claude's Discretion). Recommend split: deckCards is a per-deck list that flips often during building; `deck-store` is currently a decks-metadata CRUD — mixing concerns would pull all decks into every card add. |
| Full-image re-fetch per add | Reuse cached `Card` from `card-cache` store | Save one round-trip for already-searched cards | Already free — `cacheCards(result.data)` fires on every search result (src/store/card-search-store.ts:61). The `Card` object is in memory via `results` and cached in Dexie. Pass the full `Card` into `addCard(card)` directly. |

**Installation:** No new packages required.

**Version verification:**
```bash
npm view scryfall-api version  # confirmed 4.0.5 [VERIFIED]
npm view dexie version          # confirmed ^4.0.0 family [VERIFIED: package.json]
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── DeckColumn.tsx            # NEW — wraps CommanderPanel + ViewToggle + list/grid
│   ├── DeckColumn.test.tsx       # NEW
│   ├── DeckListView.tsx          # NEW — categorized list (7 buckets)
│   ├── DeckListView.test.tsx     # NEW
│   ├── DeckGridView.tsx          # NEW — 3-col grid w/ skeleton
│   ├── DeckGridView.test.tsx     # NEW
│   ├── ViewToggle.tsx            # NEW — segmented control
│   ├── ViewToggle.test.tsx       # NEW
│   ├── CardResultCell.tsx        # EDIT — enable (+) button, wire onClick
│   ├── CardResultCell.test.tsx   # EDIT — new add/disabled/loading states
│   └── DeckWorkspace.tsx         # EDIT — replace placeholder <section>
├── lib/
│   ├── db.ts                     # EDIT — add version(4).stores
│   ├── basic-lands.ts            # NEW — isBasicLand + 12-type whitelist
│   ├── basic-lands.test.ts       # NEW
│   ├── card-categorizer.ts       # NEW — categorizeCard(type_line): Category
│   └── card-categorizer.test.ts  # NEW
├── store/
│   ├── deck-cards-store.ts       # NEW — add/remove/load + viewMode
│   └── deck-cards-store.test.ts  # NEW
├── types/
│   └── deck.ts                   # EDIT — add viewMode, originalReleaseDate
└── test/
    └── setup.ts                  # (existing)

e2e/
├── helpers/
│   └── deckBuildingFlows.ts      # NEW — addCardToDeck, removeCardFromDeck, toggleView
└── specs/
    └── 13-deck-building.spec.ts  # NEW — end-to-end per ROADMAP success criteria
```

### Pattern 1: Additive Dexie Migration (Established in Phase 02.1, 02, 02.3)

**What:** Bump version; re-state the same stores; **no** `upgrade()` callback for additive scalar/nullable fields.
**When to use:** Adding a non-indexed property to an existing typed row (Deck, DeckCard).
**Why:** Phase 02.1 proved the pattern — v2 rows read back with the new field `undefined` and app code guards with `??` defaults.

```typescript
// src/lib/db.ts (EDIT)
this.version(4).stores({
  decks: '++id, updatedAt',
  deckCards: '++id, deckId, scryfallId',
  deckChanges: '++id, deckId, timestamp',
  cards: 'oracle_id, cachedAt',
});
// Note: .stores() strings list ONLY indexed fields. viewMode and
// originalReleaseDate are read off-index, so they do not appear here.
// Dexie stores them because Dexie serializes the whole object.
// [CITED: src/lib/db.ts current v3 block]
```

### Pattern 2: Zustand Store with Atomic Dexie Transaction

**What:** Async store action opens a Dexie `transaction('rw', ...)` to write multiple tables atomically, then `set()` the new Zustand state after commit.
**When:** Any operation that must leave two tables in a consistent state (add = deckCards + deckChanges; remove = delete deckCards + insert deckChanges).
**Source:** `deleteDeck` in `src/store/deck-store.ts:53-57` already uses this pattern.

```typescript
// Sketch for addCard action
addCard: async (deckId: number, card: Card) => {
  // 1. Singleton pre-check (fast, in-memory against `cards` state)
  const existing = get().cards.find(c => c.scryfallId === card.id);
  if (existing && !isBasicLand(card)) {
    return { ok: false, reason: 'already-in-deck' as const };
  }

  // 2. originalReleaseDate dedupe + fetch (non-blocking)
  const originalReleaseDate = await resolveOriginalReleaseDate(card);
  // ^ returns string | null; never throws

  // 3. Atomic write
  const now = Date.now();
  let newId: number;
  await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => {
    newId = await db.deckCards.add({
      deckId,
      scryfallId: card.id,
      cardName: card.name,
      quantity: 1,
      isCommander: false,
      addedAt: now,
      originalReleaseDate,
    }) as number;
    await db.deckChanges.add({
      deckId, type: 'add', cardName: card.name,
      scryfallId: card.id, timestamp: now,
    });
    await db.decks.update(deckId, { updatedAt: now });
  });

  // 4. Mutate Zustand state — append optimistically post-commit
  set(state => ({ cards: [...state.cards, /* row */] }));
  return { ok: true };
},
```

### Pattern 3: StrictMode-safe "Fire Once Per Intent" Guard

**What:** Module-level `AbortController` for abortable async work + a `useRef` that tracks the last key an effect fired against. On dev double-mount the second effect call sees the ref is already set and no-ops.
**When:** `CommanderSearch`, `CardSearchSection` already use this pattern. Any Phase 3 effect that fires a Scryfall prints lookup on-add must use it.
**Source:** `src/components/CardSearchSection.tsx:83-96` (`lastFiredSearchKeyRef`).

Note: Phase 3's `addCard` is a user-initiated *action*, not an effect — so the StrictMode concern is narrower: e2e spec `08-no-duplicate-commander-fetch.spec.ts` / `09-no-duplicate-search.spec.ts` / `12-no-duplicate-card-search.spec.ts` established a precedent to assert exact Scryfall hit counts. The prints-lookup on add should be asserted at ≤ 1 hit per click, and 0 hits when the dedupe cache matches.

### Pattern 4: Deferred Skeleton → Image with Aspect-Ratio Container

**What:** `<div class="aspect-[146/204] relative">` wraps both a `bg-surface animate-pulse` skeleton div (absolute inset-0) and the `<img loading="lazy">`. Container reserves space; skeleton occupies that space until the image's `onLoad` fires, which sets a `loaded` state that hides the skeleton. No layout shift.
**Source:** UI-SPEC §Grid view (deck column), full JSX in the spec.
**Why standard:** The CLS-safe pattern per web.dev — any `<img>` without explicit dimensions causes CLS without the aspect-ratio container. `loading="lazy"` is native browser support (>95% per caniuse, 2026) [CITED: MDN img loading attribute].

### Pattern 5: ViewToggle Segmented Control with `aria-pressed`

**What:** Two `<button>` elements inside a `div[role="group"]` — NOT radio inputs. Each button has `aria-pressed={viewMode === 'list'}`. Click handler writes Dexie + flips state.
**Source:** UI-SPEC §View toggle, full JSX in the spec.
**Accessibility:** Screen readers announce "pressed" state per WAI-ARIA authoring practices. [CITED: W3C WAI-ARIA APG Toggle Button Pattern]

### Anti-Patterns to Avoid

- **Do not** convert `released_at` from `scryfall-api` straight to a string via `String(card.released_at)` — it's a Date object, and the string form would be `"Mon Jan 01 2001 ..."` not ISO. Use `.toISOString().slice(0, 10)` for `YYYY-MM-DD`.
- **Do not** pass the full Scryfall `Card` object into `deckCards.add(...)`. Only `scryfallId`, `cardName`, `quantity`, `isCommander`, `addedAt`, `originalReleaseDate` (the fields typed in `src/types/deck.ts:17-25`). The full card stays in `cards` cache (oracle_id-keyed).
- **Do not** build a new Scryfall HTTP call — always route through `searchCards(...)` in `src/lib/scryfall.ts`. Phase 02.3 retired the hand-rolled client.
- **Do not** write an `upgrade()` callback for Dexie v4. Phase 02.1 explicitly proved additive-only works without one [VERIFIED: src/lib/db.ts v3 block].
- **Do not** wire the `(+)` button via a `useEffect` — it's a click handler. Effects only for state-driven side effects (like auto-firing search on filter change).
- **Do not** re-query `deckCards` from Dexie after every add — Zustand state is the source of truth during the deck-workspace session; Dexie is the persistence layer. Call `loadDeckCards(deckId)` once on workspace mount.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scryfall HTTP + rate limit | Custom `fetch('https://api.scryfall.com/...')` | `searchCards` / `fetchCardById` in `src/lib/scryfall.ts` | Phase 02.3 migration to `scryfall-api` owns throttling (100ms), retry, Date reviver, AbortSignal. [VERIFIED: src/lib/scryfall.ts] |
| Partner detection | Custom regex | `detectPartnerType` in `src/lib/partner-detection.ts` | Already handles all 4 variants + named partner extraction. |
| Card cache | New store / Map | `getCard(oracleId)` + `cacheCard(card)` in `src/lib/card-cache.ts` | 7-day TTL, oracle_id-keyed, already warmed by search. |
| Debounce | `setTimeout` in a component | `useDebouncedValue` in `src/hooks/useDebouncedValue.ts` | Phase 2 pattern; StrictMode-safe. |
| Image lazy-load / IntersectionObserver | Custom intersection logic | Native `<img loading="lazy" decoding="async">` | Browser native, avoids layout shift with aspect-ratio container, no JS overhead. [CITED: MDN loading attribute] |
| CLS prevention | Fixed-px dimensions | Tailwind `aspect-[W/H]` utility | Preserves responsive sizing + reserves space. [CITED: Tailwind docs aspect-ratio] |
| Commander display | New component | `<CommanderPanel deckId={n} />` | Already handles primary + partner + DFC flip + load state. [VERIFIED: src/components/CommanderPanel.tsx] |
| Toggle button styling | From scratch | Existing `focus:ring-2 focus:ring-accent` + `bg-accent/bg-surface` tokens | Matches `CardResultCell` and `CardSearchSection` patterns. [VERIFIED: src/index.css tokens, UI-SPEC §Color] |
| ISO date parse | `new Date(...)` on strings | Not needed — scryfall-api's reviver already returns `Date`; just format back via `.toISOString()` | See Pitfall 1 below. |

**Key insight:** This phase is >80% composition of existing primitives. Every major moving part (Scryfall client, card cache, commander panel, store-with-Dexie pattern, Playwright fixture, UI tokens) is already in place. The risk is integration and StrictMode correctness, not new library surface area.

## Runtime State Inventory

(Phase 3 is greenfield for deck-card rows — no rename/migration of existing data. Included because a Dexie schema bump is involved.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Dexie `deckCards` + `deckChanges` tables exist empty (Phase 1 schema). New v4 additive fields on `Deck.viewMode` and `DeckCard.originalReleaseDate`. No existing rows hold these fields. | Code edit only — additive migration; no data to migrate. |
| Live service config | None — purely client-side IndexedDB. No n8n / external service. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — Scryfall needs no key. | None. |
| Build artifacts | None — no egg-info or compiled bundle dependencies affected by the type additions. `tsc -b && vite build` will rebuild cleanly. | None. |

**Nothing in live-service or OS-state categories:** verified by listing `.env*`, inspecting `package.json` scripts, and confirming no backend is involved.

## Common Pitfalls

### Pitfall 1: `released_at` is a `Date` object, not a string

**What goes wrong:** Developer reads `results[0].released_at` and stores it directly; Dexie serializes the Date (via structured clone — works), but reading it back in `JSON.stringify` or in tests that compare to a string fails.
**Why it happens:** `scryfall-api`'s fetcher installs a JSON reviver that converts any `YYYY-MM-DD` string into `new Date(value)` [VERIFIED: node_modules/scryfall-api/dist/scryfall-api.js:88-94]. The type `CardPrint.released_at` is `Date` [VERIFIED: node_modules/scryfall-api/dist/scryfall-api.d.ts:313].
**How to avoid:** Always format to ISO-date string at the wrapper boundary:
```typescript
// src/store/deck-cards-store.ts (sketch)
const firstPrint = result.data[0];
const released = firstPrint?.released_at;  // Date | null | undefined
const originalReleaseDate = released ? released.toISOString().slice(0, 10) : null;
```
**Warning signs:** Tests that assert `typeof row.originalReleaseDate === 'string'` fail; JSON exports of the deck row show `"originalReleaseDate": "2001-01-01T00:00:00.000Z"` instead of `"2001-01-01"`.
[VERIFIED: node_modules/scryfall-api/dist/scryfall-api.js line 88-94]

### Pitfall 2: `oracle_id:<uuid>` query — stub passes, live drops

**What goes wrong:** Writing `searchCards('oracle_id:' + id, {unique:'prints', order:'released', dir:'asc'})` and trusting stubbed tests. Live Scryfall may require a different syntax (e.g., `++oracle_id:` with operator, or `oracleid:`). Verify_external_apis feedback flags this exact class of bug.
**Why it happens:** Scryfall's advanced search syntax is documented at scryfall.com/docs/syntax. The operator is `oracleid:<uuid>` in some docs, `oracle_id:` in older references. Ambiguity means stubs can't catch the error.
**How to avoid:**
1. One live probe before finalizing (manual `npx tsx -e '...'` or the existing Phase 02.3-01 spike pattern).
2. Use `prints_search_uri` (field on every Card, [VERIFIED: node_modules/scryfall-api/dist/scryfall-api.d.ts:75]) as a fallback — it's a pre-built URL: `https://api.scryfall.com/cards/search?order=released&q=oracleid:<id>+include:extras&unique=prints`. Parsing the `?q=` out of this URL reveals the correct operator.
3. Fallback contract: if the query returns `data.length === 0` OR throws, persist `null` and `console.warn`. Non-blocking is already the spec.
**Warning signs:** Dev test writes the card with `originalReleaseDate: '2024-10-15'` (today's date or a random recent date) instead of the earliest printing — check against Sol Ring, which should return `1993-12-31` (Limited Edition Alpha / Commander's Arsenal line). [CITED: scryfall.com/docs/syntax]
**Confidence:** MEDIUM — the `oracleid:` vs `oracle_id:` ambiguity must be verified with one live call. `prints_search_uri` is HIGH confidence as a fallback.

### Pitfall 3: StrictMode double-add on click

**What goes wrong:** React 19 StrictMode in development calls effects twice. A `useEffect` that reacts to a card-added state flag would fire the prints lookup twice per click, emit two `deckChanges` rows, and hit Scryfall twice.
**Why it happens:** Effects in dev mount → cleanup → mount. The lesson from Phase 2's DUP-4/DUP-5 fixes (CardSearchSection, CommanderSearch) is to guard effect bodies with a `lastFiredKeyRef`.
**How to avoid:** Phase 3's add is a **click handler**, not an effect. StrictMode doesn't double-fire click handlers. BUT: if any component derives "card-is-in-deck" via an effect that writes, wrap in the StrictMode-safe ref pattern from `CardSearchSection.tsx:83-96`.
**Warning signs:** E2E spec that counts Scryfall `/cards/search` hits sees 2 instead of 1 per add click. Unit test with `<StrictMode>` wrapper fires `addCard` twice for one click.
**Mitigation test:** New Playwright spec `13-deck-building.spec.ts` must assert exact Scryfall hit counts per add — extends the pattern from `e2e/specs/09-no-duplicate-search.spec.ts`, `12-no-duplicate-card-search.spec.ts`.

### Pitfall 4: Basic-land detection via `type_line.includes('Land')`

**What goes wrong:** `includes('Land')` matches "Landfall" triggered abilities in oracle text (if you search oracle instead of type), OR matches non-basic lands (Command Tower, Exotic Orchard). Phase 3 needs to allow ONLY the 12 basic types multiply.
**Why it happens:** Every land has type_line including "Land". Only basics should be exempt from the singleton rule.
**How to avoid:** Whitelist the 12 basic types. Use `type_line` only (not oracle_text):
```typescript
// src/lib/basic-lands.ts
const BASIC_LAND_TYPES = [
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes',
];

export function isBasicLand(card: { type_line: string; name: string }): boolean {
  // Scryfall type_line format: "Basic Land — Plains" or
  // "Basic Snow Land — Snow-Covered Plains" etc.
  // Most reliable: check the NAME against the whitelist (handles tokens, alternate art, etc).
  if (BASIC_LAND_TYPES.includes(card.name)) return true;
  // Secondary: type_line starts with "Basic Land" or "Basic Snow Land"
  return /^Basic\s+(Snow\s+)?Land\b/i.test(card.type_line);
}
```
**Warning signs:** A test adds a duplicate Command Tower and it succeeds (bug — should block). A test adds 4× Plains and the second is blocked (bug — should allow). Unit tests must cover both.
[CITED: scryfall.com/docs/syntax (basic-land "Basic Land" type category)]

### Pitfall 5: Card categorization precedence — Land wins

**What goes wrong:** A Creature-Land (Dryad Arbor, manlands) has `type_line: "Land Creature — Forest Dryad"`. Naive check hits "Creature" first, card lands in Creatures bucket, violating the CONTEXT decision "Land type always wins."
**Why it happens:** Most cards have a single type; hybrid cards (land-creatures, artifact-creatures, enchantment-creatures) need explicit precedence.
**How to avoid:** Check type_line in this exact order, first match wins:
```typescript
// src/lib/card-categorizer.ts
export function categorizeCard(typeLine: string): Category {
  const t = typeLine.toLowerCase();
  if (/\bland\b/.test(t))         return 'Lands';         // wins over creature-land
  if (/\bcreature\b/.test(t))     return 'Creatures';
  if (/\bplaneswalker\b/.test(t)) return 'Planeswalkers';
  if (/\binstant\b/.test(t))      return 'Instants';
  if (/\bsorcery\b/.test(t))      return 'Sorceries';
  if (/\bartifact\b/.test(t))     return 'Artifacts';     // wins over artifact-creature-none? No — creature wins. Hmm.
  if (/\benchantment\b/.test(t))  return 'Enchantments';
  return 'Creatures'; // fallback; shouldn't happen in EDH
}
```
**Decision point for planner:** Artifact-creatures (Wurmcoil Engine) — does "Artifact" or "Creature" win? CONTEXT only locks "Land wins." Precedent across deckbuilder tools: Creature beats Artifact/Enchantment. Codify this in the test file.
**Warning signs:** Unit tests for each of the 9+ edge cases: creature, land, basic land, creature-land, artifact-creature, enchantment-creature, planeswalker (non-creature), instant, sorcery, battle (future-proof).
[CITED: CONTEXT.md Decisions §List grouping buckets; precedent from scryfall.com card search examples]

### Pitfall 6: `getImageUri(card, 'small')` on DFC cards

**What goes wrong:** Double-faced cards (MDFC, transform) have `image_uris: null` at top level; images live on `card_faces[i].image_uris`. The `getImageUri` helper already handles this fallback [VERIFIED: src/lib/scryfall.ts:125-134], but if a planner writes `card.image_uris.small` directly, it throws for DFC commanders pulled into the deck.
**Why it happens:** Scryfall schema divergence; the wrapper already handles it but direct reads bypass the wrapper.
**How to avoid:** Always use `getImageUri(card, 'small')` — never reach into `card.image_uris` from components. Applies to the new grid cell and the 32×32 list thumbnail.

### Pitfall 7: `decks.updatedAt` not refreshed on card add — deck list stale

**What goes wrong:** Adding a card only touches `deckCards` + `deckChanges`. The deck list (sorted by `updatedAt`) doesn't move to top. User returns to `/` and sees the active deck in its old position.
**Why it happens:** `updatedAt` is the sort key [VERIFIED: src/lib/db.ts:14] and `deck-store.createDeck` sets it on create. Current `deck-store` has no "touch" helper for this.
**How to avoid:** Include `db.decks.update(deckId, { updatedAt: now })` inside the same transaction as the deckCards + deckChanges writes (shown in Pattern 2 above). The atomic write ensures consistency.
**Warning signs:** E2E: create deck A, create deck B, add card to A, return to `/`, assert A is first in list — fails without the updatedAt touch.

## Code Examples

### Add Card Action (verified against existing patterns)

```typescript
// src/store/deck-cards-store.ts (NEW)
// Source: Pattern lifted from src/store/deck-store.ts:52-57 (deleteDeck transaction)
//         + src/store/commander-store.ts:98-122 (setCommander cache+set pattern)
import { create } from 'zustand';
import type { Card } from '../lib/scryfall';
import { searchCards } from '../lib/scryfall';
import { db } from '../lib/db';
import { isBasicLand } from '../lib/basic-lands';

type AddResult = { ok: true } | { ok: false; reason: 'already-in-deck' | 'storage-error' };

export interface DeckCardsState {
  deckId: number | null;
  cards: DeckCard[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  error: string | null;
  loadForDeck: (deckId: number) => Promise<void>;
  addCard: (deckId: number, card: Card) => Promise<AddResult>;
  removeCard: (deckCardId: number) => Promise<void>;
  setViewMode: (deckId: number, mode: 'grid' | 'list') => Promise<void>;
}

async function resolveOriginalReleaseDate(card: Card): Promise<string | null> {
  // Dedupe across all decks — check if we've already resolved this oracle_id.
  const existing = await db.deckCards
    .filter(dc => dc.scryfallId === card.id)
    .first();
  if (existing?.originalReleaseDate) return existing.originalReleaseDate;

  try {
    const result = await searchCards(
      `oracleid:${card.oracle_id}`,   // [VERIFY LIVE: see Pitfall 2]
      { unique: 'prints', order: 'released', dir: 'asc' },
    );
    const firstPrint = result.data[0];
    const released = firstPrint?.released_at;
    // released is Date | null | undefined per scryfall-api typing
    if (released instanceof Date && !isNaN(released.getTime())) {
      return released.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    return null;
  } catch (err) {
    console.warn('[deck-cards-store] originalReleaseDate lookup failed', err);
    return null;
  }
}
```

### View Toggle Component

```tsx
// src/components/ViewToggle.tsx (NEW)
// Source: UI-SPEC §View toggle (segmented control)
interface ViewToggleProps {
  mode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div role="group" aria-label="Deck view"
      className="flex rounded-lg border border-border overflow-hidden text-sm">
      <button type="button"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={`px-2 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset transition-colors ${
          mode === 'list'
            ? 'bg-accent text-white'
            : 'bg-surface text-text-secondary hover:bg-surface-hover'
        }`}>
        List
      </button>
      <button type="button"
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
        className={`px-2 py-1 font-semibold border-l border-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset transition-colors ${
          mode === 'grid'
            ? 'bg-accent text-white'
            : 'bg-surface text-text-secondary hover:bg-surface-hover'
        }`}>
        Grid
      </button>
    </div>
  );
}
```

### Grid Cell with Skeleton (verified against UI-SPEC)

```tsx
// inside DeckGridView.tsx
import { useState } from 'react';
import { getImageUri } from '../lib/scryfall';

function GridCell({ card, onRemove }: { card: Card; onRemove: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative rounded overflow-hidden bg-surface aspect-[146/204]">
      {!loaded && (
        <div className="absolute inset-0 bg-surface animate-pulse" aria-hidden="true" />
      )}
      <img
        src={getImageUri(card, 'small')}
        alt={card.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover relative z-10"
      />
      <button type="button"
        aria-label={`Remove ${card.name} from deck`}
        onClick={onRemove}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 z-20
                   flex items-center justify-center text-text-secondary
                   hover:text-danger focus:text-danger
                   focus:outline-none focus:ring-2 focus:ring-accent">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
```

### Dexie v4 Migration (additive)

```typescript
// src/lib/db.ts (EDIT — append inside constructor, after v3 block)
this.version(4).stores({
  decks: '++id, updatedAt',
  deckCards: '++id, deckId, scryfallId',
  deckChanges: '++id, deckId, timestamp',
  cards: 'oracle_id, cachedAt',
});
// No upgrade callback — additive fields (Deck.viewMode, DeckCard.originalReleaseDate)
// read back as undefined on legacy rows; UI defaults via `?? 'list'` / `?? null`.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IntersectionObserver for lazy-load | Native `<img loading="lazy">` | 2021 (Chrome/FF/Safari all shipped) | No JS overhead; works with SSR. [CITED: MDN] |
| px-fixed image placeholders | `aspect-[w/h]` Tailwind utility | Tailwind v3+ | CLS-safe by default. |
| Hand-rolled Scryfall throttle | `scryfall-api` library-owned 100ms debounce | Phase 02.3 (this project, 2026-04-12) | See STATE.md Phase 02.3 entries. |
| CommonJS Dexie | ESM Dexie v4 | 2024 | Already on v4; no change. |

**Deprecated/outdated (for this project):**
- `@scryfall/api-types@1.0.0-alpha` — removed in Phase 02.3 [VERIFIED: STATE.md line 138].
- Hand-rolled `scryfall-client.ts` — deleted in Phase 02.3-05.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `oracleid:<uuid>` is the correct Scryfall search operator | Code Examples §resolveOriginalReleaseDate + Pitfall 2 | Silently wrong `originalReleaseDate` values for all cards. **Mitigation**: one live probe during Wave 0, OR use `prints_search_uri` off the Card object as fallback. | [ASSUMED — needs live verification per memory feedback_verify_external_apis] |
| A2 | Artifact-creature → Creatures bucket (not Artifacts) | Pitfall 5 | Categorizer bug on 5–10% of deckable cards. Planner should lock this in the category test file. | [ASSUMED — CONTEXT only locks "Land wins"] |
| A3 | Dexie structured-clone persists `string | null` cleanly for `originalReleaseDate` | Code Examples §Add Card | Storage error on add. Low risk — `string | null` is trivial to clone. | [VERIFIED: Dexie stores any structured-cloneable value, ISO string qualifies] |
| A4 | `released_at` on a `unique:prints` search result is the actual printing date (not oracle date) | Pitfall 1, Code Examples | If it were oracle date, every printing would return the same value (fine — still earliest). If it's the physical printing date and the API returns prints in release order via `order:released,dir:asc`, first result IS earliest. | [CITED: scryfall.com/docs/api/cards/search — order:released parameter] |
| A5 | `CommanderPanel` at top of deck column satisfies UI-04 without switching to `art_crop` | Phase Requirements §UI-04 | ROADMAP says "art_crop"; UI-SPEC reuses `CommanderPanel` which uses `normal`. Planner may choose to upgrade. Ruling visually: normal is more prominent than art_crop at typical sizes — likely satisfies intent. | [ASSUMED — reconciliation decision for planner] |

## Open Questions

1. **`oracleid:` vs `oracle_id:` — which is the live Scryfall operator?**
   - What we know: library passes the string through; `prints_search_uri` on every Card contains the canonical query Scryfall generates.
   - What's unclear: raw `oracle_id:<uuid>` syntax without verifying against the live API.
   - Recommendation: Wave 0 task — one live probe `curl 'https://api.scryfall.com/cards/search?q=oracleid:<sol-ring-oracle-id>&unique=prints&order=released&dir=asc'`; if 404/invalid, parse the `prints_search_uri` off the Card object instead.

2. **`deck-cards-store` vs. extending `deck-store`?**
   - What we know: CONTEXT marks component decomposition as Claude's discretion; store structure isn't explicit.
   - Recommendation: New `deck-cards-store.ts` — keeps `deck-store.ts` at 71 lines focused on deck CRUD, avoids pulling all decks into every card rerender.

3. **Categorizer precedence for Artifact-Creature / Enchantment-Creature?**
   - What we know: CONTEXT locks Land > all. Silent on the other hybrid precedences.
   - Recommendation: Plan encodes Creature > Artifact > Enchantment (the common EDH deckbuilder convention); test file has explicit cases.

4. **`CommanderPanel` reuse vs. dedicated art_crop strip?**
   - What we know: UI-SPEC §Commander strip says reuse; ROADMAP success criterion says art_crop.
   - Recommendation: Reuse CommanderPanel. Satisfies "prominent" even without art_crop. If checker flags, a 1-task follow-up can swap image size.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, Vitest, Playwright | ✓ | 25 (per project_npm_tooling memory) | — |
| npm | Install / CI | ✓ | 11.12+ | — |
| api.scryfall.com (live) | Wave 0 oracleid probe | ✓ (assumed; used in Phase 02.3 spike) | — | `prints_search_uri` off Card object parses the canonical query; no fallback needed for tests (stubbed) |
| Chromium (Playwright) | E2E specs | ✓ | 1.59+ | — |
| IndexedDB (fake-indexeddb) | Vitest tests | ✓ | 6.2.5 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

Project config does not set `workflow.nyquist_validation`; per researcher contract, the key's absence means the section is included.

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest ^4.1.4 [VERIFIED: package.json:50] |
| Component framework | @testing-library/react ^16.0.0 [VERIFIED: package.json:36] |
| E2E framework | @playwright/test ^1.59.1 [VERIFIED: package.json:34] |
| Unit config file | `vite.config.ts` test block (jsdom, globals, setupFiles: `./src/test/setup.ts`, exclude e2e/**) [VERIFIED: vite.config.ts:14-19] |
| E2E config file | `playwright.config.ts` [VERIFIED: ls] + `tsconfig.e2e.json` |
| Quick run command | `npm test` (vitest run, all unit + component) |
| E2E run command | `npm run e2e` (Playwright) |
| Typecheck | `npm run typecheck` (tsc -b) |
| Full suite command | `npm test && npm run typecheck && npm run e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | Add card from search → deckCards row + deckChanges row + state updated | unit + e2e | `npm test -- deck-cards-store.test.ts` + Playwright | ❌ Wave 0 |
| BUILD-01 | `(+)` click wired, UI shows added state | component | `npm test -- CardResultCell.test.tsx` | ⚠️ EDIT (exists for Phase 2 states, needs new cases) |
| BUILD-02 | Remove card → deckCards row deleted + deckChanges remove entry | unit + e2e | `npm test -- deck-cards-store.test.ts` | ❌ Wave 0 |
| BUILD-02 | `(×)` keyboard-accessible in list + always-visible in grid | component | `npm test -- DeckListView.test.tsx DeckGridView.test.tsx` | ❌ Wave 0 |
| BUILD-03 | Singleton prevents duplicate non-basic; `(+)` disabled with correct aria | unit + e2e | `npm test -- deck-cards-store.test.ts` + Playwright | ❌ Wave 0 |
| BUILD-04 | Multiple basic lands permitted; 12 types whitelisted | unit | `npm test -- basic-lands.test.ts` | ❌ Wave 0 |
| BUILD-05 | Grid view renders; skeleton → image transition; no CLS | component + e2e | `npm test -- DeckGridView.test.tsx` + Playwright (visual stability) | ❌ Wave 0 |
| BUILD-06 | List view categorizes by 7 types, fixed order, counts per bucket | unit (categorizer) + component (rendering) | `npm test -- card-categorizer.test.ts DeckListView.test.tsx` | ❌ Wave 0 |
| BUILD-07 | Toggle persists per-deck via Dexie; reload restores choice | component + e2e | `npm test -- ViewToggle.test.tsx DeckColumn.test.tsx` + Playwright | ❌ Wave 0 |
| BUILD-08 | originalReleaseDate captured from `unique:prints` + cross-deck dedupe | unit | `npm test -- deck-cards-store.test.ts` | ❌ Wave 0 |
| BUILD-08 | Live API syntax verified | manual live probe | `curl 'https://api.scryfall.com/cards/search?q=...'` Wave 0 | manual |
| DECK-09 | deckChanges writes on every add + remove (atomic with cards row) | unit | `npm test -- deck-cards-store.test.ts` | ❌ Wave 0 |
| UI-02 | Images lazy-load; skeleton placeholder; no CLS | component | `npm test -- DeckGridView.test.tsx DeckListView.test.tsx` | ❌ Wave 0 |
| UI-04 | Commander prominently at top of deck column | component + e2e | `npm test -- DeckColumn.test.tsx` + Playwright (screenshot + DOM order) | ❌ Wave 0 |
| CROSS | StrictMode-safety: add fires 1 prints lookup per click | unit w/ `<StrictMode>` + e2e hit-count | pattern from `e2e/specs/09-no-duplicate-search.spec.ts` | reference exists |
| CROSS | Dexie v4 additive migration preserves v3 rows | unit | `npm test -- db.test.ts` | ⚠️ EDIT (db.test.ts exists; needs v3→v4 case) |

### Sampling Rate

- **Per task commit:** `npm test -- <targeted file>` (usually < 5s per file).
- **Per wave merge:** `npm test` full vitest run + `npm run typecheck`.
- **Phase gate:** `npm test && npm run typecheck && npm run e2e` all green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/lib/basic-lands.ts` + `src/lib/basic-lands.test.ts` — covers BUILD-04.
- [ ] `src/lib/card-categorizer.ts` + `src/lib/card-categorizer.test.ts` — covers BUILD-06 (categorizer purity).
- [ ] `src/store/deck-cards-store.ts` + `src/store/deck-cards-store.test.ts` — covers BUILD-01, 02, 03, 07, 08, DECK-09.
- [ ] `src/components/ViewToggle.tsx` + test — BUILD-07 component coverage.
- [ ] `src/components/DeckColumn.tsx` + test — UI-04 composition + scroll reset on toggle.
- [ ] `src/components/DeckListView.tsx` + test — BUILD-06 + BUILD-02 remove-from-list.
- [ ] `src/components/DeckGridView.tsx` + test — BUILD-05 + UI-02 + BUILD-02 remove-from-grid.
- [ ] `e2e/helpers/deckBuildingFlows.ts` — shared helpers (addCardToDeck, removeCardFromDeck, toggleView).
- [ ] `e2e/specs/13-deck-building.spec.ts` — end-to-end covering ROADMAP's 8 success criteria (SRCH-07 spec is 07; partner/commander are 01-06; duplicate-fetch specs are 08/09/10/12; revisit is 11. Next free number is 13).
- [ ] `e2e/fixtures/searches/sol-ring-prints.json` (or similar) — stub for the `oracleid:` prints query.
- [ ] `e2e/fixtures/cards/sol-ring.json` — card with `released_at: "1993-12-31"` — basic land fixture also needed (Forest/Plains) for BUILD-04 E2E.
- [ ] `src/lib/db.test.ts` EDIT — add v3→v4 round-trip case.
- [ ] `src/components/CardResultCell.test.tsx` EDIT — add disabled-when-in-deck + click-fires-addCard cases.
- [ ] `src/types/deck.ts` EDIT — add `viewMode?`, `originalReleaseDate?` fields; type-export only (no test).
- [ ] Manual Wave 0 task: **live Scryfall probe** for the `oracleid:` vs `oracle_id:` operator syntax — mitigates Pitfall 2. Replace with `prints_search_uri` parsing if the raw operator doesn't work.

**If existing test infrastructure covers any:** Only `stubScryfall` + `consoleGate` + `commanderFlows` are in place; every file above is NEW or EDIT.

## Security Domain

`.planning/config.json` does not set `security_enforcement`. Per contract, include this section conservatively.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user accounts — local-only app. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | No multi-user. |
| V5 Input Validation | yes | User-entered search text already validated upstream; Phase 3 adds no new text input. `type_line` from Scryfall is validated via Zod envelope in `src/lib/scryfall.ts:17` (passthrough schema — server response trusted after shape check). |
| V6 Cryptography | no | No secrets, no PII. |

### Known Threat Patterns for {React + Dexie + Scryfall, browser-only}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via card name / oracle text | Tampering | React auto-escapes text content; we render `{card.name}` never `dangerouslySetInnerHTML`. Image URLs go into `<img src>` — no `javascript:` risk because Scryfall always returns `https://cards.scryfall.io/...`. |
| Stored tampering via Dexie | Tampering | IndexedDB is same-origin isolated; user cannot attack themselves. Zod validation on Scryfall responses blocks malformed API data entering the `cards` cache. |
| DoS via unbounded deckCards | DoS | Singleton enforcement (BUILD-03) caps non-basic cards at 1 each (≤ 99 rows per deck); basic lands capped by the 100-card game constraint (Phase 4 validation). No pagination needed on deck view. |
| Infinite Scryfall hits via click-spamming add | DoS on Scryfall / Resource Exhaustion | (a) Library-owned 100ms throttle in `scryfall-api` [VERIFIED: Phase 02.3 D-09]; (b) cross-deck dedupe short-circuits repeat oracle_ids; (c) UI disables `(+)` during the prints fetch (UI-SPEC §Loading state). |

No new secrets, no new auth, no new exposed endpoints. Risk profile unchanged from Phase 2.

## Sources

### Primary (HIGH confidence)

- `src/lib/scryfall.ts` — wrapper API surface [VERIFIED: read in session]
- `src/lib/db.ts` — Dexie schema through v3 [VERIFIED: read in session]
- `src/types/deck.ts` — current Deck/DeckCard/DeckChange types [VERIFIED: read in session]
- `src/types/card.ts` — CachedCard type [VERIFIED: read in session]
- `src/components/CardResultCell.tsx` — existing disabled `(+)` button [VERIFIED: read in session]
- `src/components/CardSearchSection.tsx` — StrictMode-safe effect pattern [VERIFIED: read in session]
- `src/components/CommanderPanel.tsx` — UI-04 reusable component [VERIFIED: read in session]
- `src/components/DeckWorkspace.tsx` — integration point at line 60-66 [VERIFIED: read in session]
- `src/store/deck-store.ts` — Dexie transaction pattern [VERIFIED: read in session]
- `src/store/commander-store.ts` — load-for-deck + setX + Dexie pattern [VERIFIED: read in session]
- `src/store/card-search-store.ts` — abortable search + cache side-effect pattern [VERIFIED: read in session]
- `src/lib/card-cache.ts` — read-through 7-day TTL [VERIFIED: read in session]
- `src/lib/partner-detection.ts` — type_line checks [VERIFIED: read in session]
- `node_modules/scryfall-api/dist/scryfall-api.d.ts` — library type surface including `released_at: Date`, `CardSearchUnique = 'art' | 'cards' | 'prints'`, `CardSearchOrder` [VERIFIED: line 313, 332, 333 read]
- `node_modules/scryfall-api/dist/scryfall-api.js` — library date reviver at line 88-94 [VERIFIED: read in session]
- `e2e/helpers/stubScryfall.ts`, `e2e/helpers/commanderFlows.ts`, `e2e/specs/07-card-search.spec.ts` — Playwright patterns [VERIFIED: read in session]
- `03-CONTEXT.md`, `03-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json`, `package.json`, `src/index.css`, `vite.config.ts` [VERIFIED: read in session]

### Secondary (MEDIUM confidence)

- Scryfall search syntax (`oracleid:`, `unique=prints`, `order=released`) [CITED: scryfall.com/docs/syntax — from training data; operator name requires live verification per Pitfall 2]
- W3C WAI-ARIA Authoring Practices — Toggle Button pattern [CITED: w3.org/WAI/ARIA/apg/patterns/button — from training data]
- MDN `loading="lazy"` native lazy-loading support [CITED: developer.mozilla.org — from training data, >95% browser support as of 2026]

### Tertiary (LOW confidence)

- None — this phase is >90% grounded in live repo files and library type sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — every library is already installed and battle-tested in this repo by Phases 1–02.3.
- Architecture: HIGH — follows established project patterns (Zustand per domain, Dexie additive migration, StrictMode-safe refs, wrapper-only Scryfall access).
- Pitfalls: HIGH for Pitfalls 1, 3–7 (verified against live repo); MEDIUM for Pitfall 2 (`oracleid:` syntax needs one live probe during Wave 0).
- Security: HIGH — no new attack surface.
- Tests: HIGH — Playwright + Vitest harness fully functional; specs 08-12 establish the "no duplicate fetch" pattern the planner will mirror.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain, slow-moving deps) — re-verify `oracleid:` operator or `prints_search_uri` fallback before sealing Wave 0.

## RESEARCH COMPLETE

**Phase:** 3 — Deck Building & Card Display
**Confidence:** HIGH

### Key Findings

- Phase is >80% composition of existing primitives — no new npm packages needed. Dexie v4 additive migration mirrors v2/v3 pattern.
- `scryfall-api` installs a JSON reviver that converts `released_at` to a `Date` object — must format to `YYYY-MM-DD` string at the boundary before persisting.
- `oracleid:<uuid>` vs `oracle_id:<uuid>` — Scryfall syntax ambiguity; one live probe in Wave 0 is mandatory (memory `feedback_verify_external_apis`). Fallback: parse `prints_search_uri` off the Card object.
- Categorizer precedence is locked only for Land-wins; Artifact-Creature and Enchantment-Creature need an explicit test-codified decision (recommend Creature > Artifact > Enchantment).
- Phase 2 established the StrictMode-safe ref pattern and the "hit-count assertion" E2E pattern — both directly applicable to add-card + prints-lookup.
- New Dexie schema fields (`viewMode`, `originalReleaseDate`) are additive with no upgrade callback; UI defaults cover legacy `undefined`.

### File Created

`/home/alex/Projects/edh-builder/.planning/phases/03-deck-building-card-display/03-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps verified in package.json; Phase 02.3 proved `scryfall-api` viability. |
| Architecture | HIGH | Patterns directly lifted from existing stores/components. |
| Pitfalls | HIGH (MEDIUM on Pitfall 2) | Date reviver and `prints_search_uri` verified via `node_modules` source. `oracleid:` operator needs one live probe. |
| Tests | HIGH | Harness complete; Wave 0 file list is exhaustive. |
| Security | HIGH | No new attack surface. |

### Open Questions

1. Live syntax of Scryfall's oracle-id prints query (`oracleid:` vs `oracle_id:`) — mitigated with `prints_search_uri` fallback.
2. File decomposition inside deck column — recommended split (`DeckColumn` + `DeckListView` + `DeckGridView` + `ViewToggle`) per CONTEXT discretion.
3. Categorizer precedence for Artifact-Creature / Enchantment-Creature — recommended Creature wins, explicit test cases.
4. `CommanderPanel` reuse vs. dedicated art_crop strip — recommended reuse.

### Ready for Planning

Research complete. Planner can now create PLAN.md files with:
- Wave 0 for schema + scaffolds + live Scryfall probe.
- Wave 1 for pure libraries (basic-lands, card-categorizer).
- Wave 2 for the Zustand store + Dexie integration.
- Wave 3 for the UI composition (ViewToggle, DeckListView, DeckGridView, DeckColumn).
- Wave 4 for E2E spec 13 + CardResultCell/DeckWorkspace integration.
