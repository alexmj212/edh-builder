---
phase: 02-commander-selection-card-search
plan: 02
subsystem: lib-core
tags: [partner-detection, scryfall-client, card-cache, tdd, rate-limiting, dexie, zod]
dependency_graph:
  requires:
    - 02-01 (CachedCard type, Dexie v2 cards store, Wave 0 test scaffolds)
  provides:
    - partner-detection module (pure partner eligibility functions)
    - scryfall-client module (rate-limited HTTP + query builder + image helper)
    - card-cache module (read-through cache over Dexie cards store)
  affects:
    - src/lib/partner-detection.ts
    - src/lib/scryfall-client.ts
    - src/lib/card-cache.ts
    - src/lib/partner-detection.test.ts
    - src/lib/scryfall-client.test.ts
    - src/lib/card-cache.test.ts
tech_stack:
  added: []
  patterns:
    - Pure function module with keyword/oracle_text dual-source detection
    - Module-level singleton rate limiter with AbortSignal support
    - Zod envelope validation on external API responses (T-02-02-B)
    - encodeFragment escaping for user-supplied query values (T-02-02-A)
    - Read-through Dexie cache with 7-day TTL
    - vi.useFakeTimers({ toFake: ['Date'] }) to avoid Dexie Promise hang
    - mockImplementation factory pattern for re-usable Response mocks
key_files:
  created:
    - src/lib/partner-detection.ts
    - src/lib/scryfall-client.ts
    - src/lib/card-cache.ts
  modified:
    - src/lib/partner-detection.test.ts
    - src/lib/scryfall-client.test.ts
    - src/lib/card-cache.test.ts
decisions:
  - "vi.useFakeTimers({ toFake: ['Date'] }) used instead of full fake timers to prevent Dexie Promise microtask hang in card-cache tests"
  - "mockFetch uses mockImplementation factory (not mockResolvedValue) so each call gets a fresh Response body — Response.json() can only be called once per instance"
  - "Noop .catch() attached to intentionally-rejected promises before abort/error assertions to suppress Node unhandled-rejection warnings with fake timers"
  - "noUnusedLocals: isValidBackground, fetchCardById, buildCommanderSearchQuery removed from test imports (called indirectly via areCompatiblePartners and integration paths)"
metrics:
  duration: 15 minutes
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 02 Plan 02: Wave 1 Library Modules Summary

**One-liner:** partner-detection pure functions for all 4 partner variants, rate-limited zod-validated Scryfall HTTP client with query builder, and 7-day TTL read-through Dexie card cache — all with fully green TDD test suites replacing Wave 0 it.todo scaffolds.

## What Was Built

### Task 1: partner-detection pure functions

- Created `src/lib/partner-detection.ts` exporting `PartnerType` discriminated union, `detectPartnerType`, `isValidBackground`, `areCompatiblePartners`
- Detection order: friendsForever → named (with regex capture) → chooseBackground → generic → none
- Reads `keywords[]` first (case-insensitive), falls back to `oracle_text` regex for all variants
- Handles missing fields gracefully (empty array / empty string defaults)
- Replaced 11 `it.todo` stubs with 12 real assertions (added oracle-text-only generic partner test)
- All 12 tests pass

### Task 2: scryfall-client rate-limited HTTP client

- Created `src/lib/scryfall-client.ts` with `searchCards`, `fetchCardById`, `fetchNextPage`, `buildSearchQuery`, `buildCommanderSearchQuery`, `getImageUri`, `__resetRateLimit`
- Module-level `lastRequestTime` singleton enforces 100ms minimum gap between requests
- `waitForRateLimit` uses `setTimeout` within a Promise so `AbortSignal` can cancel mid-wait cleanly
- `encodeFragment` strips `"` and wraps whitespace-containing values in quotes (T-02-02-A mitigation)
- Zod `ScryfallListSchema` validates response envelope before returning (T-02-02-B mitigation)
- 404 responses return empty list shape rather than throwing
- Replaced 13 `it.todo` stubs with 13 real assertions using fake timers and mocked fetch
- All 13 tests pass

### Task 3: card-cache read-through over Dexie

- Created `src/lib/card-cache.ts` exporting `CACHE_TTL_MS` (7 days), `getCard`, `cacheCard`, `cacheCards`
- `getCard` checks TTL: returns `null` if `Date.now() - cachedAt >= CACHE_TTL_MS`
- `hasOracleId` type guard filters entries missing `oracle_id` (T-02-02-E mitigation — no user-controlled cache keys)
- `cacheCards` uses `db.cards.bulkPut` for batch writes; skips empty entries
- Replaced 7 `it.todo` stubs with 7 real assertions using fake-indexeddb and controlled `Date`
- All 7 tests pass

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | e17643f | feat(02-02): implement partner-detection pure functions with tests |
| Task 2 | 9cc3225 | feat(02-02): implement scryfall-client with rate limiter, query builder, image helper |
| Task 3 | fa341a5 | feat(02-02): implement card-cache read-through over Dexie cards store |
| Cleanup | fd1c88c | fix(02-02): remove unused imports in test files (noUnusedLocals) |

## Verification Results

- `npm test` — 9 files passed, 3 skipped, 86 tests passed, 17 todos (exits 0)
- `npx vite build` — exits 0, 27 modules transformed
- `npx tsc -p tsconfig.app.json --noEmit` (src only) — 0 errors in project source
- Pre-existing `@scryfall/api-types@1.0.0-alpha.4` tsc errors in node_modules — unchanged, out of scope (documented in Plan 01 SUMMARY)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Response body consumed on second mock call**
- **Found during:** Task 2 test run
- **Issue:** `vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(...))` shares one `Response` instance across all calls; `Response.json()` can only be called once per instance, causing "Body is unusable" on second `searchCards` call in rate-limiter test
- **Fix:** Changed `mockResolvedValue` to `mockImplementation(() => Promise.resolve(new Response(...)))` so each call gets a fresh `Response` instance
- **Files modified:** `src/lib/scryfall-client.test.ts`
- **Commit:** 9cc3225

**2. [Rule 1 - Bug] Unhandled rejection warnings from fake-timer async tests**
- **Found during:** Task 2 test run
- **Issue:** Node's `PromiseRejectionHandledWarning` fires on the 500-error and abort tests because the rejection becomes visible to Node before `await expect(p).rejects` captures it
- **Fix:** Added `promise.catch(() => {})` noop immediately after creating each intentionally-rejected promise
- **Files modified:** `src/lib/scryfall-client.test.ts`
- **Commit:** 9cc3225

**3. [Rule 1 - Bug] Dexie Promise microtasks hang under full fake timers**
- **Found during:** Task 3 test run — all 7 tests timed out at 10 seconds each
- **Issue:** `vi.useFakeTimers()` with default settings intercepts `setTimeout`/`setInterval` which Dexie/fake-indexeddb rely on internally for Promise resolution, causing `db.delete()` and `db.open()` to hang indefinitely
- **Fix:** Two-part: (a) moved `db.delete()` / `db.open()` before `vi.useFakeTimers()` call; (b) used `vi.useFakeTimers({ toFake: ['Date'] })` to only fake `Date` (TTL math) and leave Promise machinery intact
- **Files modified:** `src/lib/card-cache.test.ts`
- **Commit:** fa341a5

**4. [Rule 1 - Bug] Unused imports failing noUnusedLocals**
- **Found during:** Post-task `tsc --noEmit` check
- **Issue:** `isValidBackground` (partner-detection.test.ts), `fetchCardById` and `buildCommanderSearchQuery` (scryfall-client.test.ts) imported but not directly called in tests
- **Fix:** Removed the three unused imports
- **Files modified:** `src/lib/partner-detection.test.ts`, `src/lib/scryfall-client.test.ts`
- **Commit:** fd1c88c

## Self-Check: PASSED

All 6 files verified present on disk. All 4 commits (e17643f, 9cc3225, fa341a5, fd1c88c) confirmed in git log.
