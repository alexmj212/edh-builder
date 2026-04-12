---
phase: 02-commander-selection-card-search
plan: 05
subsystem: commander-selection-ux
tags: [react, zustand, scryfall, debounce, tdd, partner-detection, color-identity]
dependency_graph:
  requires:
    - 02-04 (DeckWorkspace shell with data-testid="commander-panel" placeholder)
    - 02-03 (useCommanderStore: setCommander/clearCommander/setPartner/clearPartner)
    - 02-02 (scryfall-client, partner-detection, buildCommanderSearchQuery)
  provides:
    - useDebouncedValue hook (shared by Plan 06 card search)
    - CommanderSearch component (debounced Scryfall commander search)
    - ColorIdentityChip component (WUBRG pip display)
    - CommanderPanel component (primary + partner two-slot layout)
    - searchCommanders / searchPartnersFor helpers in scryfall-client
    - DeckWorkspace now renders CommanderPanel (placeholder replaced)
  affects:
    - src/components/DeckWorkspace.tsx (placeholder replaced)
    - src/lib/scryfall-client.ts (new exports appended)
tech_stack:
  added: []
  patterns:
    - useDebouncedValue hook pattern with setTimeout + cleanup
    - AbortController in useEffect with ctrlRef.useRef for request cancellation
    - vi.useFakeTimers + act(async () => { vi.advanceTimersByTime(); await Promise.resolve(); }) pattern for RTL tests with debounced components
    - URLSearchParams encodes spaces as '+'; decode with replace(/\+/g, ' ') before asserting on URL query string content
    - searchPartnersFor builds partner-type-specific query via switch on PartnerType.kind
key_files:
  created:
    - src/hooks/useDebouncedValue.ts
    - src/hooks/useDebouncedValue.test.ts
    - src/components/ColorIdentityChip.tsx
    - src/components/ColorIdentityChip.test.tsx
    - src/components/CommanderSearch.tsx
    - src/components/CommanderSearch.test.tsx
    - src/components/CommanderPanel.tsx
    - src/components/CommanderPanel.test.tsx
  modified:
    - src/lib/scryfall-client.ts (searchCommanders + searchPartnersFor appended)
    - src/lib/scryfall-client.test.ts (6 new tests for new exports)
    - src/components/DeckWorkspace.tsx (placeholder section replaced with CommanderPanel)
decisions:
  - "waitFor from RTL hangs with vi.useFakeTimers because RTL polling uses setTimeout internally — replaced with direct assertions after act(async () => { vi.advanceTimersByTime(); await Promise.resolve(); })"
  - "URLSearchParams encodes spaces as '+' not '%20' — test assertions use .replace(/\\+/g, ' ') before decodeURIComponent to correctly assert query content"
  - "CommanderSearch mounts with empty query and fires searchCommanders('') immediately on mount to show EDHREC default list — no wait-for-typing required"
  - "Partner compatibility gate in handleSelect is defense-in-depth; searchPartnersFor already pre-filters results but onSelect validates via areCompatiblePartners before calling prop callback"
metrics:
  duration: 6 minutes
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 3
---

# Phase 02 Plan 05: Commander Selection UX Summary

**One-liner:** Debounced Scryfall-backed CommanderSearch with AbortController, two-slot CommanderPanel (primary + partner eligibility gating), WUBRG ColorIdentityChip, and searchCommanders/searchPartnersFor helpers wired into DeckWorkspace replacing the Plan 04 placeholder.

## What Was Built

### Task 1: useDebouncedValue hook + ColorIdentityChip

- `src/hooks/useDebouncedValue.ts` — `useDebouncedValue<T>(value, delayMs)` using `useState` + `useEffect` with `setTimeout` cleanup. Rapid updates cancel the pending timer.
- `src/components/ColorIdentityChip.tsx` — renders WUBRG colored pip squares per UI-SPEC Section 5. `null` input renders italic "Filtered to: Pick a commander first". Empty array renders colorless "C" pip. Non-empty renders pips in WUBRG order filtered to those present.
- 7 tests: 3 timer-based hook tests (initial value, delay, cancel-on-rapid-change) + 4 ColorIdentityChip RTL tests.

### Task 2: searchCommanders + searchPartnersFor + CommanderSearch

- Added `searchCommanders(fragment, signal?)` to `scryfall-client.ts` — uses `buildCommanderSearchQuery` + `order=edhrec`.
- Added `searchPartnersFor(primary, fragment, signal?)` — switch on `PartnerType.kind` to build partner-type-specific Scryfall queries. Returns empty list synchronously for `none`-kind primary (no fetch call).
- `src/components/CommanderSearch.tsx` — debounced search input, AbortController via `useRef`, result list with art_crop thumbnails + name + type line, 4-row skeleton loading, zero-results copy, partner compatibility gate in `handleSelect`.
- 6 new scryfall-client unit tests + 6 CommanderSearch RTL tests (primary mode: default list, debounce, onSelect, zero-results; partner mode: compat-gate drop, searchPartnersFor call).

### Task 3: CommanderPanel + DeckWorkspace wiring

- `src/components/CommanderPanel.tsx` — two-slot layout (`grid grid-cols-1 sm:grid-cols-2 gap-4`). Primary slot: empty state + CommanderSearch on no commander; art + name + type + Change-commander button when selected. Partner slot: disabled (`opacity-50 border-dashed aria-disabled="true"`) when primary is absent or non-partner; active empty state + partner CommanderSearch when primary is partner-eligible; art + Remove-partner button when partner set.
- `src/components/DeckWorkspace.tsx` updated: replaced `<p>Commander panel placeholder</p>` with `<h2>Commander</h2><CommanderPanel deckId={numericId} />`.
- 5 CommanderPanel RTL tests. All 4 existing DeckWorkspace tests still pass (data-testid="commander-panel" preserved on the section).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | b2b7abc | feat(02-05): add useDebouncedValue hook and ColorIdentityChip component |
| Task 2 | 00aa530 | feat(02-05): add searchCommanders/searchPartnersFor helpers and CommanderSearch component |
| Task 3 | 5e27905 | feat(02-05): add CommanderPanel and wire into DeckWorkspace replacing placeholder |

## Verification Results

- `npx vitest run src/hooks/useDebouncedValue.test.ts src/components/ColorIdentityChip.test.tsx` — 7/7 passed
- `npx vitest run src/lib/scryfall-client.test.ts src/components/CommanderSearch.test.tsx` — 25/25 passed
- `npx vitest run src/components/CommanderPanel.test.tsx src/components/DeckWorkspace.test.tsx` — 9/9 passed
- `npm test` — 16 files, 131 tests, 0 failures (up from 107 baseline)
- `npx tsc -p tsconfig.app.json --noEmit` — 0 project-source errors (pre-existing node_modules errors unchanged)
- `npx vite build` — 54 modules transformed, exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RTL waitFor hangs with vi.useFakeTimers**
- **Found during:** Task 2 CommanderSearch test implementation
- **Issue:** `waitFor` from `@testing-library/react` polls internally using `setTimeout`, which is captured by `vi.useFakeTimers()`. This caused all tests using `waitFor` to hang until the 5000ms test timeout.
- **Fix:** Replaced all `waitFor(...)` assertions with direct assertions after `act(async () => { vi.advanceTimersByTime(N); await Promise.resolve(); })`. The `await Promise.resolve()` flushes the microtask queue so resolved mock promises settle before the assertion runs.
- **Files modified:** `src/components/CommanderSearch.test.tsx`
- **Commit:** 00aa530

**2. [Rule 1 - Bug] URLSearchParams '+' encoding breaks decodeURIComponent assertions**
- **Found during:** Task 2 scryfall-client test implementation
- **Issue:** `URLSearchParams` encodes spaces as `+` (application/x-www-form-urlencoded form), not `%20`. `decodeURIComponent` does not convert `+` back to spaces, so assertions like `expect(decodeURIComponent(url)).toContain('atraxa voice')` failed.
- **Fix:** Added `.replace(/\+/g, ' ')` before `decodeURIComponent` in all URL assertion helpers: `decodeURIComponent((url as string).replace(/\+/g, ' '))`.
- **Files modified:** `src/lib/scryfall-client.test.ts`
- **Commit:** 00aa530

## Self-Check: PASSED

Files verified present:
- `src/hooks/useDebouncedValue.ts` — exports `useDebouncedValue`
- `src/hooks/useDebouncedValue.test.ts` — 3 tests
- `src/components/ColorIdentityChip.tsx` — exports `ColorIdentityChip`, contains pip classes, "Filtered to: Pick a commander first"
- `src/components/ColorIdentityChip.test.tsx` — 4 tests
- `src/components/CommanderSearch.tsx` — exports `CommanderSearch`, uses `useDebouncedValue`, `areCompatiblePartners`, `AbortController`
- `src/components/CommanderSearch.test.tsx` — 6 tests
- `src/components/CommanderPanel.tsx` — exports `CommanderPanel`, uses `detectPartnerType`, `setCommander`, `clearCommander`, `setPartner`
- `src/components/CommanderPanel.test.tsx` — 5 tests
- `src/components/DeckWorkspace.tsx` — imports `CommanderPanel`, renders `<CommanderPanel deckId={numericId}`
- `src/lib/scryfall-client.ts` — exports `searchCommanders`, `searchPartnersFor`
- Commits b2b7abc, 00aa530, 5e27905 confirmed in git log
