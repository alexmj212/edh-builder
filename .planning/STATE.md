---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 3
status: Phase 02.1 Complete — Ready for Phase 03
last_updated: "2026-04-12T13:06:02.286Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 11
  completed_plans: 10
  percent: 91
---

# Project State: EDH Deck Builder

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.
**Current focus:** Phase 02.1 — partner-persistence

## Current Status

- **Milestone:** v1.0 — Core Deck Builder
- **Active phase:** 02.1-partner-persistence (COMPLETE)
- **Current Plan:** — (phase complete)
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

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 02: Partner commander Dexie persistence — survive reload and deck re-entry (URGENT, gap found during Phase 02 human-verify checkpoint)

---
*Last updated: 2026-04-12*
