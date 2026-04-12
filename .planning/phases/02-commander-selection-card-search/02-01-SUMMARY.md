---
phase: 02-commander-selection-card-search
plan: 01
subsystem: foundation
tags: [dexie, migration, react-router-dom, test-scaffolds, wave-0]
dependency_graph:
  requires: []
  provides:
    - react-router-dom@7 dependency
    - CachedCard type (src/types/card.ts)
    - Dexie v2 schema with cards store
    - Wave 0 test scaffolds for all Wave 1/2 modules
  affects:
    - src/lib/db.ts
    - package.json
tech_stack:
  added:
    - react-router-dom@7.14.0
  patterns:
    - Dexie additive version migration (version(2).stores redeclares all v1 stores verbatim)
    - CachedCard type with oracle_id string primary key
    - it.todo wave-0 scaffold pattern for downstream TDD
key_files:
  created:
    - src/types/card.ts
    - src/lib/partner-detection.test.ts
    - src/lib/scryfall-client.test.ts
    - src/lib/card-cache.test.ts
    - src/store/commander-store.test.ts
    - src/store/card-search-store.test.ts
    - src/components/DeckWorkspace.test.tsx
  modified:
    - package.json
    - package-lock.json
    - src/lib/db.ts
    - src/lib/db.test.ts
decisions:
  - "react-router-dom@7 installed via canonical npm name — resolved to 7.14.0"
  - "Dexie v2 migration is additive-only: no upgrade() callback needed since no record transformation required"
  - "CachedCard uses string primary key (oracle_id) matching Scryfall's oracle_id UUID format"
  - "Wave 0 scaffolds use it.todo exclusively — no placeholder failing assertions — so vitest exits 0 in pending state"
  - "tsc --noEmit fails due to pre-existing @scryfall/api-types@1.0.0-alpha.4 incompatibility with erasableSyntaxOnly (TS6); vite build and vitest both pass"
metrics:
  duration: 4 minutes
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 4
---

# Phase 02 Plan 01: Wave 0 Foundation Summary

**One-liner:** Dexie v2 migration with oracle_id-keyed cards store, react-router-dom@7 install, CachedCard type, and 6 exhaustive it.todo scaffold files covering all Wave 1/2 module contracts.

## What Was Built

### Task 1: Install react-router-dom and declare CachedCard type
- Installed `react-router-dom@7.14.0` as a runtime dependency
- Created `src/types/card.ts` exporting `CachedCard` interface with `oracle_id: string`, `cardJson: ScryfallCard.Any`, and `cachedAt: number`

### Task 2: Bump Dexie to v2 with cards store and migration tests
- Extended `src/lib/db.ts` with `import type { CachedCard }` and a new `cards!: Table<CachedCard, string>` property
- Added `version(2).stores()` block redeclaring all v1 stores verbatim plus `cards: 'oracle_id, cachedAt'`
- Extended `src/lib/db.test.ts` with 3 migration tests (v1 data preservation, cards put/get, TTL range query)
- All 9 db tests pass (6 pre-existing + 3 new)

### Task 3: Create Wave 0 test scaffolds
- Created 6 test files with 48 `it.todo` stubs covering all Wave 1/2 module contracts:
  - `partner-detection.test.ts` — 11 stubs (CMDR-04, CMDR-05)
  - `scryfall-client.test.ts` — 13 stubs (CMDR-01, SRCH-01..04, SRCH-06)
  - `card-cache.test.ts` — 7 stubs (cache TTL, read-through, bulkPut)
  - `commander-store.test.ts` — 6 stubs (CMDR-02, CMDR-03)
  - `card-search-store.test.ts` — 7 stubs (SRCH-05, SRCH-07)
  - `DeckWorkspace.test.tsx` — 4 stubs (routing + not-found)
- All 48 todos report as pending (skipped), vitest exits 0

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4b95eec | feat(02-01): install react-router-dom and declare CachedCard type |
| Task 2 | 100900b | feat(02-01): bump Dexie to v2 with cards store and migration tests |
| Task 3 | a421e7e | test(02-01): create Wave 0 test scaffolds for Wave 1 and Wave 2 modules |

## Verification Results

- `npm test` — 6 files passed, 6 skipped, 54 tests passed, 48 todos (exits 0)
- `npm run build` — vite build exits 0, 27 modules transformed
- `react-router-dom` version in package.json: `^7.14.0`
- `this.version(2).stores` present in `src/lib/db.ts`

## Deviations from Plan

### Pre-existing Issue (Not Fixed — Out of Scope)

**`npx tsc -p tsconfig.app.json --noEmit` exits non-zero**

- **Found during:** Task 1 verification
- **Issue:** `@scryfall/api-types@1.0.0-alpha.4` ships raw `.ts` source files as its `main` entry point. TypeScript 6's `erasableSyntaxOnly` and `verbatimModuleSyntax` flags conflict with this package's use of `enum` and non-type-only imports. The package ships `.ts` files, not `.d.ts`, so `skipLibCheck: true` does not suppress them.
- **Why it was pre-existing:** The main project (`/home/alex/Projects/edh-builder`) passes `tsc --noEmit` due to a cached `.tsbuildinfo` file; a fresh environment (this worktree) exposes the latent issue.
- **Impact:** Zero — `vite build` succeeds, `vitest` passes, all 9 db tests and 54 suite tests pass. The build toolchain (vite/esbuild) uses its own TS transformer that doesn't enforce these strict flags on node_modules.
- **Deferred to:** `deferred-items.md` — recommend upgrading `@scryfall/api-types` to a stable release or adding a `tsconfig` path alias to redirect to a pre-compiled shim.

## Self-Check: PASSED

All 9 files verified present on disk. All 3 task commits (4b95eec, 100900b, a421e7e) confirmed in git log.
