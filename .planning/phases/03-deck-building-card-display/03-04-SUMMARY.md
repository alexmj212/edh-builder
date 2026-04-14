---
phase: 03-deck-building-card-display
plan: 04
subsystem: ui-components
tags: [ui, components, tailwind, accessibility, tdd, wave-4]

# Dependency graph
requires:
  - phase: 03-02
    provides: categorizeCard + CATEGORY_ORDER + isBasicLand
  - phase: 03-01
    provides: DeckCard type, Card type, getImageUri

provides:
  - ViewToggle: segmented control, aria-pressed, bg-accent active state
  - DeckListView: 7-category sticky-header list, lazy thumbnails, keyboard-accessible remove
  - DeckGridView: aspect-ratio grid, animate-pulse skeleton, always-visible remove

affects: [03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure presentational components (props-in / JSX-out, zero store imports)
    - TDD RED→GREEN per component (9 + 9 + 10 = 28 tests written before implementation)
    - StrictMode-wrapped test renders throughout
    - useState(loaded) per GridCell for skeleton-fade — intentional local state, not store
    - categorizeCard(card.type_line) + CATEGORY_ORDER for grouping in DeckListView
    - getImageUri(card, 'small') for CLS-safe thumbnails in both list and grid
    - aria-pressed buttons (not radio/checkbox) for ViewToggle per UI-SPEC
    - opacity-0 group-hover:opacity-100 focus:opacity-100 — focusable-but-hidden remove pattern (list)
    - aspect-[146/204] + animate-pulse skeleton + onLoad fade (grid)

key-files:
  created: []
  modified:
    - src/components/ViewToggle.tsx
    - src/components/ViewToggle.test.tsx
    - src/components/DeckListView.tsx
    - src/components/DeckListView.test.tsx
    - src/components/DeckGridView.tsx
    - src/components/DeckGridView.test.tsx

key-decisions:
  - "ViewToggle uses aria-pressed buttons (not radio inputs) per UI-SPEC segmented control contract"
  - "DeckListView remove button: opacity-0 default (keyboard accessible at all times), opacity-100 on group-hover/focus"
  - "DeckGridView remove button: always visible (no opacity-0), positioned absolute top-2 right-2 per UI-SPEC grid rule"
  - "GridCell carries its own useState(loaded) for skeleton-fade — pure local state, no Zustand"
  - "Cards with missing cardLookup result are silently skipped in both list and grid views (defensive)"

# Metrics
duration: ~4min
completed: 2026-04-14
---

# Phase 03 Plan 04: Presentational Deck Components — ViewToggle, DeckListView, DeckGridView

**Three pure UI components implementing the deck column view: segmented toggle, categorized list with sticky headers, and CLS-safe lazy-load grid — 28 tests, BUILD-05/06/07 UI + UI-02 closed**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-14
- **Completed:** 2026-04-14
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Replaced null scaffolds in all three component files with full UI-SPEC-compliant implementations
- Replaced all `it.todo` stubs with 28 concrete unit tests (9 + 9 + 10) written RED-first
- All TDD gates: RED → GREEN confirmed for each component
- `ViewToggle`: role=group, aria-pressed per button, bg-accent active, focus:ring-accent, border-l divider on Grid button
- `DeckListView`: 7-category CATEGORY_ORDER grouping, sticky headers, w-8 h-8 lazy thumbnails, focus-accessible remove (opacity-0/group-hover:opacity-100/focus:opacity-100)
- `DeckGridView`: grid-cols-3, aspect-[146/204] cells, animate-pulse skeleton fades on img.onLoad, always-visible remove button
- Zero store imports in any component — pure props-in/JSX-out per wave-4 constraint
- Full suite: 260 tests passing (28 new + 232 prior), 0 regressions

## Task Commits

1. **Task 1: ViewToggle segmented control** — `f69a62b` (feat)
2. **Task 2: DeckListView categorized list** — `e9f3abc` (feat)
3. **Task 3: DeckGridView skeleton grid** — `9616abd` (feat)

## Test Counts

| File | Tests |
|------|-------|
| `src/components/ViewToggle.test.tsx` | 9 |
| `src/components/DeckListView.test.tsx` | 9 |
| `src/components/DeckGridView.test.tsx` | 10 |
| **Total new** | **28** |
| **Full suite** | **260** |

### Test breakdown by describe block

| Describe | Tests |
|----------|-------|
| ViewToggle — aria group + aria-pressed | 3 |
| ViewToggle — click handlers | 2 |
| ViewToggle — active/inactive styling | 2 |
| ViewToggle — focus ring + divider | 2 |
| DeckListView — category grouping | 3 |
| DeckListView — row rendering | 3 |
| DeckListView — remove button | 2 |
| DeckListView — defensive skip | 1 |
| DeckGridView — container + cell | 2 |
| DeckGridView — skeleton lifecycle | 2 |
| DeckGridView — image attrs + src | 2 |
| DeckGridView — remove button | 3 |
| DeckGridView — defensive skip | 1 |
| **Total** | **28** |

## Pure Component Verification

Confirmed zero store imports in all three files:

```
rg "from.*store" src/components/ViewToggle.tsx    → no matches
rg "from.*store" src/components/DeckListView.tsx  → no matches
rg "from.*store" src/components/DeckGridView.tsx  → no matches
```

## UI-SPEC Token Compliance

| Token | Component | Usage |
|-------|-----------|-------|
| `bg-accent text-white` | ViewToggle | Active segment |
| `bg-surface text-text-secondary` | ViewToggle | Inactive segment |
| `hover:bg-surface-hover` | ViewToggle, DeckListView | Hover states |
| `focus:ring-2 focus:ring-accent focus:ring-inset` | ViewToggle | Both buttons |
| `border-l border-border` | ViewToggle | Grid button divider |
| `sticky top-0 z-10` | DeckListView | Category headers |
| `text-xs font-semibold text-text-secondary uppercase tracking-wide` | DeckListView | Header label |
| `opacity-0 group-hover:opacity-100 focus:opacity-100` | DeckListView | Remove button visibility |
| `hover:text-danger focus:text-danger` | DeckListView, DeckGridView | Remove button danger tint |
| `aspect-[146/204]` | DeckGridView | CLS-safe cell container |
| `animate-pulse` | DeckGridView | Skeleton before image loads |
| `loading="lazy" decoding="async"` | DeckGridView | UI-02 CLS-safe image loading |
| `absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80` | DeckGridView | Always-visible remove |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `deckCard` destructure parameter in GridCell**
- **Found during:** Task 3 — typecheck (TS6133: 'deckCard' is declared but its value is never read)
- **Issue:** The plan's GridCell signature destructured `deckCard` but the cell body only needed `card` and `onRemove`; `deckCard` was unused inside the function body (the id is captured via closure in the outer `DeckGridView` map)
- **Fix:** Removed `deckCard` from the destructure pattern while keeping it in the type signature (caller still passes it)
- **Files modified:** `src/components/DeckGridView.tsx`
- **Commit:** `9616abd` (same task commit — caught before commit)

## Known Stubs

None — all three components are fully implemented. No hardcoded empty values, placeholder text, or unconnected props. Plan 05 will wire these to the store via `DeckColumn`.

## Threat Flags

None — components use React auto-escaping for `{card.name}` and `aria-label` interpolations (T-03-04-01 mitigated). Image `src` comes from `getImageUri()` which is validated at the Scryfall Zod boundary (T-03-04-02 mitigated). Aspect-ratio containers prevent layout shift (T-03-04-03 mitigated).

## Requirements Closed

| Requirement | Status |
|-------------|--------|
| BUILD-05 | Closed — DeckGridView: grid layout, lazy-load, aspect-ratio skeleton |
| BUILD-06 | Closed — DeckListView: 7 categories, CATEGORY_ORDER, sticky headers, per-bucket count |
| BUILD-07 (UI half) | Closed — ViewToggle: segmented control, aria-pressed, UI-SPEC tokens |
| UI-02 | Closed — loading="lazy" + decoding="async" + aspect-ratio skeleton on all images |

## Self-Check

### Files exist

- `src/components/ViewToggle.tsx`: FOUND
- `src/components/ViewToggle.test.tsx`: FOUND
- `src/components/DeckListView.tsx`: FOUND
- `src/components/DeckListView.test.tsx`: FOUND
- `src/components/DeckGridView.tsx`: FOUND
- `src/components/DeckGridView.test.tsx`: FOUND

### Commits exist

- `f69a62b` (Task 1 ViewToggle): FOUND
- `e9f3abc` (Task 2 DeckListView): FOUND
- `9616abd` (Task 3 DeckGridView): FOUND

## Self-Check: PASSED
