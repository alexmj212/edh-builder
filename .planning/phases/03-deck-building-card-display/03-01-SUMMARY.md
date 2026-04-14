---
phase: 03-deck-building-card-display
plan: 01
subsystem: database
tags: [dexie, typescript, scryfall, scaffold, wave-0]

# Dependency graph
requires:
  - phase: 02.3-scryfall-wrapper
    provides: Card type exported from src/lib/scryfall.ts used by new scaffolds

provides:
  - Dexie v4 additive schema with no upgrade callback
  - Deck.viewMode and DeckCard.originalReleaseDate optional fields
  - 16 typed scaffold files (Wave 2-4 modules as it.todo stubs)
  - Verified Scryfall oracle-id prints-lookup operator (oracleid:)

affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Additive Dexie migration pattern (repeat index strings, no upgrade callback)
    - it.todo scaffold pattern for parallel Wave execution unblocking

key-files:
  created:
    - src/lib/basic-lands.ts
    - src/lib/basic-lands.test.ts
    - src/lib/card-categorizer.ts
    - src/lib/card-categorizer.test.ts
    - src/store/deck-cards-store.ts
    - src/store/deck-cards-store.test.ts
    - src/components/ViewToggle.tsx
    - src/components/ViewToggle.test.tsx
    - src/components/DeckColumn.tsx
    - src/components/DeckColumn.test.tsx
    - src/components/DeckListView.tsx
    - src/components/DeckListView.test.tsx
    - src/components/DeckGridView.tsx
    - src/components/DeckGridView.test.tsx
    - e2e/helpers/deckBuildingFlows.ts
    - e2e/specs/13-deck-building.spec.ts
    - .planning/phases/03-deck-building-card-display/03-ORACLEID-PROBE.md
  modified:
    - src/types/deck.ts
    - src/lib/db.ts
    - src/lib/db.test.ts

key-decisions:
  - "oracleid: is the canonical Scryfall search operator for oracle-id prints lookup (not oracle_id:) — confirmed by prints_search_uri field on every Card object"
  - "Sol Ring oracle_id in plan was incorrect (1e14d5f3-...); corrected to 6ad8011d-3471-4369-9d68-b264cc027487 via live /cards/named lookup"
  - "Dexie v4 migration is additive-only with no upgrade callback — same pattern as v2 and v3"

patterns-established:
  - "Wave 0 scaffold pattern: every Wave 2-5 module pre-created with typed placeholder exports + it.todo tests so vitest exits 0"
  - "Live Scryfall API probe required before committing operator syntax to store code (per feedback_verify_external_apis)"

requirements-completed: [BUILD-08]

# Metrics
duration: ~30min (across two sessions)
completed: 2026-04-14
---

# Phase 03 Plan 01: Foundation, Scaffolds, and Oracle-ID Probe Summary

**Dexie v4 additive schema with viewMode/originalReleaseDate fields, 16 Wave 2-4 typed scaffolds, and live-verified `oracleid:` Scryfall operator locked for prints lookup**

## Performance

- **Duration:** ~30 min (two sessions)
- **Started:** 2026-04-14
- **Completed:** 2026-04-14
- **Tasks:** 3/3
- **Files modified:** 20 (3 edited, 16 created, 1 probe doc)

## Accomplishments

- Bumped Dexie to v4 with additive schema (repeats v3 index strings, no upgrade callback); v3→v4 round-trip tests added and green
- Extended Deck type with `viewMode?: 'grid' | 'list'` and DeckCard with `originalReleaseDate?: string | null`
- Created all 16 Wave 2-4 module boundaries (typed placeholder exports + it.todo test scaffolds) so Plans 03-02 through 03-05 can run in parallel without blocking
- Verified live Scryfall API: `oracleid:` is the canonical prints-lookup operator (both candidates return identical results; `oracleid:` is confirmed via the `prints_search_uri` field on every Card object)

## Task Commits

1. **Task 1: Dexie v4 + types + round-trip tests** - `fdaf1e3` (feat)
2. **Task 2: 16 scaffold files** - `9aeb501` (chore)
3. **Task 3: Oracle-ID probe document** - `8592e12` (docs)

## Files Created/Modified

- `src/types/deck.ts` - Added `viewMode?: 'grid' | 'list'` to Deck; `originalReleaseDate?: string | null` to DeckCard
- `src/lib/db.ts` - Added `this.version(4).stores(...)` block (additive, no upgrade callback)
- `src/lib/db.test.ts` - Added `describe('Dexie v4 additive migration', ...)` with 5 round-trip tests
- `src/lib/basic-lands.ts` - Stub placeholder returning false (implementation in 03-02)
- `src/lib/basic-lands.test.ts` - 5 it.todo entries
- `src/lib/card-categorizer.ts` - Stub placeholder returning 'Creatures' (implementation in 03-02)
- `src/lib/card-categorizer.test.ts` - 11 it.todo entries
- `src/store/deck-cards-store.ts` - DeckCardsState interface + AddResult union type + null placeholder
- `src/store/deck-cards-store.test.ts` - 10 it.todo entries across 5 describe blocks
- `src/components/ViewToggle.tsx` - Typed props interface, stub returning null
- `src/components/ViewToggle.test.tsx` - 5 it.todo entries
- `src/components/DeckColumn.tsx` - Typed props interface, stub returning null
- `src/components/DeckColumn.test.tsx` - 6 it.todo entries
- `src/components/DeckListView.tsx` - Typed props interface, stub returning null
- `src/components/DeckListView.test.tsx` - 7 it.todo entries
- `src/components/DeckGridView.tsx` - Typed props interface, stub returning null
- `src/components/DeckGridView.test.tsx` - 7 it.todo entries
- `e2e/helpers/deckBuildingFlows.ts` - 3 stub helpers throwing "not yet implemented" errors
- `e2e/specs/13-deck-building.spec.ts` - 12 `test.skip(...)` entries covering all BUILD-01..09 + UI-02/UI-04
- `.planning/phases/03-deck-building-card-display/03-ORACLEID-PROBE.md` - Live probe result with locked operator

## Decisions Made

- **oracleid: operator locked:** Both `oracleid:` and `oracle_id:` return identical results for the Sol Ring query (127 prints, first printing 1993-08-05). `oracleid:` is preferred as it matches the operator that Scryfall itself uses inside `prints_search_uri` on every Card object.
- **Sol Ring oracle_id corrected:** The plan listed `1e14d5f3-d09e-4f2f-ba4d-bf9eab5048e5` which returned errors; the correct oracle_id `6ad8011d-3471-4369-9d68-b264cc027487` was resolved via `/cards/named?exact=Sol%20Ring`.
- **Dexie v4 migration pattern confirmed:** Same additive-only approach used in v2 and v3 migrations — repeat index strings verbatim, no upgrade callback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect Sol Ring oracle_id in probe**
- **Found during:** Task 3 (live Scryfall probe)
- **Issue:** The plan specified oracle_id `1e14d5f3-d09e-4f2f-ba4d-bf9eab5048e5` for Sol Ring which returned errors from the Scryfall API
- **Fix:** Resolved actual oracle_id via `/cards/named?exact=Sol%20Ring` → `6ad8011d-3471-4369-9d68-b264cc027487`; both operators re-tested with the correct id; probe document records the corrected id with a note explaining the discrepancy
- **Files modified:** `.planning/phases/03-deck-building-card-display/03-ORACLEID-PROBE.md`
- **Verification:** Both candidates returned `total_cards: 127` with valid `first_printing_date: 1993-08-05`
- **Committed in:** `8592e12` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect API test value in plan)
**Impact on plan:** The incorrect oracle_id in the plan would have caused Plan 03-03 to ship broken prints-lookup code. The live probe caught and corrected this before any store implementation was written. No scope creep.

## Issues Encountered

- Prior session (a4aaa46e1dd83aa53) was stopped at the human-action checkpoint awaiting user verdict on the locked operator. User confirmed `oracleid:` as the chosen operator. This session committed the probe document and finalized the plan.

## Known Stubs

The following stubs are intentional (Wave 0 scaffolds) and will be replaced in subsequent plans:

| File | Stub | Resolved in |
|------|------|-------------|
| `src/lib/basic-lands.ts` | `isBasicLand` returns `false` unconditionally | 03-02-PLAN.md |
| `src/lib/card-categorizer.ts` | `categorizeCard` returns `'Creatures'` unconditionally | 03-02-PLAN.md |
| `src/store/deck-cards-store.ts` | `useDeckCardsStore = null as unknown as DeckCardsState` | 03-03-PLAN.md |
| `src/components/ViewToggle.tsx` | Returns `null` | 03-04-PLAN.md |
| `src/components/DeckColumn.tsx` | Returns `null` | 03-04-PLAN.md |
| `src/components/DeckListView.tsx` | Returns `null` | 03-04-PLAN.md |
| `src/components/DeckGridView.tsx` | Returns `null` | 03-04-PLAN.md |
| `e2e/helpers/deckBuildingFlows.ts` | All helpers throw "not yet implemented" | 03-05-PLAN.md |
| `e2e/specs/13-deck-building.spec.ts` | All tests use `test.skip` | 03-05-PLAN.md |

These stubs do NOT prevent the plan's goal (Wave unblocking) — they ARE the goal. Each will be replaced atomically in its corresponding plan.

## Next Phase Readiness

- Plans 03-02, 03-03, 03-04, 03-05 are all unblocked — every module boundary exists on disk
- `oracleid:` operator is locked; Plan 03-03 can use it directly in `resolveOriginalReleaseDate`
- Dexie v4 schema in place; `viewMode` and `originalReleaseDate` fields available to all Wave 2-5 plans
- All Wave 0 it.todo scaffolds pass vitest at exit 0

---
*Phase: 03-deck-building-card-display*
*Completed: 2026-04-14*

## Self-Check

### Files exist

- `src/types/deck.ts`: FOUND
- `src/lib/db.ts`: FOUND
- `src/lib/db.test.ts`: FOUND
- `src/lib/basic-lands.ts`: FOUND
- `src/lib/card-categorizer.ts`: FOUND
- `src/store/deck-cards-store.ts`: FOUND
- `src/components/ViewToggle.tsx`: FOUND
- `src/components/DeckColumn.tsx`: FOUND
- `src/components/DeckListView.tsx`: FOUND
- `src/components/DeckGridView.tsx`: FOUND
- `e2e/helpers/deckBuildingFlows.ts`: FOUND
- `e2e/specs/13-deck-building.spec.ts`: FOUND
- `.planning/phases/03-deck-building-card-display/03-ORACLEID-PROBE.md`: FOUND

### Commits exist

- `fdaf1e3` (Task 1): FOUND
- `9aeb501` (Task 2): FOUND
- `8592e12` (Task 3): FOUND

## Self-Check: PASSED
