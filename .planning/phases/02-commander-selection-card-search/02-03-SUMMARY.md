---
phase: 02-commander-selection-card-search
plan: 03
subsystem: store
tags: [zustand, dexie, scryfall, abort-controller, partner-detection, tdd]
dependency_graph:
  requires:
    - phase: 02-02
      provides: partner-detection, scryfall-client, card-cache Wave 1 library modules
    - phase: 02-01
      provides: Dexie v2 cards store, Wave 0 it.todo test scaffolds
  provides:
    - useCommanderStore (primary + partner commander per deck, Dexie persistence)
    - useCardSearchStore (paginated search results, AbortController, cache side effect)
  affects:
    - src/store/commander-store.ts
    - src/store/card-search-store.ts
    - Waves 3-5 UI components that consume commander and search state
tech-stack:
  added: []
  patterns:
    - Zustand store with async Dexie write + local state update
    - Module-level AbortController singleton aborted and replaced on each new search
    - Partner-clearing logic on primary commander change (detect + areCompatible check)
    - cacheCard/cacheCards fire-and-forget side effect via void keyword
    - TDD pattern — RED (missing module), GREEN (implementation), all stubs → real tests
key-files:
  created:
    - src/store/commander-store.ts
    - src/store/card-search-store.ts
  modified:
    - src/store/commander-store.test.ts
    - src/store/card-search-store.test.ts
key-decisions:
  - "Partner-clearing logic checks detectPartnerType(newPrimary).kind === 'none' first, then areCompatiblePartners(newPrimary, oldPartner) — two-pass so incompatible cross-kind pairs are also cleared"
  - "setPartner has no Dexie write in Phase 2 — partner slot is UI-only state; Phase 3 will persist if needed"
  - "loadForDeck fetches via fetchCardById (Scryfall printing id) rather than getCard (oracle_id) — deck row stores Scryfall card id, not oracle_id"
  - "card-search-store uses module-level let controller rather than store state to avoid triggering re-renders on abort/replace"
  - "cacheCards called with void to suppress unused-promise lint; fire-and-forget is intentional for search side effects"
patterns-established:
  - "Zustand stores call Wave 1 library functions directly — no intermediate service layer"
  - "AbortController lifecycle: abort previous, create new, capture signal before first await"
  - "Tests use useStore.setState() to set pre-conditions rather than running the full action chain"
requirements-completed:
  - CMDR-02
  - CMDR-03
  - CMDR-04
  - SRCH-05
  - SRCH-07
duration: 3min
completed: "2026-04-12"
---

# Phase 02 Plan 03: Zustand Store Implementations Summary

**Zustand commander-store with Dexie persistence and partner-clearing logic, plus abortable paginated card-search-store with cache side effects — all 13 Wave 0 it.todo stubs replaced with real passing tests.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T03:31:30Z
- **Completed:** 2026-04-12T03:34:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `useCommanderStore`: Zustand store that persists commanderId/commanderName/colorIdentity to Dexie on `setCommander`, clears incompatible partner on primary change, and hydrates from Scryfall on `loadForDeck`
- `useCardSearchStore`: Zustand store with module-level AbortController that cancels in-flight Scryfall requests on new `search()` call, appends results on `loadMore()`, and writes cards to cache as a side effect
- Replaced all 13 Wave 0 `it.todo` stubs across both test files with 17 real passing assertions (9 commander, 8 card-search)
- Full test suite: 103 tests passing, 4 pending todos (DeckWorkspace stubs deferred to Plan 05), 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: commander-store** - `430ed0a` (feat)
2. **Task 2: card-search-store** - `09c33b1` (feat)

_Note: TDD tasks executed as RED (write tests → module not found) then GREEN (create implementation) within each task commit_

## Files Created/Modified

- `src/store/commander-store.ts` — Zustand store for primary + partner commander with Dexie persistence
- `src/store/commander-store.test.ts` — 9 real tests replacing 6 it.todo stubs
- `src/store/card-search-store.ts` — Zustand store for abortable paginated search with cache side effect
- `src/store/card-search-store.test.ts` — 8 real tests replacing 7 it.todo stubs

## Decisions Made

- Partner-clearing uses two checks: `detectPartnerType(card).kind === 'none'` clears unconditionally; if partner-eligible, `areCompatiblePartners(card, oldPartner)` checks cross-kind compatibility (e.g., friendsForever primary + generic partner clears)
- `setPartner` has no Dexie write — partner is UI-only in Phase 2; `db.decks.update` spy test confirms this
- `loadForDeck` uses `fetchCardById` not `getCard` because deck row stores Scryfall card id (printing id), which differs from `oracle_id` used as the cache key
- Module-level `let controller` pattern instead of storing AbortController in Zustand state (state changes trigger re-renders; controller is infrastructure, not UI state)

## Deviations from Plan

None — plan executed exactly as written. Implementation and tests match the plan's action sections directly.

## Issues Encountered

None. TypeScript strict-mode checks pass for all project source files. Pre-existing `@scryfall/api-types@1.0.0-alpha.4` tsc errors in node_modules unchanged (documented in Plan 01 and Plan 02 summaries — out of scope).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both stores are ready for Wave 3 (DeckWorkspace routing) and Wave 4 (CommanderPanel UI)
- Components in Waves 3-5 consume `useCommanderStore` and `useCardSearchStore` directly — no intermediate service layer needed
- Debounce for search input lives in the component layer (Wave 4); stores expose synchronous `search(query)` and `setFilter(key, value)`

---
*Phase: 02-commander-selection-card-search*
*Completed: 2026-04-12*
