---
phase: 02-commander-selection-card-search
plan: 04
subsystem: routing-shell
tags: [react-router-dom, routing, workspace, tdd, deck-navigation]
dependency_graph:
  requires:
    - 02-03 (useCommanderStore.loadForDeck, useDeckStore)
    - 02-01 (react-router-dom install, DeckWorkspace.test.tsx scaffold)
  provides:
    - BrowserRouter + Routes for / and /decks/:id
    - DeckWorkspace component (URL-driven, loading/not-found/hydrated states)
    - WorkspaceHeader component (back link + deck name)
    - DeckList navigation refactored to useNavigate
  affects:
    - src/App.tsx
    - src/components/DeckList.tsx
    - src/components/DeckList.test.tsx
    - src/components/DeckWorkspace.tsx
    - src/components/DeckWorkspace.test.tsx
    - src/components/WorkspaceHeader.tsx
tech_stack:
  added:
    - react-router-dom@7.14.0 (was in package.json, now installed in node_modules)
  patterns:
    - BrowserRouter wrapping Layout — Layout stays outside Routes
    - useParams<{ id: string }>() + parseInt for numeric URL param validation
    - Three-branch render: loading / not-found / hydrated
    - useEffect([numericId]) to hydrate commander state on workspace mount
    - MemoryRouter wrapping in all DeckList and DeckWorkspace tests
key_files:
  created:
    - src/components/WorkspaceHeader.tsx
    - src/components/DeckWorkspace.tsx
  modified:
    - src/App.tsx
    - src/components/DeckList.tsx
    - src/components/DeckList.test.tsx
    - src/components/DeckWorkspace.test.tsx
decisions:
  - "react-router-dom was in package.json but not installed in node_modules — npm install resolved it"
  - "DeckList onSelect calls both setActiveDeck and navigate to preserve active-deck highlight while routing"
  - "parseInt(id ?? '', 10) with NaN guard rejects non-numeric URLs without throwing (T-02-04-A mitigation)"
  - "loading branch renders before deck lookup so no deck-not-found flash on hydration (T-02-04-B mitigation)"
metrics:
  duration: 3 minutes
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 4
---

# Phase 02 Plan 04: Routing & DeckWorkspace Shell Summary

**One-liner:** BrowserRouter routing with /decks/:id route, DeckWorkspace shell with loading/not-found/hydrated states and section placeholders, WorkspaceHeader with spec-correct classes, and all 4 DeckWorkspace test stubs converted to real passing RTL tests.

## What Was Built

### Task 1: BrowserRouter + WorkspaceHeader + DeckList navigation refactor

- Rewrote `src/App.tsx` to use `BrowserRouter` with three routes: `/` → DeckList, `/decks/:id` → DeckWorkspace, `*` → Navigate redirect
- Created `src/components/WorkspaceHeader.tsx` with `← Back to decks` link (`text-accent hover:text-accent-hover text-sm font-semibold`) and deck name (`text-2xl font-semibold text-text-primary`) per UI-SPEC section 2
- Added `useNavigate` to `DeckList.tsx`; `onSelect` now calls `setActiveDeck(deck.id)` and `navigate('/decks/${deck.id}')` together
- Wrapped all 23 `render(<DeckList />)` calls in `DeckList.test.tsx` with `MemoryRouter`
- Ran `npm install` to materialize react-router-dom from package.json into node_modules
- All 23 existing DeckList tests continue to pass

### Task 2: DeckWorkspace component (TDD)

**RED:** Replaced 4 `it.todo` stubs in `DeckWorkspace.test.tsx` with real RTL assertions — tests failed (module not found).

**GREEN:** Created `src/components/DeckWorkspace.tsx`:
- `useParams<{ id: string }>()` extracts id; `parseInt(id ?? '', 10)` parses to numeric; NaN → not-found
- `useEffect([decks.length, loadDecks])`: calls `loadDecks()` on mount if decks array empty
- `useEffect([numericId, loadForDeck])`: calls `loadForDeck(numericId)` when valid numericId changes
- Loading branch: `loading === true` → renders "Loading deck..." message
- Not-found branch: `!deck` → renders "Deck not found." + `<Link to="/">← Back to decks</Link>`
- Hydrated branch: renders `WorkspaceHeader` + three sections with stable `data-testid` attrs for Plans 05/06

All 4 DeckWorkspace tests pass. Full suite: 12 files, 107 tests.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 20e5a72 | feat(02-04): add BrowserRouter routing, WorkspaceHeader, and DeckList navigation |
| Task 2 | f94a812 | feat(02-04): create DeckWorkspace component with routing and convert test stubs to passing tests |

## Verification Results

- `npx vitest run src/components/DeckList.test.tsx` — 23/23 passed
- `npx vitest run src/components/DeckWorkspace.test.tsx` — 4/4 passed
- `npm test` — 12 files passed, 107 tests passed (0 failures, 0 todos)
- `npx tsc -p tsconfig.app.json --noEmit` (project source) — 0 errors
- `npx vite build` — 51 modules transformed, exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-router-dom not installed in node_modules**
- **Found during:** Task 1 verification (`npx vitest run` failed with "Cannot find module 'react-router-dom'")
- **Issue:** `react-router-dom@^7.14.0` was declared in `package.json` (added in Plan 01) but was not present in `node_modules` — likely because `npm install` was never run after the package was added in the worktree context of Plan 01
- **Fix:** Ran `npm install` — added 4 packages (react-router, react-router-dom, and peers), audited 301 total
- **Files modified:** `node_modules/` (not tracked), `package-lock.json` implicitly
- **Commit:** included in 20e5a72

## Self-Check: PASSED

All files verified present:
- `src/App.tsx` — contains `BrowserRouter`, `path="/decks/:id"`, `element={<DeckWorkspace />}`, `element={<Navigate to="/" replace />`
- `src/components/WorkspaceHeader.tsx` — contains `export function WorkspaceHeader`, `← Back to decks`, `to="/"`, `text-2xl font-semibold text-text-primary`, `text-accent hover:text-accent-hover text-sm font-semibold`
- `src/components/DeckWorkspace.tsx` — contains `export function DeckWorkspace`, `useParams`, `loadForDeck`, `data-testid="commander-panel"`, `data-testid="card-search-section"`, `data-testid="deck-placeholder"`, `Deck cards will appear here`, `Deck not found`
- `src/components/DeckWorkspace.test.tsx` — 0 `it.todo` lines, 4 real `it(` tests
- Commits 20e5a72 and f94a812 confirmed in git log
