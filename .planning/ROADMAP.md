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

**Plans:** 6/6 plans executed

Plans:
- [x] 02-01-PLAN.md — Wave 0: install react-router-dom, declare CachedCard type, bump Dexie to v2 with `cards` store, create RED test scaffolds (6 files) for Wave 1-3 modules
- [x] 02-02-PLAN.md — Pure libraries: partner-detection (4 variants), scryfall-client (rate-limited HTTP + query builder + zod envelope), card-cache (read-through 7-day TTL)
- [x] 02-03-PLAN.md — Zustand stores: commander-store (primary + partner + Dexie persistence) and card-search-store (abortable search + pagination + cache side effect)
- [x] 02-04-PLAN.md — Routing shell: BrowserRouter with `/` and `/decks/:id`, WorkspaceHeader with back link, DeckWorkspace skeleton with three section placeholders
- [x] 02-05-PLAN.md — Commander selection UI: useDebouncedValue hook, ColorIdentityChip, CommanderSearch (primary + partner modes), CommanderPanel wired into DeckWorkspace
- [x] 02-06-PLAN.md — Card search UI: CardResultCell (image + hover overlay), CardSearchSection (filter row + results grid + pagination), human-verify checkpoint for end-to-end flow

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

### Phase 02.2: Playwright E2E infrastructure and Phase 02.1 backfill (INSERTED)

**Goal:** Stand up Playwright so interactive UAT steps can be self-verified going forward, and retroactively cover Phase 02.1's browser-side flows. Establishes standing rule that every subsequent phase ships E2E coverage before completion.

**Requirements:** CMDR-04 (browser-side acceptance), TEST-01 (new: Playwright E2E harness exists and runs locally + in CI)

**Depends on:** Phase 02.1

**Plans:** 5/5 plans complete

Plans:
- [x] 02.2-01-PLAN.md — Harness install & config (devDep, playwright.config.ts, tsconfig.e2e.json, port pin, gitignore, e2e/README.md skeleton)
- [x] 02.2-02-PLAN.md — Shared fixtures & helpers (stubScryfall auto-fixture, Scryfall JSON fixtures, commanderFlows, consoleGate)
- [x] 02.2-03-PLAN.md — Cold-start smoke spec (console gate, harness self-test)
- [x] 02.2-04-PLAN.md — Phase 02.1 backfill specs (six flows: activation, selection, reload, remove, autoclear, cascade)
- [x] 02.2-05-PLAN.md — CI workflow + standing rule (GitHub Actions e2e.yml, PROJECT.md + e2e/README.md standing rule, final green-suite verification)

Deliverables:
- Playwright installed and configured (headless, Vite dev-server fixture, `npm run e2e`, CI-friendly)
- `e2e/` folder structure with conventions documented (README or CONTRIBUTING note)
- Cold-start smoke spec: app boots, no unexpected console errors (known `storage.ts:5` warning allowlisted), empty deck state loads
- Phase 02.1 backfill specs: partner slot activates on Partner-keyword primary; partner selection renders card + Remove button; partner survives `page.reload()`; remove-partner persists through reload; changing primary to non-partner auto-clears partner in UI and IndexedDB; clearing primary clears partner too
- Standing rule: from Phase 3 onward, every phase plan must include an E2E spec task before the phase is marked complete

### Phase 02.3: Scryfall client migration to `scryfall-api` (INSERTED)

**Goal:** Replace the hand-rolled `src/lib/scryfall-client.ts` and the stale `@scryfall/api-types@1.0.0-alpha.4` types with the actively-maintained `scryfall-api` (MarioMH8) package. Restore `tsc -b` in the build pipeline, drop the `tsconfig.e2e.json` strict-flag overrides, and eliminate the `as unknown as ScryfallCard.Any` casts. Closes REVIEW.md WR-01 from Phase 02.2.

**Requirements:** (to be confirmed during /gsd-discuss-phase — candidates: new INFR requirement for typed Scryfall client; existing CMDR-01/02/03 remain covered via regression tests)

**Depends on:** Phase 02.2

**Plans:** 5/5 plans complete

Plans:
- [x] 02.3-01-PLAN.md — Spike & go/no-go gate (BLOCK authority: install scryfall-api side-by-side, live Scryfall probe verifying D-07 field parity, D-08 abort path, D-09 throttle ≥100ms, D-10 partner query)
- [x] 02.3-02-PLAN.md — Create `src/lib/scryfall-queries.ts` + `src/lib/scryfall.ts` wrapper (Zod validation boundary, `abortable()` promise-race, `SearchResult` with opaque `MagicPageResult` handle); migrate `card-search-store`, `commander-store`, `card-cache` to new wrapper
- [x] 02.3-03-PLAN.md — Sweep `ScryfallCard`/`@scryfall/api-types` from `src/types/`, `partner-detection.ts`, and the 4 consumer components; delete `commander-store` helpers and eliminate all `as unknown as` casts
- [x] 02.3-04-PLAN.md — Restore `tsc -b && vite build`; drop `verbatimModuleSyntax`/`erasableSyntaxOnly` overrides in `tsconfig.e2e.json`; migrate `stubScryfall.ts` to `Pick<Card, ...>` fixture typing; add `Typecheck` step to `.github/workflows/e2e.yml`
- [x] 02.3-05-PLAN.md — Delete `src/lib/scryfall-client.ts` + tests; uninstall `@scryfall/api-types`; add `e2e/specs/07-card-search.spec.ts` per Phase 02.2-05 standing rule; run full suite and write phase SUMMARY (WR-01 closed)

Deliverables:
- `scryfall-api@^4` installed; `@scryfall/api-types` removed from `package.json`
- `src/lib/scryfall-client.ts` deleted (or converted to a thin wrapper if cancellation/rate-limit gaps required it)
- `npm run build` runs `tsc -b && vite build` cleanly
- All existing unit + E2E tests green against the new client; no regressions in commander selection, partner persistence, card search
- WR-01 from Phase 02.2 REVIEW.md closed

Risks:
- Browser/Vite compatibility of `scryfall-api` unverified — 02.3-01 spike exists to de-risk this before broader migration
- AbortSignal support in `scryfall-api` unknown — `card-search-store` depends on this for search-on-keystroke cancellation; spike must confirm or design around it
- `Card` shape parity with our fixture JSON (partner keywords, oracle_text, card_faces) must hold or fixtures need updating

## Phase 3: Deck Building & Card Display

**Goal:** User can add/remove cards and view the deck in grid or list format.

**Requirements:** BUILD-01 through BUILD-08, DECK-09, UI-02, UI-04

**Plans:** 5/5 plans executed — PHASE COMPLETE (human-verify approved 2026-04-14)

Plans:
- [x] 03-01-PLAN.md — Wave 1: Dexie v4 additive migration + Deck/DeckCard type extensions + Wave 2-5 test/source scaffolds + manual Scryfall oracleid probe
- [x] 03-02-PLAN.md — Wave 2: Pure libs — isBasicLand whitelist + categorizeCard precedence (Land > Creature > Planeswalker > Instant > Sorcery > Artifact > Enchantment)
- [x] 03-03-PLAN.md — Wave 3: deck-cards-store with atomic deckCards+deckChanges+decks.updatedAt transactions, singleton enforcement, cross-deck originalReleaseDate dedupe
- [x] 03-04-PLAN.md — Wave 4: UI components — ViewToggle (aria-pressed), DeckListView (7 categories + sticky headers), DeckGridView (aspect-[146/204] CLS-safe skeletons)
- [x] 03-05-PLAN.md — Wave 5: Integration — CardResultCell wiring, DeckColumn composition, DeckWorkspace 60/40 layout, Playwright spec 13-deck-building.spec.ts, human-verify checkpoint

**Deliverables:**
- Add card to deck from search results
- Remove card from deck
- **Side-by-side card-selection layout**: search input + paginated results on the LEFT, current deck/selected cards on the RIGHT — both visible simultaneously (no below-the-fold selection list). Feedback when a card is added is immediately visible in the right column without scrolling.
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
- Search results and selected cards are simultaneously visible on desktop viewports (≥1024px); a card add produces a visible change in the right-hand selection column without requiring scroll

---

### Phase 03.1: UI polish — Phase 3 follow-ups (INSERTED)

**Goal:** Resolve the three advisory findings from Phase 3's UI review (03-UI-REVIEW.md, PASS 21/24) so keyboard and scroll behavior match the rest of the design contract before Phase 4.

**Requirements:** No new requirement IDs — closes advisory items from 03-UI-REVIEW.md.

**Depends on:** Phase 3

**Success criteria:**
- CommanderPanel "Change commander" and "Remove partner" buttons have visible `focus:ring-2 focus:ring-accent` focus rings (matches ViewToggle pattern)
- View-switch scroll reset in DeckColumn works at deck sizes that overflow the flex container — `scrollRef` targets the true scroll parent, not the inner div (current `DeckColumn.tsx:78` silently no-ops at overflow)
- Search result cards expose a visible focus state — either add `focus:ring-2 focus:ring-accent` to the `CardResultCell` outer div, or drop `tabIndex={0}` from the container and rely on the inner `(+)` button's tab stop
- `bun test` and `bun run test:e2e` still green; no regressions in specs 01-13
- UI review rerun passes all three pillars previously docked (Visuals, Spacing, Experience Design)

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 03.1 to break down)

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
| 2 | Commander Selection & Card Search (+ 02.1/02.2/02.3 inserts) | CMDR-01–05, SRCH-01–07, TEST-01 | 13 |
| 3 | 1/5 | In Progress|  |
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

## Backlog

Unsequenced future-planned features captured from user feedback. Not in the active milestone sequence. Promote to an active phase via `/gsd-review-backlog` when ready.

### Phase 999.1: Arena-style card hover tooltip (BACKLOG)

**Goal:** On hover over any card instance (search result, deck list, commander panel, modal), surface a rich preview panel showing:
1. Full-size card art (not `art_crop`).
2. Related cards inline — flip/transform back face, generated tokens, meld/partner pieces, emblem produced — so the user does not need to click through to understand interactions.
3. Keyword explainers — for each keyword on the card (Flying, Lifelink, Partner, Commander ninjutsu, etc.), render the reminder text / short definition inline, MTG Arena style.

Behavior notes:
- Debounced hover (~300ms) to avoid flicker on mouse-through.
- Keyboard-accessible equivalent: focus + small delay, dismissable with Esc.
- Must work consistently wherever cards render.

**Requirements:** TBD (new UI-xx tooltip requirement to be added during promotion)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Card detail modal with rulings and errata (BACKLOG)

**Goal:** Clicking a card opens a modal with expanded card data beyond the hover tooltip:
- Full oracle text + any errata
- Rulings (Scryfall `rulings_uri` / official rulings list)
- Full printings list with set/release/frame details
- Legality table (Commander-focused, but showing other formats for context)
- Price snapshots (USD / USD_foil / EUR / TIX if available via Scryfall)
- Related cards section (same as hover, but expanded with reminders)

Behavior notes:
- Modal should be dismissable (Esc, backdrop click, explicit close button).
- Focus management: focus returns to the card that was clicked after close.
- Should work wherever hover tooltip works (search, deck list, commander panel).
- Mobile: full-screen variant rather than modal when viewport is narrow.

**Requirements:** TBD (new UI-xx detail-modal requirement to be added during promotion)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---
*Roadmap created: 2026-04-11*
*Last updated: 2026-04-13 — Phase 3 decomposed into 5 plans across 5 waves*
