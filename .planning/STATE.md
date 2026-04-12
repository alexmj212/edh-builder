---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 4
status: Executing Phase 02.3
last_updated: "2026-04-12T19:58:22.975Z"
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 21
  completed_plans: 18
  percent: 86
---

# Project State: EDH Deck Builder

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.
**Current focus:** Phase 02.3 — scryfall-api-migration

## Current Status

- **Milestone:** v1.0 — Core Deck Builder
- **Active phase:** 02.2-playwright-e2e-harness (COMPLETE)
- **Current Plan:** 4
- **Phases planned:** 5
- **Requirements:** 37 v1, 10 v2

## Completed Phases

(Phase 01 complete)

## Completed Plans (Phase 02)

| Plan | Name | Completed |
|------|------|-----------|
| 02-01 | Wave 0 Foundation (Dexie v2, CachedCard, test scaffolds) | 2026-04-12 |
| 02-02 | Wave 1 Library Modules (partner-detection, scryfall-client, card-cache) | 2026-04-12 |
| 02-03 | Wave 2 Zustand Stores (commander-store, card-search-store) | 2026-04-12 |
| 02-04 | Wave 3 Routing & DeckWorkspace Shell | 2026-04-12 |
| 02-05 | Wave 4 Commander Selection UX | 2026-04-12 |

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

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 02: Partner commander Dexie persistence — survive reload and deck re-entry (URGENT, gap found during Phase 02 human-verify checkpoint)
- Phase 02.2 inserted after Phase 02: Playwright E2E infrastructure + Phase 02.1 backfill — stands up e2e harness so Claude can self-verify interactive UAT, retroactively covers 02.1 browser-side flows; establishes standing rule that every subsequent phase ships with E2E coverage (URGENT)

---
*Last updated: 2026-04-12*
