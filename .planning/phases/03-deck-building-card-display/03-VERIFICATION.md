---
phase: 03-deck-building-card-display
verified: 2026-04-14T22:30:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
---

# Phase 03: Deck Building & Card Display — Verification Report

**Phase Goal:** User can add/remove cards and view the deck in grid or list format.
**Verified:** 2026-04-14T22:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Adding a duplicate non-basic shows an error/prevention | VERIFIED | `addCard` checks `isBasicLand` before duplicate gate; `CardResultCell` disables button with `aria-label="Already in deck"`. E2E BUILD-03 spec confirms. |
| 2 | Adding multiple basic lands works | VERIFIED | `isBasicLand` bypass in `deck-cards-store.ts:90`. E2E BUILD-04 spec confirms two Forest rows. |
| 3 | Grid view shows card images with lazy loading (no layout shift) | VERIFIED | `DeckGridView` uses `loading="lazy" decoding="async"` on every `<img>`, `aspect-[146/204]` container prevents CLS. E2E BUILD-05/UI-02 spec confirms. |
| 4 | List view groups cards by type with card count per category | VERIFIED | `DeckListView` iterates `CATEGORY_ORDER`, calls `categorizeCard(card.type_line)`, renders `<section aria-label="{cat} ({n})">` with sticky header. E2E BUILD-06 spec confirms Artifacts and Lands sections. |
| 5 | Toggle between views persists (IDB round-trip) | VERIFIED | `setViewMode` writes `Deck.viewMode` to Dexie; `loadForDeck` reads it on mount. `ViewToggle` uses `aria-pressed`. E2E BUILD-07 spec survives `page.reload()`. |
| 6 | Commander art is prominent at deck top | VERIFIED | `DeckColumn:109` renders `<CommanderPanel deckId={deckId} variant="art_crop" />` unconditionally above card gate. `data-testid="commander-strip-image"` set when `variant === 'art_crop'`. E2E UI-04 spec confirms. |
| 7 | Every card add/remove creates a `deckChanges` record | VERIFIED | Both `addCard` and `removeCard` write to `db.deckChanges` inside the 3-table atomic transaction. E2E DECK-09 spec reads IndexedDB directly to confirm add+remove types. |
| 8 | Card references include `originalReleaseDate` | VERIFIED | `resolveOriginalReleaseDate` calls `oracleid:{oracle_id}` prints lookup, formats YYYY-MM-DD, cross-deck dedupes, falls back to null. E2E BUILD-08 spec reads IndexedDB and asserts `'1993-12-31'`. |
| 9 | Search results and selected cards simultaneously visible at >=1024px | VERIFIED | `DeckWorkspace` uses `flex-[3]` / `flex-[2]` 60/40 split at `lg` breakpoint. `DeckColumn` is `lg:sticky lg:top-6`. E2E layout test at 1400px viewport confirms side-by-side bounding boxes with Sol Ring within viewport height. |

**Score:** 9/9 ROADMAP success criteria verified.

---

### Plan Must-Haves (per PLAN frontmatter)

**Plan 03-02 truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | isBasicLand returns true for exactly the 12 canonical basic land names AND type_line regex, nothing else | VERIFIED | `src/lib/basic-lands.ts` — 12-element `BASIC_LAND_NAMES as const` + `/^Basic\s+(Snow\s+)?Land\b/i` regex. No `it.todo` remains in test file. |
| 2 | categorizeCard returns one of 7 categories with Land-wins, then Creature-wins precedence | VERIFIED | `src/lib/card-categorizer.ts:9-10` — `\bland\b` at line 9 precedes `\bcreature\b` at line 10, syntactically provable. |

**Plan 03-03 truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | addCard writes deckCards + deckChanges + decks.updatedAt atomically | VERIFIED | `deck-cards-store.ts:111` — `db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], ...)` |
| 2 | addCard blocks duplicate non-basics (returns already-in-deck) while permitting basic lands | VERIFIED | `deck-cards-store.ts:89-91` — `isBasicLand(card)` bypass in singleton check |
| 3 | addCard resolves originalReleaseDate via oracleid: operator | VERIFIED | `deck-cards-store.ts:47` — `oracleid:${card.oracle_id}` hard-coded from probe |
| 4 | addCard dedupes originalReleaseDate across ALL decks | VERIFIED | `deck-cards-store.ts:37-42` — `db.deckCards.filter(...).first()` cross-deck dedupe |
| 5 | removeCard deletes deckCards + writes deckChanges + touches decks.updatedAt atomically | VERIFIED | `deck-cards-store.ts:142` — same 3-table transaction pattern; WR-01 try/catch fix confirmed in source |
| 6 | setViewMode persists Deck.viewMode to Dexie and updates state | VERIFIED | `deck-cards-store.ts:162-163` — `db.decks.update(deckId, { viewMode: mode })` then `set({ viewMode: mode })` |
| 7 | addCard fires exactly one Scryfall prints lookup per click | VERIFIED | Store-level unit test asserts `searchCardsMock.mock.calls.length === 1`. E2E StrictMode spec counts intercepted requests and expects exactly 1. |

**Plan 03-04 truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ViewToggle renders a 2-button segmented control with aria-pressed per mode | VERIFIED | `ViewToggle.tsx` — `role="group" aria-label="Deck view"`, two buttons with `aria-pressed={mode === 'list'/'grid'}` |
| 2 | DeckListView renders one section per non-empty category in CATEGORY_ORDER with per-category counts and sticky headers | VERIFIED | `DeckListView.tsx:27-36` — CATEGORY_ORDER iteration, `if (rows.length === 0) return null`, `sticky top-0 z-10` header |
| 3 | DeckListView remove button focusable (opacity-0 group-hover:opacity-100 focus:opacity-100) | VERIFIED | `DeckListView.tsx:55` — exact class string present |
| 4 | DeckGridView renders grid-cols-3 with aspect-[146/204] skeletons that fade on img.onLoad | VERIFIED | `DeckGridView.tsx:43, 15, 13-24` — `grid-cols-3 gap-2`, `aspect-[146/204]`, `animate-pulse` skeleton, `onLoad={() => setLoaded(true)}` |
| 5 | All card images use loading="lazy" decoding="async" | VERIFIED | `DeckGridView.tsx:22-23` both attrs; `DeckListView.tsx:44` loading="lazy" |
| 6 | Grid view remove button is always visible | VERIFIED | `DeckGridView.tsx:27-38` — no `opacity-0`; button always rendered without hide class |

**Plan 03-05 truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DeckColumn composes CommanderPanel(art_crop) + ViewToggle + DeckListView/DeckGridView | VERIFIED | `DeckColumn.tsx:95, 109, 126-138` — all three composed |
| 2 | CommanderPanel accepts variant prop; art_crop renders art_crop image | VERIFIED | `CommanderPanel.tsx:49-63` — `variant === 'art_crop'` selects `artCropImageFor()`, `data-testid="commander-strip-image"` set |
| 3 | DeckWorkspace renders exactly ONE CommanderPanel (inside DeckColumn only) | VERIFIED | `DeckWorkspace.tsx` has no top-level `CommanderPanel`; only `DeckColumn` renders it. E2E UI-04 spec asserts `allStripImgs.toHaveCount(1)`. |
| 4 | DeckColumn's loadForDeck fires exactly once under StrictMode | VERIFIED | `DeckColumn.tsx:27-34` — `lastLoadedDeckIdRef` gate; DeckColumn.test.tsx wraps in `<StrictMode>` |
| 5 | DeckColumn resets scrollTop on view toggle | VERIFIED | `DeckColumn.tsx:78` — `scrollRef.current.scrollTop = 0` in `handleToggle` |
| 6 | DeckWorkspace mounts DeckColumn in 60/40 flex split | VERIFIED | `DeckWorkspace.tsx:51-57` — `flex-[3]` search, `flex-[2]` deck, `lg:sticky lg:top-6` |
| 7 | CardResultCell (+) wired to useDeckCardsStore.addCard(deckId, card) | VERIFIED | `CardSearchSection.tsx:53, 122-133` — subscribes `addCard`, calls in `handleAdd`; passes `onAdd` prop to `CardResultCell` |
| 8 | CardResultCell (+) disables with aria-label "Already in deck" for duplicate non-basics | VERIFIED | `CardResultCell.tsx:41-47` — `disabled = isAdding || (isInDeck && !isBasic)`, `ariaLabel = 'Already in deck'` |
| 9 | CardResultCell (+) shows loading spinner while addCard is in flight | VERIFIED | `CardResultCell.tsx:84-95` — `isAdding ? <Spinner /> : <PlusIcon />` |
| 10 | Playwright spec 13-deck-building.spec.ts covers all Phase 3 success criteria | VERIFIED | 12 tests: BUILD-01..08, DECK-09, UI-04, layout, StrictMode — confirmed in source |
| 11 | All Phase 3 unit + e2e tests are green | VERIFIED | 281 unit tests, 27 E2E tests passing per SUMMARY; all review-fix commits verified in git history |

---

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src/lib/basic-lands.ts` | VERIFIED | Exists, substantive (12-name whitelist + regex), imported by `deck-cards-store.ts` |
| `src/lib/card-categorizer.ts` | VERIFIED | Exists, substantive (7-branch with Land-wins), imported by `DeckListView.tsx` |
| `src/store/deck-cards-store.ts` | VERIFIED | Exists, full Zustand store, imported by `DeckColumn.tsx` and `CardSearchSection.tsx` |
| `src/components/ViewToggle.tsx` | VERIFIED | Exists, substantive, used in `DeckColumn.tsx:95` |
| `src/components/DeckListView.tsx` | VERIFIED | Exists, substantive, used in `DeckColumn.tsx:127` |
| `src/components/DeckGridView.tsx` | VERIFIED | Exists, substantive (WR-04 dead prop fixed), used in `DeckColumn.tsx:133` |
| `src/components/DeckColumn.tsx` | VERIFIED | Exists, full composition, used in `DeckWorkspace.tsx:56` |
| `src/components/CommanderPanel.tsx` | VERIFIED | Exists, variant prop implemented, used in `DeckColumn.tsx:109` |
| `src/components/CardResultCell.tsx` | VERIFIED | Exists, (+) button wired, used in `CardSearchSection.tsx` |
| `src/components/DeckWorkspace.tsx` | VERIFIED | Exists, 60/40 split, no top-level CommanderPanel |
| `e2e/specs/13-deck-building.spec.ts` | VERIFIED | Exists, 12 active tests (no `test.skip`), all Phase 3 criteria covered |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `deck-cards-store.ts` | `src/lib/db.ts` | `db.transaction('rw', ...)` | WIRED | Lines 111, 142 both use 3-table transaction |
| `deck-cards-store.ts` | `src/lib/scryfall.ts` | `searchCards(oracleid:...)` | WIRED | Line 46 calls `searchCards` |
| `deck-cards-store.ts` | `src/lib/basic-lands.ts` | `isBasicLand(card)` | WIRED | Line 90 |
| `DeckListView.tsx` | `src/lib/card-categorizer.ts` | `categorizeCard + CATEGORY_ORDER` | WIRED | Lines 4, 17, 21, 27 |
| `DeckGridView.tsx` | `src/lib/scryfall.ts` | `getImageUri(card, 'small')` | WIRED | Line 20 |
| `CardResultCell.tsx` | `deck-cards-store.ts` | `useDeckCardsStore.addCard` (via parent) | WIRED | `CardSearchSection.tsx:53, 122-133` bridges correctly |
| `DeckColumn.tsx` | `deck-cards-store.ts` | `useDeckCardsStore` subscription | WIRED | Lines 17-22 |
| `DeckWorkspace.tsx` | `DeckColumn.tsx` | Rendered at lg breakpoint | WIRED | Line 56 |
| `DeckColumn.tsx` | `CommanderPanel.tsx` | `variant="art_crop"` | WIRED | Line 109 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `DeckListView` | `cards` prop | `useDeckCardsStore(s => s.cards)` via `DeckColumn` | Yes — loaded from `db.deckCards` in `loadForDeck` | FLOWING |
| `DeckGridView` | `cards` prop | Same as above | Yes | FLOWING |
| `DeckColumn` | `cards` | `useDeckCardsStore` store, seeded from Dexie | Yes | FLOWING |
| `CommanderPanel` (art_crop) | `primaryCommander` | `useCommanderStore` from Dexie | Yes — persisted from Phase 02.1 | FLOWING |
| `CardResultCell` | `isInDeck` / `isAdding` | `useDeckCardsStore(s => s.cards)` + `addingIds Set` | Yes | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for most — server not running. Covered by unit and E2E test results documented in SUMMARYs.

| Behavior | Evidence | Status |
|----------|----------|--------|
| `isBasicLand` returns true for 12 basics | 20 unit tests, no `it.todo` | PASS (unit) |
| `categorizeCard` Land-wins precedence | 15 unit tests, line 9 < line 10 | PASS (unit) |
| `addCard` 3-table atomic write | 16 store unit tests | PASS (unit) |
| All Phase 3 E2E flows | 27 E2E passing (12 new + 15 prior) | PASS (e2e) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 03-03, 03-05 | User can add a card from search results | SATISFIED | `addCard` in store + CardResultCell (+) wiring + E2E BUILD-01 |
| BUILD-02 | 03-03, 03-05 | User can remove a card from the deck | SATISFIED | `removeCard` atomic transaction + E2E BUILD-02 |
| BUILD-03 | 03-03, 03-05 | Singleton enforcement (no duplicate non-basics) | SATISFIED | `isBasicLand` bypass in `addCard` + CardResultCell disabled state + E2E BUILD-03 |
| BUILD-04 | 03-02, 03-03 | 12 basic land types recognized | SATISFIED | `BASIC_LAND_NAMES` const + regex + store bypass + E2E BUILD-04 |
| BUILD-05 | 03-04 | Grid view with lazy-load images | SATISFIED | `DeckGridView` aspect-ratio cells, `loading="lazy"`, skeleton fade + E2E BUILD-05 |
| BUILD-06 | 03-02, 03-04 | Categorized list view (7 types) | SATISFIED | `categorizeCard` + `CATEGORY_ORDER` + `DeckListView` sections + E2E BUILD-06 |
| BUILD-07 | 03-03, 03-04 | Toggle between views (persisted) | SATISFIED | `ViewToggle` + `setViewMode` + Dexie persistence + E2E BUILD-07 |
| BUILD-08 | 03-01, 03-03 | originalReleaseDate via oracle_id | SATISFIED | `resolveOriginalReleaseDate` with `oracleid:` operator + E2E BUILD-08 reads IDB |
| DECK-09 | 03-03, 03-05 | Every add/remove writes deckChanges | SATISFIED | Both transactions write to `db.deckChanges` + E2E DECK-09 reads IDB |
| UI-02 | 03-04 | Card images lazy-load with skeleton placeholders | SATISFIED | `loading="lazy" decoding="async"` + `aspect-[146/204]` CLS-safe + E2E BUILD-05 |
| UI-04 | 03-05 | Commander prominently displayed with art_crop | SATISFIED | `CommanderPanel variant="art_crop"` in `DeckColumn` + `data-testid="commander-strip-image"` + E2E UI-04 |

**Note on UI-04 in REQUIREMENTS.md:** The `- [ ]` checkbox on line 74 and "Pending" in the traceability table on line 200 of REQUIREMENTS.md are stale — the implementation is fully in place and verified by E2E. The requirements doc needs a minor update to mark UI-04 as closed (`- [x]`) and change "Pending" to "Complete" in the traceability table.

---

### Anti-Patterns Scan

No blockers found. All four REVIEW.md warnings (WR-01 through WR-04) were fixed in commits `72b4644`, `2ce7c4e`, `b90b86e`, and `030f8c1` — all verified in git history and source.

| File | Finding | Severity | Status |
|------|---------|----------|--------|
| `deck-cards-store.ts` | WR-01: removeCard unhandled rejection | Blocker | FIXED — try/catch wraps transaction, sets error state |
| `DeckColumn.tsx` | WR-02: stale lookupMap closure | Warning | FIXED — reactive subscription to `searchResults`, `lookupMap` in deps |
| `CardSearchSection.tsx` | WR-03: invalid `aria-pressed` on span | Warning | FIXED — removed, kept `aria-label` |
| `DeckGridView.tsx` | WR-04: dead `deckCard` prop on GridCell | Warning | FIXED — prop removed from type and call site |
| Various | Info items (IN-01 through IN-05) | Info | Out of scope for this verification; no code correctness impact |

---

### Human Verification Required

None. The human-verify checkpoint (12-step eyeball list in Plan 03-05) was completed and approved by the user in-session on 2026-04-14 prior to this verification. That approval covers:
- Visual quality of the 60/40 layout
- Commander art_crop strip appearance
- Grid vs list view rendering
- Card add/remove UX flow
- Error states and empty states

No residual human-verification items remain.

---

### Gaps Summary

No gaps. All 11 must-have truths verified, all artifacts exist and are substantive and wired, all key links confirmed, all 11 Phase 3 requirements satisfied by code evidence and test coverage.

**One documentation inconsistency to close:** `REQUIREMENTS.md` line 74 still shows `- [ ] UI-04` and line 200 shows `| UI-04 | Phase 3 | Pending |`. This is a doc update, not a code gap. The implementation is complete.

---

_Verified: 2026-04-14T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
