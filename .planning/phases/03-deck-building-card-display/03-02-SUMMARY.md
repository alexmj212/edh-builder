---
phase: 03-deck-building-card-display
plan: 02
subsystem: pure-lib
tags: [pure-lib, categorizer, basic-lands, tdd, wave-2]

# Dependency graph
requires:
  - phase: 03-01
    provides: Scaffold files (basic-lands.ts, card-categorizer.ts) with it.todo stubs

provides:
  - isBasicLand(card) with 12-name whitelist + type_line regex fallback (BUILD-04)
  - BASIC_LAND_NAMES const (12 canonical basic land names)
  - categorizeCard(typeLine) → Category with Land-wins then Creature-wins precedence (BUILD-06)
  - CATEGORY_ORDER locked as display order for DeckListView

affects: [03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED→GREEN cycle with it.each for parameterized whitelist coverage
    - Word-boundary regex (\b) for type_line category matching to avoid substring false positives
    - BASIC_LAND_NAMES as const for exhaustive tuple type inference

key-files:
  created: []
  modified:
    - src/lib/basic-lands.ts
    - src/lib/basic-lands.test.ts
    - src/lib/card-categorizer.ts
    - src/lib/card-categorizer.test.ts

key-decisions:
  - "isBasicLand checks name whitelist first, then /^Basic\\s+(Snow\\s+)?Land\\b/i on type_line — Dryad Arbor correctly returns false because its type_line starts with Land not Basic"
  - "categorizeCard uses toLowerCase() + \\b word boundaries, Land branch at line 9 (before Creature at line 10) — Land-wins precedence is syntactically provable, not just test-provable"
  - "No battle/dungeon/saga future-proofing added — unknown types fall back to Creatures as documented; can be extended when needed"

# Metrics
duration: ~2min
completed: 2026-04-14
---

# Phase 03 Plan 02: isBasicLand and categorizeCard — Pure Library Modules Summary

**12-name whitelist + type_line regex for basic land detection; 7-bucket Land-wins categorizer with word-boundary regex — 35 tests locked, BUILD-04 and BUILD-06 closed**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-14
- **Completed:** 2026-04-14
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Replaced all `it.todo` stubs in both test files with concrete assertions
- `isBasicLand`: name whitelist check (12 entries as const) + `/^Basic\s+(Snow\s+)?Land\b/i` type_line fallback — 20 tests green
- `categorizeCard`: 7-branch if-chain with `\b` word boundaries, case-insensitive, Land branch first — 15 tests green
- 35 combined unit tests, all passing; typecheck exits 0

## Task Commits

1. **Task 1: isBasicLand with 12-type whitelist + type_line regex** — `4b9f9f6` (feat)
2. **Task 2: categorizeCard with Land > Creature > ... precedence** — `4e9c8b5` (feat)

## Test Counts

| File | Tests |
|------|-------|
| `src/lib/basic-lands.test.ts` | 20 (12 from `it.each` + 2 type_line regex + 4 negative cases + BASIC_LAND_NAMES shape) |
| `src/lib/card-categorizer.test.ts` | 15 (CATEGORY_ORDER shape + 14 precedence cases including fallback and case-insensitive) |
| **Total** | **35** |

## Edge Cases Covered

### basic-lands

| Case | Input | Expected | Why |
|------|-------|----------|-----|
| All 12 canonical names | `it.each(BASIC_LAND_NAMES)` | `true` | Whitelist hit |
| Alt-art token | name=`Some Custom Plains Token`, type_line=`Basic Land — Plains` | `true` | Regex hit |
| Snow type_line | type_line=`Basic Snow Land — Snow-Covered Plains` | `true` | Regex matches `Basic Snow Land` |
| Command Tower | type_line=`Land` | `false` | Neither whitelist nor regex |
| Exotic Orchard | type_line=`Land` | `false` | Neither whitelist nor regex |
| Dryad Arbor | type_line=`Land Creature — Forest Dryad` | `false` | Starts with `Land` not `Basic` |
| Sol Ring | type_line=`Artifact` | `false` | Not a land at all |
| Lightning Bolt | type_line=`Instant` | `false` | Not a land at all |

### card-categorizer

| Case | Input | Expected | Reason |
|------|-------|----------|--------|
| Pure land | `Basic Land — Forest` | Lands | Land branch first |
| Creature-land (manland) | `Land Creature — Forest Dryad` | Lands | Land wins over Creature |
| Artifact Creature | `Artifact Creature — Golem` | Creatures | Creature beats Artifact |
| Enchantment Creature | `Enchantment Creature — God` | Creatures | Creature beats Enchantment |
| Pure Creature | `Creature — Human Wizard` | Creatures | Creature match |
| Legendary Creature | `Legendary Creature — Human Soldier` | Creatures | Word boundary avoids false positive on `Legendary` |
| Legendary Planeswalker | `Legendary Planeswalker — Jace` | Planeswalkers | Planeswalker match |
| Instant | `Instant` | Instants | Instant match |
| Sorcery | `Sorcery` | Sorceries | Sorcery match |
| Tribal Instant | `Tribal Instant — Elf` | Instants | Instant match |
| Pure Artifact | `Artifact — Equipment` | Artifacts | Artifact match |
| Pure Enchantment | `Enchantment — Aura` | Enchantments | Enchantment match |
| Case-insensitive | `BASIC LAND — FOREST` | Lands | toLowerCase() |
| Unknown type | `Scheme` | Creatures | Fallback |

## Decisions Made

- **No battle/dungeon/saga future-proofing:** Unknown type lines fall back to `'Creatures'` as documented. Adding `\bbattle\b` or `\bdungeon\b` branches was considered but deferred — the fallback is safe and explicit, and the test covers it with the `Scheme` case.
- **Land branch syntactically before Creature:** Line 9 vs. line 10 in `card-categorizer.ts` — Land-wins is enforced at the implementation level, not just by tests. Acceptance criteria verified via `grep -n`.
- **as const on BASIC_LAND_NAMES:** Allows `it.each(BASIC_LAND_NAMES)` to iterate the tuple as a typed array and provides downstream exhaustiveness checking if the type is used in switch statements.

## Deviations from Plan

None — plan executed exactly as written. Both implementations match the prescriptive code blocks in the plan verbatim.

## Known Stubs

None — this plan resolved the two stubs from 03-01 (`isBasicLand` returning `false`, `categorizeCard` returning `'Creatures'`). No new stubs introduced.

## Threat Flags

None — pure functions with no I/O. Malformed `type_line` at worst hits the `'Creatures'` fallback; no crash, no disclosure.

## Next Phase Readiness

- `isBasicLand` is callable from `deck-cards-store.ts` (Plan 03-03) for singleton pre-check
- `categorizeCard` and `CATEGORY_ORDER` are callable from `DeckListView.tsx` (Plan 03-04) for bucket derivation
- Both modules export their names exactly as Plan 03-03 and Plan 03-04 import them

## Self-Check

### Files exist

- `src/lib/basic-lands.ts`: FOUND
- `src/lib/basic-lands.test.ts`: FOUND
- `src/lib/card-categorizer.ts`: FOUND
- `src/lib/card-categorizer.test.ts`: FOUND

### Commits exist

- `4b9f9f6` (Task 1): FOUND
- `4e9c8b5` (Task 2): FOUND

## Self-Check: PASSED
