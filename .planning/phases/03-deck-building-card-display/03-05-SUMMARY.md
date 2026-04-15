---
phase: 03-deck-building-card-display
plan: "05"
subsystem: deck-building-integration
tags: [integration, wiring, e2e, playwright, human-verify]
dependency_graph:
  requires: [03-01, 03-02, 03-03, 03-04]
  provides: [live-deck-building-ux, e2e-coverage-phase3]
  affects: [DeckWorkspace, CardSearchSection, CommanderPanel, CardResultCell, DeckColumn]
tech_stack:
  added: []
  patterns:
    - lastLoadedDeckIdRef StrictMode gate in DeckColumn (mirrors CardSearchSection pattern)
    - CommanderPanel variant prop (normal|art_crop) with artCropImageFor helper
    - useDeckCardsStore subscription in CardSearchSection for per-card isInDeck/isAdding
    - addingIds Set<string> local state for per-card loading spinners
    - deckBuildingFlows Playwright helpers (addCardToDeck, removeCardFromDeck, toggleDeckView, etc.)
    - stubScryfall extended with Sol Ring + Forest CARDS_BY_ID + oracleid prints route
key_files:
  created:
    - src/components/DeckColumn.tsx
    - e2e/helpers/deckBuildingFlows.ts
    - e2e/specs/13-deck-building.spec.ts
    - e2e/fixtures/cards/sol-ring.json
    - e2e/fixtures/cards/forest.json
    - e2e/fixtures/searches/sol-ring-prints.json
  modified:
    - src/components/CardResultCell.tsx
    - src/components/CardResultCell.test.tsx
    - src/components/CardSearchSection.tsx
    - src/components/CommanderPanel.tsx
    - src/components/CommanderPanel.test.tsx
    - src/components/DeckColumn.test.tsx
    - src/components/DeckWorkspace.tsx
    - src/components/DeckWorkspace.test.tsx
    - e2e/helpers/stubScryfall.ts
decisions:
  - CommanderPanel always rendered at top of DeckColumn regardless of primaryCommander — enables commander search input to be accessible at all times (fixed 14 pre-existing e2e failures as a side effect)
  - CardResultCell props isInDeck/isAdding/onAdd kept pure (no store subscription) — CardSearchSection is the composing parent
  - addCardToDeck helper waits for card text in deck-column (not .or() which caused strict-mode violations)
  - DeckWorkspace.test.tsx beforeEach stubs deck-cards-store.loadForDeck to prevent DatabaseClosedError from async Dexie access after db.delete()
metrics:
  completed_date: "2026-04-14"
  tasks: 3/3
  unit_tests_before: 260
  unit_tests_after: 281
  e2e_before: 1 passed (14 pre-existing failures + 12 skipped)
  e2e_after: 27 passed (0 failed)
---

# Phase 03 Plan 05: Integration — DeckColumn, DeckWorkspace 60/40, CardResultCell wiring, E2E spec

**One-liner:** Full Phase 3 integration — 60/40 DeckWorkspace, CommanderPanel art_crop variant, CardResultCell (+) wired to addCard, 12-test Playwright spec covering all ROADMAP Phase 3 success criteria; fixed 14 pre-existing e2e failures as a bonus.

## What Was Built

### Task 1: CardResultCell (+) button — new props + states

- `CardResultCellProps` extended with `isInDeck: boolean`, `isAdding: boolean`, `onAdd: () => void | Promise<void>`
- Button state machine: Default (`bg-accent opacity-90`) / Loading (`opacity-50 spinner`) / Duplicate non-basic (`opacity-40 disabled title="Already in deck"`) / Basic land (always addable even when isInDeck=true)
- Removed obsolete "coming in Phase 3" copy
- 11 unit tests (6 Phase 2 preserved + 5 Phase 3 new)
- **Commit:** `ea99bbf`

### Task 2: DeckColumn + DeckWorkspace 60/40 + CommanderPanel art_crop + CardSearchSection store wiring

**CommanderPanel (src/components/CommanderPanel.tsx):**
- `variant?: 'normal' | 'art_crop'` prop added (default `'normal'`, backward-compatible)
- `artCropImageFor()` helper mirrors `fullCardImageFor()` for art_crop image path
- `art_crop` variant: `aspect-[626/457]` container, `data-testid="commander-strip-image"` on img
- DFC flip works in both variants

**DeckColumn (src/components/DeckColumn.tsx):**
- Full composition: ViewToggle + CommanderPanel(art_crop, always visible) + DeckListView/DeckGridView
- `lastLoadedDeckIdRef` StrictMode gate (loadForDeck fires exactly once)
- `scrollTop = 0` reset on view toggle
- `cardLookup` Map seeded from search store results (warm) + on-demand `fetchCardById`
- Empty states: "Pick a commander first." / "No cards yet."
- Error banner `role="alert"` when `store.error` set
- `data-testid="deck-column"` for deterministic locators
- 12 unit tests all green including StrictMode single-mount proof

**DeckWorkspace (src/components/DeckWorkspace.tsx):**
- 60/40 flex split: `flex-[3]` search / `flex-[2]` deck with `lg:sticky lg:top-6`
- Placeholder `<section data-testid="deck-placeholder">` replaced with `<DeckColumn deckId={numericId} />`
- Top-level `<CommanderPanel>` removed — single CommanderPanel mount inside DeckColumn only
- `data-testid="deck-workspace"` on outer wrapper

**CardSearchSection (src/components/CardSearchSection.tsx):**
- Subscribes to `useDeckCardsStore` for `cards`, `deckId`, `addCard`
- `addingIds: Set<string>` local state tracks in-flight adds per card
- `handleAdd()` calls `store.addCard(deckId, card)` and manages loading state

- **Commit:** `bdaeb26`

### Task 3: Playwright spec + fixtures + helpers

**Fixtures:**
- `e2e/fixtures/cards/sol-ring.json` — Sol Ring (LEA, released_at: 1993-12-31)
- `e2e/fixtures/cards/forest.json` — Forest (Basic Land, released_at: 1993-08-05)
- `e2e/fixtures/searches/sol-ring-prints.json` — prints lookup response

**stubScryfall extension:**
- Sol Ring + Forest added to `CARDS_BY_ID` map
- `unique=prints + oracleid:` query pattern → sol-ring-prints.json

**deckBuildingFlows.ts helpers:**
- `addCardToDeck`, `removeCardFromDeck`, `toggleDeckView`
- `assertInDeckColumn`, `assertNotInDeckColumn`, `getDeckCountBadge`

**13-deck-building.spec.ts — 12 tests:**
1. BUILD-01: add card from search → deck column
2. BUILD-02: remove card → count goes to 0
3. BUILD-03: duplicate non-basic → button disabled "Already in deck"
4. BUILD-04: basic land multiples → count increments past 1
5. BUILD-05/UI-02: grid view lazy-load + aspect-[146/204]
6. BUILD-06: list view category grouping (Artifacts / Lands sections)
7. BUILD-07: grid/list toggle persists across reload (IDB round-trip)
8. BUILD-08: originalReleaseDate populated in IndexedDB (1993-12-31)
9. DECK-09: add+remove writes 2 deckChanges entries
10. UI-04: commander-strip-image visible in deck-column with art_crop src; no sibling outside
11. Layout: deck column to right of search at 1400px; Sol Ring row within viewport height
12. StrictMode: exactly 1 prints lookup per (+) click

- **Commit:** `664c13a`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CommanderPanel gated behind primaryCommander check**
- **Found during:** Task 3 E2E runs
- **Issue:** DeckColumn originally rendered CommanderPanel inside `{primaryCommander ? ... : gate}` block, making the commander search input inaccessible when no commander was set. All e2e `selectCommander` calls timed out waiting for `getByLabel('Search for a commander')`.
- **Fix:** Moved CommanderPanel above the primaryCommander gate so it always renders (CommanderPanel handles its own loading/empty/populated states internally). "Pick a commander first." text only gates the card list below.
- **Side effect:** Fixed all 14 pre-existing e2e failures (specs 01-12) — they all failed for the same reason (commander search input not reachable after DeckWorkspace restructuring).
- **Files modified:** `src/components/DeckColumn.tsx`
- **Commit:** `664c13a`

**2. [Rule 2 - Missing functionality] DeckWorkspace.test.tsx beforeEach DatabaseClosedError**
- **Found during:** Full unit suite after Task 3
- **Issue:** DeckColumn mounts inside DeckWorkspace and calls `deck-cards-store.loadForDeck` which hits Dexie. The `beforeEach` calls `db.delete()` first, closing the DB. Subsequent async Dexie access from DeckColumn's effect threw unhandled `DatabaseClosedError`.
- **Fix:** Added `loadForDeck: vi.fn().mockResolvedValue(undefined)` to the `useDeckCardsStore.setState` in `beforeEach`.
- **Files modified:** `src/components/DeckWorkspace.test.tsx`
- **Commit:** `664c13a`

**3. [Rule 1 - Bug] addCardToDeck helper strict-mode violation with .or() locator**
- **Found during:** Initial Task 3 e2e run
- **Issue:** `.or()` locator resolved to 2 elements (card name in both search overlay and deck list), causing Playwright strict mode violation on `.toBeVisible()`.
- **Fix:** Simplified wait to `deckColumn.getByText(cardName).first()` — always resolves to exactly 1 element.
- **Files modified:** `e2e/helpers/deckBuildingFlows.ts`
- **Commit:** `664c13a`

## Test Counts

| Suite | Before | After |
|-------|--------|-------|
| Unit tests | 260 | 281 (+21) |
| E2E passing | 1 | 27 (+26: 14 pre-existing fixed + 12 new) |
| E2E failing | 14 | 0 |

## Known Stubs

None. All Phase 3 ROADMAP success criteria are wired to real store/DB operations.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced in this plan.

## Requirements Closed

BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07, BUILD-08, DECK-09, UI-02, UI-04

---

*Awaiting human-verify checkpoint approval before STATE.md / ROADMAP.md update.*
