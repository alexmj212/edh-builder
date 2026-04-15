---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 2
status: Executing Phase 03.1
last_updated: "2026-04-15T03:24:21.787Z"
progress:
  total_phases: 11
  completed_phases: 6
  total_plans: 30
  completed_plans: 27
  percent: 90
---

# Project State: EDH Deck Builder

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.
**Current focus:** Phase 03.1 — ui-polish-phase-3-follow-ups

## Current Status

- **Milestone:** v1.0 — Core Deck Builder
- **Active phase:** 03-deck-building-card-display (COMPLETE — human-verify approved)
- **Current Plan:** 2
- **Phases planned:** 5 (Phase 03 closed)
- **Requirements:** 37 v1, 10 v2

## Completed Phases

(Phase 01 complete)
(Phase 03 complete — human-verify approved 2026-04-14)

## Completed Plans (Phase 02)

| Plan | Name | Completed |
|------|------|-----------|
| 02-01 | Wave 0 Foundation (Dexie v2, CachedCard, test scaffolds) | 2026-04-12 |
| 02-02 | Wave 1 Library Modules (partner-detection, scryfall-client, card-cache) | 2026-04-12 |
| 02-03 | Wave 2 Zustand Stores (commander-store, card-search-store) | 2026-04-12 |
| 02-04 | Wave 3 Routing & DeckWorkspace Shell | 2026-04-12 |
| 02-05 | Wave 4 Commander Selection UX | 2026-04-12 |

## Completed Plans (Phase 03)

| Plan | Name | Completed |
|------|------|-----------|
| 03-01 | Wave 1: Dexie v4 migration + type extensions + typed scaffolds + oracleid probe | 2026-04-14 |
| 03-02 | Wave 2: isBasicLand + categorizeCard pure libs | 2026-04-14 |
| 03-03 | Wave 3: deck-cards-store (addCard, removeCard, singleton enforcement, deckChanges, originalReleaseDate) | 2026-04-14 |
| 03-04 | Wave 4: ViewToggle, DeckListView, DeckGridView UI components | 2026-04-14 |
| 03-05 | Wave 5: Integration — CardResultCell (+), DeckColumn, DeckWorkspace 60/40, Playwright spec 13-deck-building.spec.ts | 2026-04-14 |

## Decisions

- react-router-dom@7 installed via canonical npm name — resolved to 7.14.0
- Dexie v2 migration is additive-only: no upgrade() callback needed
- CachedCard uses string primary key (oracle_id) matching Scryfall oracle_id UUID format
- Wave 0 scaffolds use it.todo exclusively so vitest exits 0 in pending state
- vi.useFakeTimers({ toFake: ['Date'] }) used in card-cache tests to avoid Dexie Promise hang
- mockFetch uses mockImplementation factory so each call gets a fresh Response body
- noUnusedLocals: unused test imports removed (isValidBackground, fetchCardById, buildCommanderSearchQuery)
- [Phase 02]: Partner-clearing logic checks detectPartnerType(newPrimary).kind === 'none' first, then areCompatiblePartners — two-pass covers incompatible cross-kind pairs
- [Phase 02]: setPartner has no Dexie write in Phase 2 — partner slot is UI-only state
- [Phase 02]: card-search-store uses module-level AbortController (not Zustand state) to avoid re-renders on abort/replace
- [Phase 02]: loadForDeck fetches via fetchCardById (Scryfall printing id) not getCard (oracle_id) — deck row stores card id not oracle_id
- [Phase 02]: react-router-dom was in package.json but not installed; npm install resolved it
- [Phase 02]: DeckList onSelect calls both setActiveDeck and navigate to preserve active-deck highlight while routing
- [Phase 02]: parseInt(id ?? '', 10) with NaN guard rejects non-numeric URLs (T-02-04-A mitigation)
- [Phase 02]: RTL waitFor hangs with vi.useFakeTimers — use act+advanceTimersByTime+Promise.resolve pattern instead
- [Phase 02]: URLSearchParams encodes spaces as '+' not '%20' — test URL assertions need .replace(/\+/g, ' ') before decodeURIComponent
- [Phase 02]: CommanderSearch fires searchCommanders('') on mount to show EDHREC default list without typing
- [Phase 02]: Partner compatibility gate in CommanderSearch.handleSelect is defense-in-depth (searchPartnersFor already pre-filters)
- [Phase 02.1]: Dexie v3 migration is additive-only (no upgrade callback): v2 rows read back with partner fields as undefined
- [Phase 02.1]: Partner fields typed string | null | undefined to distinguish never-set (legacy), explicitly-cleared (null), and populated states
- [Phase 02.1]: setPartner/clearPartner arity expanded to (deckId, card)/(deckId) returning Promise<void>; method names preserved
- [Phase 02.1]: setCommander auto-clear merges partner nulling into the single db.decks.update call (one atomic write, no observer race)
- [Phase 02.1]: loadForDeck wraps partner fetchCardById in inner try/catch — transient Scryfall failure degrades to partnerCommander:null instead of aborting primary load
- [Phase 02.1]: [Phase 02.1] CommanderPanel partner round-trip regression coverage: Remove-partner UI persists null partner fields to Dexie; deck row with partnerCommanderId rehydrates FullCard on remount — closes Phase 02 human-verify gap
- [Phase 02.2]: chromium-only in v1 for speed; tsconfig.e2e.json stands alone outside tsconfig references; allowImportingTsExtensions overridden to false for Playwright runner; no postinstall hook for browser download
- [Phase 02.2]: satisfies ScryfallCard.Any not viable for JSON imports (string literal widening); FixtureCardShape intermediate type used; tsconfig.e2e.json disables verbatimModuleSyntax+erasableSyntaxOnly for @scryfall/api-types .ts source compatibility
- [Phase 02.2-03]: No deviations from plan — cold-start smoke spec written exactly as canonical RESEARCH.md skeleton; installConsoleGate before page.goto ordering is enforced by acceptance criteria grep
- [Phase 02.2]: [Phase 02.2-04]: createDeck helper clicks h3 directly (bubbles to DeckCardItem onClick); IDB assertions use raw indexedDB.open() inside page.evaluate() against 'EDHBuilder' DB; null partner fields use toBeNull() per Phase 02.1 explicit-null decision
- [Phase 02.2]: [Phase 02.2-05]: CI workflow uses pull_request (not pull_request_target) + permissions: contents: read — T-17/T-18 security mitigations
- [Phase 02.2]: [Phase 02.2-05]: build script changed to 'vite build' only; tsc -b separated into typecheck script — @scryfall/api-types .ts source incompatibility with erasableSyntaxOnly (pre-existing since Phase 02)
- [Phase 02.2]: [Phase 02.2-05]: Vitest test.exclude=['e2e/**'] added — Playwright specs were being collected by Vitest runner, causing test() context conflict
- [Phase 02.3]: D-06/D-07/D-08/D-09 verified PASS against live api.scryfall.com; scryfall-api@^4.0.5 installed alongside @scryfall/api-types
- [Phase 02.3]: D-10 accepted gap: library ships zero query builders; all three stay in src/lib/scryfall-queries.ts (D-03 fallback)
- [Phase 02.3]: D-08 resolution: promise-race wrapper (D-04 option 3); single abortable() helper in src/lib/scryfall.ts
- [Phase 02.3]: Build script restoration (tsc -b && vite build) deferred to plan 02.3-05 after scryfall-client.ts deletion
- [Phase 02.3]: Plan 02.3-02: wrapper src/lib/scryfall.ts is now sole 'scryfall-api' boundary; abortable<T> funnel for all exports; Zod array validation at .next()/byId boundary
- [Phase 02.3]: Plan 02.3-02: card-search-store pagination flipped from nextPageUrl:string to searchHandle:SearchResult (opaque MagicPageResult handle)
- [Phase 02.3]: Plan 02.3-02: card-cache.ts uses CachedCard['cardJson'] indexed-type cast instead of importing @scryfall/api-types (retype deferred to 02.3-03)
- [Phase 02.3]: Plan 02.3-03: retype sweep complete — Card type is the single app-wide card surface; 16 as-unknown-as casts + 5 in-guards + 4 as-never bridges all eliminated; only scryfall-client.ts+.test.ts retain legacy ScryfallCard refs (deleted in 02.3-05)
- [Phase 02.3]: Plan 02.3-03: test fakeCards must seed keywords/color_identity defaults for Card fixtures — required GameplayCard fields mean direct-access call sites crash on partial mocks
- [Phase 02.3]: Plan 02.3-03: CardSearchSection's buildSearchQuery import redirected from scryfall-client to scryfall-queries (leftover from 02.3-02); app code now has zero non-wrapper scryfall-client imports — 02.3-05 deletion unblocked
- [Phase 02.3]: Plan 02.3-04: Split Task 1 into tsconfig change + test-file bug sweep + tsconfig.app.json exclude for scryfall-client.{ts,test.ts} — user-approved scope expansion (Option 1) at decision checkpoint; exclude must be removed by 02.3-05
- [Phase 02.3]: Plan 02.3-04: FixtureCard = Pick<Card,...> with pickKeys drift guard (not value-level satisfies, which JSON literal widening defeats); single asCard helper carries the one as-unknown-as-Card escape hatch
- [Phase 02.3]: Plan 02.3-04: CI typecheck step added to e2e.yml between npm ci and playwright install — closes WR-01 CI half; build-script restoration deferred to 02.3-05
- [Phase 02.3]: Plan 02.3-04: vitest runner's transpile-only mode silently missed 12 test-file type errors introduced by 02.3-02/03 — CI typecheck step now gates future drift
- [Phase 02.3]: Plan 02.3-05: Test-first ordering — regression spec added + confirmed green against pre-deletion code, then deleted old client and re-ran (regression gate passed). SRCH-01..07 E2E coverage landed via e2e/specs/07-card-search.spec.ts with Load-more click + grid-growth assertion
- [Phase 02.3]: Plan 02.3-05: WR-01 fully closed — build script restored to 'tsc -b && vite build' after scryfall-client.ts deletion dropped @scryfall/api-types from the tsconfig.app.json include scope; CI typecheck step in place from 02.3-04. Phase 02.3 shipped
- [Phase 03]: oracleid: is the canonical Scryfall search operator for oracle-id prints lookup — confirmed by prints_search_uri field on every Card object; Sol Ring oracle_id corrected from plan's value to 6ad8011d-3471-4369-9d68-b264cc027487
- [Phase 03]: isBasicLand: name whitelist check + /^Basic\s+(Snow\s+)?Land\b/i regex; Dryad Arbor returns false because type_line starts with Land not Basic
- [Phase 03]: categorizeCard: Land branch at line 9 before Creature at line 10 — Land-wins precedence syntactically provable
- [Phase 03]: resolveOriginalReleaseDate called before Dexie transaction to avoid extending transaction lifetime with async Scryfall I/O
- [Phase 03]: Singleton pre-check uses in-memory state.cards (not DB query) for performance; isBasicLand() exemption allows multiple basics
- [Phase 03]: ViewToggle uses aria-pressed buttons (not radio inputs) per UI-SPEC segmented control contract
- [Phase 03]: DeckListView remove: opacity-0 default (keyboard accessible), opacity-100 on group-hover/focus
- [Phase 03]: DeckGridView remove: always visible (no opacity-0), absolute top-2 right-2 per UI-SPEC grid rule
- [Phase 03]: GridCell carries own useState(loaded) for skeleton-fade — pure local state, no Zustand
- [Phase 03-05]: CommanderPanel always rendered at top of DeckColumn regardless of primaryCommander — enables commander search input to be accessible at all times (fixed 14 pre-existing e2e failures as a side effect)
- [Phase 03-05]: CardResultCell props isInDeck/isAdding/onAdd kept pure (no store subscription) — CardSearchSection is the composing parent
- [Phase 03-05]: addCardToDeck helper waits for card text in deck-column (not .or() which caused strict-mode violations)
- [Phase 03-05]: DeckWorkspace.test.tsx beforeEach stubs deck-cards-store.loadForDeck to prevent DatabaseClosedError from async Dexie access after db.delete()
- [Phase 03.1]: Plan 03.1-01: Reused ViewToggle focus-ring pattern (non-inset variant + rounded) for standalone text buttons in CommanderPanel FullCard — closes UI-REVIEW #1 WCAG 2.1 2.4.7

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02 | 01 | 4 min | 3/3 | 12 |
| 02 | 02 | 15 min | 3/3 | 6 |
| 02 | 03 | 3 min | 2/2 | 4 |
| 02 | 04 | 3 min | 2/2 | 6 |
| 02 | 05 | 6 min | 3/3 | 11 |
| 02.1 | 01 | 1 min | 2/2 | 3 |
| 02.1 | 02 | 2 min | 2/2 | 3 |
| 02.1 | 03 | ~2 min | 1/1 | 1 |
| Phase 02.2 P01 | 3 min | 4 tasks | 7 files |
| Phase 02.2 P02 | 15 | 3 tasks | 10 files |
| Phase 02.2 P03 | 1 | 1 tasks | 1 files |
| Phase 02.2 P04 | 3 | 3 tasks | 7 files |
| Phase 02.2 P05 | 9 | 3 tasks | 5 files |
| Phase 02.3 P01 | 3 min | 3/3 tasks | 3 files |
| Phase 02.3 P02 | 6 min | 3/3 tasks | 10 files |
| Phase 02.3 P03 | 5 min | 2/2 tasks | 15 files |
| Phase 02.3 P04 | 6 min | 3/3 tasks | 7 files |
| Phase 02.3 P05 | 6 min | 3/3 tasks | 6 files |
| Phase 03 P01 | 30min | 3 tasks | 20 files |
| Phase 03 P02 | 2min | 2 tasks | 4 files |
| Phase 03 P03-03 | 15min | 1 tasks | 2 files |
| Phase 03 P04 | 4min | 3 tasks | 6 files |
| Phase 03 P05 | ~30min | 3 tasks | 14 files |
| Phase 03.1 P01 | 3min | 2 tasks | 2 files |

## Session Log

| Date | Action |
|------|--------|
| 2026-04-11 | Project initialized — questioning, research, PROJECT.md, REQUIREMENTS.md, ROADMAP.md created |
| 2026-04-12 | Completed 02-01: Wave 0 Foundation |
| 2026-04-12 | Completed 02-02: Wave 1 Library Modules (partner-detection, scryfall-client, card-cache) |
| 2026-04-12 | Completed 02-03: Wave 2 Zustand Stores (commander-store, card-search-store) |
| 2026-04-12 | Completed 02-04: Wave 3 Routing & DeckWorkspace Shell |
| 2026-04-12 | Completed 02-05: Wave 4 Commander Selection UX (CommanderPanel, CommanderSearch, ColorIdentityChip, useDebouncedValue) |
| 2026-04-12 | Phase 02 human-verify checkpoint found gap: partner not persisted to Dexie — inserted Phase 02.1 |
| 2026-04-12 | Completed 02.1-01: Deck type + Dexie v3 additive schema + migration tests |
| 2026-04-12 | Completed 02.1-02: commander-store partner persistence (setPartner/clearPartner Dexie writes, loadForDeck hydration, reload round-trip test) |
| 2026-04-12 | Completed 02.1-03: CommanderPanel partner round-trip regression tests — Phase 02.1 COMPLETE, CMDR-04 shipped |
| 2026-04-12 | Completed 02.2-01 through 02.2-05: Playwright harness, helpers, smoke spec, backfill specs, CI workflow, standing rule — Phase 02.2 COMPLETE, TEST-01 closed |
| 2026-04-12 | Completed 02.3-01: Spike PASS — scryfall-api@^4.0.5 installed, live probe against api.scryfall.com ratified D-06/D-07/D-08/D-09; D-10 accepted gap |
| 2026-04-12 | Completed 02.3-02: Wrapper (src/lib/scryfall.ts) + query-builders (src/lib/scryfall-queries.ts) + migrated card-search-store/commander-store/card-cache to the new boundary; 115/115 tests green |
| 2026-04-12 | Completed 02.3-03: Type sweep — ScryfallCard swept from 15 files; 16 as-unknown-as + 5 in-guards + 4 as-never bridges eliminated; partner-detection accepts Card directly; 189/189 tests green |
| 2026-04-12 | Completed 02.3-04: tsconfig.e2e.json overrides dropped, stubScryfall migrated to Pick<Card> + asCard helper, CI typecheck step added; user-approved scope expansion fixed 12 latent test-file TS errors + added tsconfig.app.json exclude for scryfall-client (02.3-05 must remove) |
| 2026-04-12 | Completed 02.3-05: Phase 02.3 CLOSED — added e2e/specs/07-card-search.spec.ts with Load-more click + grid-growth (SRCH-07 E2E); deleted scryfall-client.ts + .test.ts; uninstalled @scryfall/api-types; removed tsconfig.app.json exclude bridge; restored 'tsc -b && vite build'; WR-01 retired; 170 unit + 8 e2e green post-deletion |
| 2026-04-13 | Housekeeping sweep: closed BOOK-1 (retroactive 02-06-SUMMARY.md + tick ROADMAP; f2ace20) and FLAKE-1 (consoleGate accepts @vite/client as valid location — Vite dev wraps console.warn, breaking the storage.ts pin; 3e37665). 176 unit + 15 e2e green. FU-2/3/4 remain as nice-to-haves. |
| 2026-04-14 | Completed 03-01: Dexie v4 additive migration + 16 Wave 2-4 typed scaffolds + live Scryfall probe; oracleid: operator locked as canonical prints-lookup operator; BUILD-08 requirement ticked |
| 2026-04-14 | Completed 03-02: isBasicLand + categorizeCard pure libs |
| 2026-04-14 | Completed 03-03: deck-cards-store addCard/removeCard/singleton enforcement/deckChanges/originalReleaseDate |
| 2026-04-14 | Completed 03-04: ViewToggle (aria-pressed), DeckListView (7 categories), DeckGridView (aspect-[146/204] skeletons) |
| 2026-04-14 | Completed 03-05: Integration — CardResultCell (+) wired, DeckColumn composed, DeckWorkspace 60/40, Playwright spec 13-deck-building.spec.ts (12 tests). Fixed 14 pre-existing e2e failures as side-effect. 281 unit + 27 e2e passing. Human-verify APPROVED. Phase 03 COMPLETE. |
| 2026-04-15 | Completed 03.1-01: CommanderPanel FullCard Flip/Change commander/Remove partner buttons now carry focus:outline-none focus:ring-2 focus:ring-accent rounded — closes UI-REVIEW #1 (WCAG 2.1 2.4.7). 284 unit tests green (281 baseline + 3 regression). |

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 02: Partner commander Dexie persistence — survive reload and deck re-entry (URGENT, gap found during Phase 02 human-verify checkpoint)
- Phase 02.2 inserted after Phase 02: Playwright E2E infrastructure + Phase 02.1 backfill — stands up e2e harness so Claude can self-verify interactive UAT, retroactively covers 02.1 browser-side flows; establishes standing rule that every subsequent phase ships with E2E coverage (URGENT)
- Phase 03.1 inserted after Phase 03: UI polish — three advisory findings from 03-UI-REVIEW.md (CommanderPanel focus rings, DeckColumn scrollRef targets wrong container, CardResultCell tabIndex without focus state). Not urgent — Phase 3 shipped PASS 21/24; run before Phase 4 to keep the design contract tight.

---
*Last updated: 2026-04-15*
