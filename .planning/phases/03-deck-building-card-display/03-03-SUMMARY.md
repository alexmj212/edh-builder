---
phase: 03-deck-building-card-display
plan: 03
subsystem: store
tags: [zustand, dexie, scryfall, tdd, atomic-transactions, wave-3]

# Dependency graph
requires:
  - phase: 03-01
    provides: Dexie v4 schema (deckCards, deckChanges, decks), DeckCard.originalReleaseDate, Deck.viewMode, deck-cards-store scaffold
  - phase: 03-02
    provides: isBasicLand() for singleton bypass

provides:
  - useDeckCardsStore: Zustand store with loadForDeck, addCard, removeCard, setViewMode
  - AddResult union type: { ok: true; deckCardId: number } | { ok: false; reason: 'already-in-deck' | 'storage-error' }
  - DeckCardsState interface (exported for consumer typing)
  - Atomic 3-table mutations: every write covers deckCards + deckChanges + decks.updatedAt
  - resolveOriginalReleaseDate: oracleid: prints lookup, cross-deck dedupe, YYYY-MM-DD formatting

affects: [03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand create<State>()(...) with (set, get) for type inference
    - Dexie db.transaction('rw', [table1, table2, table3], async () => { ... }) for atomic multi-table writes
    - resolveOriginalReleaseDate internal helper: dedupe-first then Scryfall, null on any failure
    - toISOString().slice(0, 10) for YYYY-MM-DD formatting (released_at is Date per Pitfall 1)
    - TDD RED→GREEN cycle: 16 failing tests written first, then implementation

key-files:
  created: []
  modified:
    - src/store/deck-cards-store.ts
    - src/store/deck-cards-store.test.ts

key-decisions:
  - "oracleid: operator hard-coded in resolveOriginalReleaseDate per 03-ORACLEID-PROBE.md — not read at runtime"
  - "Singleton pre-check uses in-memory state.cards (not a DB query) for performance; isBasicLand() bypass allows multiple basic copies"
  - "resolveOriginalReleaseDate called before the transaction — avoids async Scryfall call inside a Dexie transaction (which would extend transaction lifetime)"
  - "Cross-deck dedupe uses db.deckCards.filter(dc => dc.scryfallId === card.id && dc.originalReleaseDate != null).first() — searches all decks"

# Metrics
duration: ~15min
completed: 2026-04-14
---

# Phase 03 Plan 03: deck-cards-store — Zustand Store with Atomic Dexie Writes Summary

**Zustand store with 3-table atomic transactions for add/remove, oracleid: prints lookup with cross-deck dedupe, isBasicLand singleton bypass — 16 tests, BUILD-01/02/03/07/08 + DECK-09 closed**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-14
- **Completed:** 2026-04-14
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments

- Replaced null scaffold in `src/store/deck-cards-store.ts` with a full Zustand store implementation
- Replaced 10 `it.todo` stubs with 16 concrete unit tests (expanded coverage per plan)
- All TDD gates: RED (16 failing) → GREEN (16 passing) confirmed
- `addCard`: singleton check via `isBasicLand`, resolves `originalReleaseDate` pre-transaction, writes all 3 tables atomically
- `removeCard`: deletes deckCards row + writes `deckChanges{type:'remove'}` + touches `decks.updatedAt` atomically
- `setViewMode`: persists Dexie + updates state
- `loadForDeck`: reads deck viewMode (defaults to 'list') + loads deckCards rows
- 232 total unit tests passing, 0 regressions

## Task Commits

1. **Task 1: deck-cards-store implementation + 16 unit tests** — `5da698e` (feat)

## Test Counts

| File | Tests |
|------|-------|
| `src/store/deck-cards-store.test.ts` | 16 |
| **Total (full suite)** | **232** |

### Test breakdown by describe block

| Describe | Tests |
|----------|-------|
| loadForDeck | 2 |
| addCard — singleton & basic-land rules | 3 |
| addCard — originalReleaseDate | 6 |
| addCard — guards against useEffect refactor | 1 |
| addCard — error handling | 1 |
| removeCard | 2 |
| setViewMode | 1 |
| **Total** | **16** |

## Locked Scryfall Operator

Operator used in `resolveOriginalReleaseDate`:

```
oracleid:<card.oracle_id>
```

with `{ unique: 'prints', order: 'released', dir: 'asc' }`.

This matches the probe result in `03-ORACLEID-PROBE.md` which confirmed `oracleid:` as canonical (same operator Scryfall uses inside `prints_search_uri` on every Card object).

## Atomic Transaction Verification

Both `addCard` and `removeCard` use:

```typescript
await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => { ... });
```

Unit tests assert all 3 tables after a single mutation:
- `addCard`: `deckCards.count() === 1`, `deckChanges.count() === 1` with `type === 'add'`, `decks.updatedAt > originalUpdatedAt`
- `removeCard`: `deckCards.count() === 0`, `deckChanges.count() === 1` with `type === 'remove'`, `decks.updatedAt > oldUpdatedAt`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mock SearchResult shape used snake_case `has_more` instead of camelCase `hasMore`**
- **Found during:** GREEN phase — typecheck failed with 8 errors
- **Issue:** The plan's mock snippet used `has_more: false` which is the Scryfall wire-format name; the wrapper's `SearchResult` interface uses `hasMore` (camelCase)
- **Fix:** Replaced all `has_more: false, hasMore: false` occurrences with `hasMore: false` in the test file
- **Files modified:** `src/store/deck-cards-store.test.ts`
- **Commit:** `5da698e` (same task commit — caught before commit)

### Store shape deviations from scaffold

None — the implementation exports `useDeckCardsStore`, `DeckCardsState`, and `AddResult` exactly as the scaffold declared them. The `create<DeckCardsState>()((set, get) => ...)` pattern matches the scaffold's interface declaration.

## Requirements Closed

| Requirement | Status |
|-------------|--------|
| BUILD-01 | Closed — addCard writes 3 tables atomically |
| BUILD-02 | Closed — removeCard deletes deckCards + writes deckChanges + touches updatedAt atomically |
| BUILD-03 | Closed — duplicate non-basic returns `already-in-deck` without DB touch |
| BUILD-04 | Closed — isBasicLand bypass allows multiple basic lands |
| BUILD-07 | Closed — setViewMode writes Dexie + state |
| BUILD-08 | Closed — originalReleaseDate resolved via oracleid:, formatted YYYY-MM-DD, null on failure, cross-deck deduped |
| DECK-09 | Closed — every add + remove produces exactly one deckChanges row |

## Known Stubs

None — this plan replaced the only stub in `deck-cards-store.ts` (`null as unknown as DeckCardsState`). No new stubs introduced.

## Threat Flags

None — no new network endpoints or schema changes beyond those already in the plan's threat model. All T-03-03-0x mitigations are implemented:
- T-03-03-01 (click-spam): cross-deck dedupe short-circuits + exactly-1-call-per-addCard test
- T-03-03-02 (corrupt Date): `released instanceof Date && !isNaN(released.getTime())` guard before formatting
- T-03-03-04 (quota exhaustion): storage-error path returns `{ ok: false, reason: 'storage-error' }`, no partial writes possible (atomic transaction)

## Self-Check

### Files exist

- `src/store/deck-cards-store.ts`: FOUND
- `src/store/deck-cards-store.test.ts`: FOUND

### Commits exist

- `5da698e` (Task 1): FOUND

## Self-Check: PASSED
