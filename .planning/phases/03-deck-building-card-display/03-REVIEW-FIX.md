---
phase: 03-deck-building-card-display
fixed_at: 2026-04-14T22:04:30Z
review_path: .planning/phases/03-deck-building-card-display/03-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-14T22:04:30Z
**Source review:** .planning/phases/03-deck-building-card-display/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01 through WR-04; Info findings out of scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: `removeCard` transaction errors are unhandled

**Files modified:** `src/store/deck-cards-store.ts`
**Commit:** 72b4644
**Applied fix:** Wrapped the `db.transaction(...)` call in `try/catch` that sets `error` state on failure, mirroring `addCard` exactly. The `set()` call to update in-memory cards is now inside the `try` block (after the transaction), so memory and DB stay consistent on both success and failure paths.

### WR-02: Stale closure in DeckColumn fetch-missing effect

**Files modified:** `src/components/DeckColumn.tsx`
**Commit:** 2ce7c4e
**Applied fix:** Replaced the `useCardSearchStore.getState()` one-shot call (inside an effect that only ran when `cards` changed) with a reactive subscription: `const searchResults = useCardSearchStore(s => s.results)`. The seed effect now depends on `[searchResults]` and fires whenever new search results arrive, not just when cards change. Also removed the `eslint-disable-next-line` suppression comment and added `lookupMap` to the fetch-missing effect's deps array so it correctly reflects the current map state. All 12 DeckColumn unit tests pass.

### WR-03: `aria-pressed` misused on read-only `<span>` pips

**Files modified:** `src/components/CardSearchSection.tsx`
**Commit:** b90b86e
**Applied fix:** Removed `aria-pressed` from all five pip `<span>` elements. Kept `aria-label` with descriptive text distinguishing active ("in commander identity") from inactive ("not in commander identity") pips, which provides equivalent screen-reader information without the invalid ARIA state attribute.

### WR-04: Dead `deckCard` prop on `GridCell`

**Files modified:** `src/components/DeckGridView.tsx`
**Commit:** 030f8c1
**Applied fix:** Removed `deckCard: DeckCard` from the `GridCell` inline prop type. Removed `deckCard={dc}` from the call site in `DeckGridView`. The `DeckCard` import is retained because `DeckGridViewProps.cards: DeckCard[]` still uses it. TypeScript typecheck and all 281 unit tests pass.

## Skipped Issues

None.

---

**Post-fix test results:**
- Unit tests: 281 passed / 0 failed (26 test files)
- E2E tests: 27 passed / 0 failed

**Re-review (iteration 2):** No new Critical or Warning findings introduced by the fixes. The `[cards, lookupMap]` dependency combination in the fetch-missing effect is loop-safe because the `missing.length === 0` guard exits before any state update when all cards are already mapped. Status: clean.

---

_Fixed: 2026-04-14T22:04:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
