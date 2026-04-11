# Roadmap: EDH Deck Builder

**Created:** 2026-04-11
**Milestone:** v1.0 — Core Deck Builder

## Phase 1: Project Foundation & Deck Management

**Goal:** Scaffold the project and implement deck CRUD with persistent storage. User can create, rename, delete, and switch between decks.

**Requirements:** DECK-01 through DECK-07, UI-01, UI-03

**Key decisions:**
- React 19 + Vite 8 + TypeScript (strict)
- Tailwind CSS v4 with dark mode default
- Dexie.js v4 for IndexedDB (two stores: `decks` + `deckCards`)
- Zustand 5 for state management
- Vitest for testing

**Deliverables:**
- Vite project scaffold with React, TypeScript, Tailwind v4
- Dexie database with v1 schema (decks + deckCards stores)
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

**Key decisions:**
- Scryfall API direct from browser (CORS supported, no proxy)
- 100ms rate limiter at HTTP layer
- 300-500ms debounce on search input
- AbortController for stale request cancellation
- Card images at `normal` size (488x680)
- `id<=` operator for color identity filtering

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

## Phase 3: Deck Building & Card Display

**Goal:** User can add/remove cards and view the deck in grid or list format.

**Requirements:** BUILD-01 through BUILD-07, UI-02, UI-04

**Deliverables:**
- Add card to deck from search results
- Remove card from deck
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
| 1 | Foundation & Deck Management | DECK-01–07, UI-01, UI-03 | 9 |
| 2 | Commander & Card Search | CMDR-01–05, SRCH-01–07 | 12 |
| 3 | Deck Building & Card Display | BUILD-01–07, UI-02, UI-04 | 9 |
| 4 | Live Validation Checklist | VALID-01–08 | 8 |
| 5 | Import/Export & Polish | IO-01–04 | 4 |
| **Total** | | | **42** |

Note: UI requirements are distributed across phases where they naturally fit (dark mode in Phase 1, lazy loading in Phase 3).

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
| API Types | @scryfall/api-types | 1.0.0-alpha |
| Validation | Zod | 4.x |
| Testing | Vitest + React Testing Library | latest |

---
*Roadmap created: 2026-04-11*
*Last updated: 2026-04-11 after initial definition*
