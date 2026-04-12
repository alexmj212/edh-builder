# Roadmap: EDH Deck Builder

**Created:** 2026-04-11
**Milestone:** v1.0 — Core Deck Builder

## Phase 1: Project Foundation & Deck Management

**Goal:** Scaffold the project and implement deck CRUD with persistent storage. User can create, rename, delete, and switch between decks.

**Requirements:** DECK-01 through DECK-08, UI-01, UI-03

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Vite/React/TS project, Tailwind v4 dark theme, Dexie database with v1 schema (decks + deckCards + deckChanges)
- [x] 01-02-PLAN.md — Zustand deck store with CRUD, responsive layout shell, dark/light toggle, deck list UI

**Key decisions:**
- React 19 + Vite 8 + TypeScript (strict)
- Tailwind CSS v4 with dark mode default
- Dexie.js v4 for IndexedDB (three stores: `decks` + `deckCards` + `deckChanges`)
- Zustand 5 for state management
- Vitest for testing

**Deliverables:**
- Vite project scaffold with React, TypeScript, Tailwind v4
- Dexie database with v1 schema (decks + deckCards + deckChanges stores)
- `deckChanges` store schema ready for v2 history features (type, deckId, cardName, timestamp)
- Zustand store with deck slice
- Deck list page: create, rename, delete, select
- Dark/light mode toggle
- Responsive layout shell
- `navigator.storage.persist()` on first launch

**Success criteria:**
- User can create a deck, see it in a list, rename it, delete it
- Decks survive browser refresh (IndexedDB persistence)
- Dark mode works by default with toggle to light
- Layout is responsive on desktop and tablet

---

## Phase 2: Commander Selection & Card Search

**Goal:** User can select a commander and search for cards using Scryfall API with proper filtering.

**Requirements:** CMDR-01 through CMDR-05, SRCH-01 through SRCH-07

**Plans:** 5/6 plans executed

Plans:
- [x] 02-01-PLAN.md — Wave 0: install react-router-dom, declare CachedCard type, bump Dexie to v2 with `cards` store, create RED test scaffolds (6 files) for Wave 1-3 modules
- [x] 02-02-PLAN.md — Pure libraries: partner-detection (4 variants), scryfall-client (rate-limited HTTP + query builder + zod envelope), card-cache (read-through 7-day TTL)
- [x] 02-03-PLAN.md — Zustand stores: commander-store (primary + partner + Dexie persistence) and card-search-store (abortable search + pagination + cache side effect)
- [x] 02-04-PLAN.md — Routing shell: BrowserRouter with `/` and `/decks/:id`, WorkspaceHeader with back link, DeckWorkspace skeleton with three section placeholders
- [x] 02-05-PLAN.md — Commander selection UI: useDebouncedValue hook, ColorIdentityChip, CommanderSearch (primary + partner modes), CommanderPanel wired into DeckWorkspace
- [ ] 02-06-PLAN.md — Card search UI: CardResultCell (image + hover overlay), CardSearchSection (filter row + results grid + pagination), human-verify checkpoint for end-to-end flow

**Key decisions:**
- Scryfall API direct from browser (CORS supported, no proxy)
- 100ms rate limiter at HTTP layer
- 400ms debounce on search input (shared via `useDebouncedValue` hook)
- AbortController for stale request cancellation
- Card images at `normal` size (488×680)
- `id<=` operator for color identity filtering
- BrowserRouter (declarative) over RouterProvider
- Dedicated commander panel in workspace (two-slot side-by-side for partners)
- Read-through card cache in Dexie v2 (`cards` store keyed by `oracle_id`, 7-day TTL)

**Deliverables:**
- Scryfall API client with rate limiting and request cancellation
- Commander search (filtered to legendary creatures + "can be your commander")
- Commander selection UI with art_crop display
- Partner commander support (all 4 variants with pairing validation)
- General card search with name, type, text, color filters
- Search results auto-filtered to commander's color identity
- Paginated search results with load-more
- Card result display: image, name, mana cost, type, color

**Success criteria:**
- User can search for and select a commander
- Partner commanders validate correctly (generic, named, friends forever, background)
- Card search returns results filtered to the commander's color identity
- Search is debounced, rate-limited, and cancels stale requests
- Pagination works for large result sets

---

### Phase 02.1: Partner commander Dexie persistence (INSERTED)

**Goal:** Persist the partner commander to Dexie so it survives hard reload and deck re-entry, closing a gap found during the Phase 02 human-verify checkpoint.

**Requirements:** CMDR-04 (full acceptance — partner selection must round-trip through IndexedDB)

**Depends on:** Phase 02

**Plans:** 3/3 plans complete

Plans:
- [x] 02.1-01-PLAN.md — Dexie v3 additive migration + Deck type optional partner fields + migration tests
- [x] 02.1-02-PLAN.md — commander-store partner persistence wiring (setPartner/clearPartner/loadForDeck/auto-clear) + store tests
- [x] 02.1-03-PLAN.md — CommanderPanel round-trip component tests (Remove-partner persists; remount rehydrates)

Deliverables:
- `Deck.partnerCommanderId` + `partnerCommanderName` fields
- Dexie `version(3)` additive migration (no upgrade callback)
- `commander-store.setPartner(deckId, card)` and `clearPartner(deckId)` persist to Dexie
- `commander-store.loadForDeck` restores both primary and partner
- `setCommander` auto-clear path also nulls Dexie partner fields
- Tests: store persistence + restore round-trip, v2→v3 migration, component wiring

## Phase 3: Deck Building & Card Display

**Goal:** User can add/remove cards and view the deck in grid or list format.

**Requirements:** BUILD-01 through BUILD-08, DECK-09, UI-02, UI-04

**Deliverables:**
- Add card to deck from search results
- Remove card from deck
- Every add/remove writes a changelog entry to `deckChanges` store (v2 history foundation)
- Card references include `originalReleaseDate` from earliest Scryfall printing (v2 age analysis foundation)
- Singleton enforcement (prevent duplicate non-basics, allow multiple basics)
- Visual card grid view with lazy-loaded images and skeleton placeholders
- Categorized list view (grouped by type: creatures, instants, sorceries, artifacts, enchantments, lands, planeswalkers)
- Grid/list toggle
- Commander displayed prominently with art_crop at top of deck view
- Card count display

**Success criteria:**
- Adding a duplicate non-basic shows an error/prevention
- Adding multiple basic lands works
- Grid view shows card images with lazy loading (no layout shift)
- List view groups cards by type with card count per category
- Toggle between views preserves scroll position
- Commander art is prominent at deck top
- Every card add/remove creates a `deckChanges` record
- Card references include `originalReleaseDate`

---

## Phase 4: Live Validation Checklist

**Goal:** Real-time validation sidebar that checks all Commander format rules as the deck is built.

**Requirements:** VALID-01 through VALID-08

**Deliverables:**
- Validation engine (pure functions, fully unit-tested):
  - Card count: current vs. 100 (including commander)
  - Color identity: every card's identity subset of commander's identity
  - Singleton: no duplicate names except basic lands
  - Banned list: flag `legalities.commander === "banned"`
  - Format legality: flag `legalities.commander === "not_legal"`
  - Valid commander: confirm eligibility
- Validation checklist UI component (sidebar or panel)
- Each rule shows green/red status with violation details
- Checklist updates reactively as cards are added/removed
- Clicking a violation highlights the offending card(s)

**Success criteria:**
- All 7 validation rules work correctly
- Checklist updates immediately on any deck change
- Violations show which specific cards are problematic
- All validation logic has unit tests (color identity edge cases, partner identity merging, basic land exemption)

---

## Phase 5: Import/Export & Polish

**Goal:** Users can export and import deck lists in standard text format. Final polish pass.

**Requirements:** IO-01 through IO-04

**Deliverables:**
- Export: generate "1 Card Name" text from deck, copy to clipboard
- Import: parse pasted text, batch-resolve via `/cards/collection` (75 per request)
- Import error handling: show unresolved card names
- Import progress indicator (batch resolution takes a few seconds)
- UI polish pass: loading states, error boundaries, empty states
- README with usage instructions

**Success criteria:**
- Exported text is compatible with Moxfield/Archidekt import
- Import correctly resolves 99 cards in 2 batch requests
- Unrecognized cards are reported to the user
- App handles edge cases: empty deck export, blank import, malformed lines

---

## Phase Summary

| Phase | Name | Requirements | Count |
|-------|------|-------------|-------|
| 1 | Foundation & Deck Management | DECK-01–08, UI-01, UI-03 | 10 |
| 2 | 4/6 | In Progress|  |
| 3 | Deck Building & Card Display | BUILD-01–08, DECK-09, UI-02, UI-04 | 11 |
| 4 | Live Validation Checklist | VALID-01–08 | 8 |
| 5 | Import/Export & Polish | IO-01–04 | 4 |
| **Total** | | | **45** |

Note: UI requirements are distributed across phases where they naturally fit (dark mode in Phase 1, lazy loading in Phase 3). v2 foundations (deckChanges store, originalReleaseDate) are baked into Phases 1 and 3 to avoid retrofit.

---

## Tech Stack Reference

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | React | 19.x |
| Build | Vite | 8.x |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | v4.2 |
| State | Zustand | 5.x |
| Storage | Dexie.js (IndexedDB) | v4 |
| Routing | react-router-dom | 7.x |
| API Types | @scryfall/api-types | 1.0.0-alpha |
| Validation | Zod | 4.x |
| Testing | Vitest + React Testing Library | latest |

---
*Roadmap created: 2026-04-11*
*Last updated: 2026-04-11 after Phase 2 planning*
