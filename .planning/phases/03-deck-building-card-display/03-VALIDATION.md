---
phase: 3
slug: deck-building-card-display
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-13
updated: 2026-04-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/component) + Playwright (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run test:e2e` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run <changed-file-glob>`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite (unit + e2e) must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

*Each task's verify block maps to one automated command — or a Wave 0 scaffold that makes it runnable.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01.1 | 03-01 | 1 | BUILD-08 | T-03-01 | Additive schema migration preserves v3 rows | Unit | `npm run test -- --run src/lib/db.test.ts` | Wave 0 creates | ⬜ |
| 01.2 | 03-01 | 1 | (scaffold) | — | File stubs exist for every Wave 2-5 target | Existence | `npm run test -- --run` (scaffolds compile, `.todo`/`.skip` entries) | Wave 0 creates | ⬜ |
| 01.3 | 03-01 | 1 | BUILD-07 | T-03-02 | Oracleid operator verified against live API | Manual probe | `cat .planning/phases/03-deck-building-card-display/03-ORACLEID-PROBE.md` | Wave 0 creates | ⬜ |
| 02.1 | 03-02 | 2 | BUILD-04 | — | Basic-land whitelist enforced | Unit TDD | `npm run test -- --run src/lib/basic-lands.test.ts` | 01.2 scaffolds | ⬜ |
| 02.2 | 03-02 | 2 | BUILD-06 | — | Categorizer precedence (Land>Creature>Planeswalker>Instant>Sorcery>Artifact>Enchantment) | Unit TDD | `npm run test -- --run src/lib/card-categorizer.test.ts` | 01.2 scaffolds | ⬜ |
| 03.1 | 03-03 | 3 | BUILD-01, 02, 03, 07, 08, DECK-09 | T-03-03, T-03-04 | Atomic deckCards+deckChanges+decks.updatedAt tx; singleton via isBasicLand bypass; StrictMode single-fetch | Unit + integration | `npm run test -- --run src/store/deck-cards-store.test.ts` | 01.2 scaffolds | ⬜ |
| 04.1 | 03-04 | 4 | BUILD-05 | — | aria-pressed segmented view toggle | Component | `npm run test -- --run src/components/ViewToggle.test.tsx` | 01.2 scaffolds | ⬜ |
| 04.2 | 03-04 | 4 | BUILD-06, BUILD-07, UI-02 | — | 7-category grouping, sticky headers, focus-accessible remove | Component | `npm run test -- --run src/components/DeckListView.test.tsx` | 01.2 scaffolds | ⬜ |
| 04.3 | 03-04 | 4 | BUILD-05, UI-02 | — | Lazy-load skeleton + aspect-[146/204] CLS containment | Component | `npm run test -- --run src/components/DeckGridView.test.tsx` | 01.2 scaffolds | ⬜ |
| 05.1 | 03-05 | 5 | BUILD-01, BUILD-04 | T-03-04 | (+) disabled when isInDeck non-basic; loading state during add | Component | `npm run test -- --run src/components/CardResultCell.test.tsx` | Existing + extended | ⬜ |
| 05.2 | 03-05 | 5 | BUILD-01..08, UI-04 | — | DeckColumn composition + 60/40 flex split at lg | Component | `npm run test -- --run src/components/DeckColumn.test.tsx src/components/DeckWorkspace.test.tsx` | 01.2 scaffolds | ⬜ |
| 05.3 | 03-05 | 5 | BUILD-01..08, DECK-09, UI-02, UI-04 | T-03-03, T-03-04 | End-to-end: add/remove, duplicate blocking, view toggle persists, deckChanges audit | E2E | `npm run test:e2e -- e2e/specs/13-deck-building.spec.ts` | 01.2 scaffolds | ⬜ |
| 05.4 | 03-05 | 5 | UI-02, UI-04 | — | Human verifies commander prominence, lazy-load behavior, 60/40 split visual | Manual | Checkpoint resume-signal | n/a | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Populated from RESEARCH.md Wave 0 enumeration. All scaffolds created in Plan 03-01 Tasks 01.1–01.3:

- [x] Dexie v4 additive migration + v3→v4 round-trip test (`src/lib/db.test.ts`)
- [x] Test scaffolds with `it.todo` / `test.skip` for:
  - `src/lib/basic-lands.test.ts`
  - `src/lib/card-categorizer.test.ts`
  - `src/store/deck-cards-store.test.ts`
  - `src/components/ViewToggle.test.tsx`
  - `src/components/DeckListView.test.tsx`
  - `src/components/DeckGridView.test.tsx`
  - `src/components/DeckColumn.test.tsx`
  - `src/components/DeckWorkspace.test.tsx` (extension)
  - `src/components/CardResultCell.test.tsx` (extension)
  - `e2e/specs/13-deck-building.spec.ts`
- [x] Source stubs so imports resolve during parallel Wave 2-4 work:
  - `src/lib/basic-lands.ts`
  - `src/lib/card-categorizer.ts`
  - `src/store/deck-cards-store.ts`
  - `src/components/ViewToggle.tsx`
  - `src/components/DeckListView.tsx`
  - `src/components/DeckGridView.tsx`
  - `src/components/DeckColumn.tsx`
- [x] Manual Scryfall `oracleid:` vs `oracle_id:` probe → `03-ORACLEID-PROBE.md`
- [x] Playwright fixtures: `alice-deck.json`, `deck-with-basics.json`, `prints-response.json`
- [x] `e2e/helpers/stubScryfall.ts` extended for `/cards/search?q=oracle_id:*+unique:prints`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Commander art_crop visual prominence | UI-04 | Subjective aesthetic quality | Human verifier inspects deck view at ≥1024px; confirms art is "prominent" per UI-SPEC |
| 60/40 split at ≥1024px / vertical stack below | UI-04 | Visual layout judgement | Checkpoint 05.4 resize browser across breakpoints |
| Scryfall `oracle_id:` operator live verification | BUILD-07 | Stubbed tests can mask silently-dropped keywords | Plan 01 Task 3 human-action probe against api.scryfall.com |
| Lazy-load CLS smoothness | UI-02 | Visual jank hard to measure automatedly | Checkpoint 05.4 scroll grid view observing skeletons → images |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s (vitest + e2e on changed specs)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner)
