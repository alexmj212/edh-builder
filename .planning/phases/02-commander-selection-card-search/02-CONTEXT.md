# Phase 2: Commander Selection & Card Search — Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

User can:
1. Select a single commander (or two compatible partners) for a deck via search
2. Search any cards using Scryfall API, automatically filtered to the active commander's color identity
3. Browse search results visually with image, name, mana cost, type, and color

This phase delivers commander assignment + card discovery. It does **not** add cards to the deck (Phase 3), validate the full deck (Phase 4), or import/export (Phase 5). Card add-buttons in search results are stubs that Phase 3 wires up.

</domain>

<decisions>
## Implementation Decisions

### Commander Discovery Flow

- **D-01:** Commander selection lives in a **dedicated commander panel inside the deck workspace** (not modal, not at deck-creation time). A deck can exist without a commander; the panel shows an empty state with a "Pick a commander" search.
- **D-02:** Commander discovery surface = **single search input with an EDHREC-sorted default list** of popular commanders shown when input is empty. Paginated (load more). Query Scryfall with `(t:legendary t:creature or o:"can be your commander") f:commander order:edhrec`.
- **D-03:** Partner pairing UI shows **two visible slots side-by-side**: "Commander" and "Partner (optional)". The Partner slot is **disabled until the primary commander is partner-eligible**. Primary slot is always required for partner flow.
- **D-04:** Partner search is **pre-filtered to only valid pairings** based on the primary's partner type:
  - Generic `Partner` → only other generic `Partner` cards
  - `Partner with <Name>` → only the named match
  - `Friends Forever` → only other `Friends Forever`
  - `Choose a Background` → only cards with the `Background` subtype
  Invalid pairings are not selectable, so no error states needed at pairing time.

### Card Search UX

- **D-05:** Search input fires on **400ms debounce** (no autocomplete typeahead). `AbortController` cancels in-flight requests as the user keeps typing. Keeps API call volume predictable; matches research recommendations.
- **D-06:** Filters use **separate form fields per filter**: name input, type input, oracle-text input, color identity = WUBRG pip toggles. Filters compose into a Scryfall `q` string under the hood. No raw-syntax escape hatch in v1.
- **D-07:** Color-identity filter is shown as an **always-on locked chip** above results: "Filtered to <commander name>'s identity (WUG)". Click chip to surface a brief "why" tooltip. **Search is disabled when no commander is selected**, with copy: "Pick a commander first to start searching cards."
- **D-08:** Search results render as an **image-first card grid** using Scryfall `normal` (488×680) images. Each cell shows image + name + mana cost. Hover (desktop) / tap (touch) reveals type line + oracle snippet. An "Add" affordance is present as a stub icon — Phase 3 implements its handler.

### Routing & Screen Structure

- **D-09:** **Add `react-router-dom`** (latest v7) for per-deck URLs. Routes:
  - `/` — DeckList (existing UI, unchanged)
  - `/decks/:id` — Deck workspace
  - Browser back/forward and refresh-into-deck must work.
- **D-10:** Deck workspace layout = **single vertical scroll**: commander panel at top, card search section below, deck view section below that (deck view is a Phase 3 placeholder for now). **Not tabs.** Reasoning: less navigation friction; user can see commander context while searching; section count is small enough that scrolling is comfortable.
- **D-11:** DeckList stays at `/`. Clicking a deck navigates to `/decks/:id`. Workspace header shows a "← Back to decks" link. No sidebar/dual-nav in v1.

### Card Caching Strategy

- **D-12:** **IndexedDB cache for individual Scryfall card objects** in a new Dexie `cards` store keyed by `oracle_id`. Schema bump to **db version 2** with migration. Each cached entry stores: `oracle_id`, full card JSON, `cachedAt` timestamp. **7-day TTL** — entries older than 7 days are re-fetched (legality / oracle text changes are infrequent).
- **D-13:** **Do not cache full search-result pages.** Search results live in component state only. Search queries vary too widely; page caching pays poor dividends and risks stale rankings.
- **D-14:** Read-through pattern: before any single-card fetch (e.g., commander hydration, Phase 3 deck-card hydration), check the `cards` store first. Search results returned from `/cards/search` are also written to the cache as a side effect.

### Error & Edge-State Handling

- **D-15:** All search-surface states are **inline messages** within the search section (not toasts, not error boundaries):
  - Empty input: "Start typing to search."
  - Loading: spinner inline above results grid.
  - Zero results: "No cards match your filters."
  - API error: red banner with error message + "Retry" button.
  - Network offline: same banner pattern with offline-specific copy.

### Partner Detection

- **D-16:** Partner-eligibility detection = **parse `oracle_text`** for the partner keywords/phrases. Implemented as a **pure function** with **unit tests** covering all four variants (`Partner`, `Partner with X`, `Friends forever`, `Choose a Background`). Researcher should also confirm whether Scryfall populates `keywords[]` for these — if so, prefer `keywords[]` for the obvious cases and use oracle_text for `Partner with <Name>` (which carries the named partner). The Background variant is detected via the partner's type line containing `Background`.

### Claude's Discretion

- Exact debounce value within 300–500ms range — Claude picks based on feel; 400ms is the working assumption.
- Specific Tailwind class layouts and visual polish for the workspace, commander panel, and search grid.
- Where the "Add" stub icon sits inside a result card and what placeholder behavior it has in Phase 2 (e.g., disabled tooltip "Available next phase").
- Loading skeletons for commander art / card images (images themselves lazy-load via `<img loading="lazy">`).
- Pagination UX (button vs intersection-observer load-more) — pick whichever feels right; both are fine within the 175-per-page constraint.

### Folded Todos

(None — no pending todos matched Phase 2 scope.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scryfall API
- `.planning/research/SCRYFALL_API.md` — Endpoints, rate limits, headers, pagination, image sizes, partner/color-identity query patterns. Authoritative for all API decisions in this phase.

### Commander format rules
- `.planning/research/COMMANDER_RULES.md` — Color identity rules, commander eligibility, partner variants. Especially the partner-pairing matrix.

### Project context
- `.planning/PROJECT.md` — Core value: "build a valid Commander deck with confidence." Visual-first browsing matches how players think about cards.
- `.planning/REQUIREMENTS.md` — CMDR-01 through CMDR-05, SRCH-01 through SRCH-07 are the acceptance criteria for this phase.
- `.planning/ROADMAP.md` §Phase 2 — Locked tech decisions (rate limit, debounce, AbortController, `id<=`, image sizes).

### Existing code
- `src/lib/db.ts` — Current Dexie schema (v1: decks, deckCards, deckChanges). **Must bump to v2** to add the `cards` store.
- `src/store/deck-store.ts` — Zustand store pattern to follow for new commander/search/cards stores.
- `src/types/deck.ts` — Existing types. `Deck` already has `commanderId`, `commanderName`, `colorIdentity` fields ready to be populated by Phase 2.
- `src/components/Layout.tsx` — Layout shell that workspace pages will render inside.

### External library docs (use Context7 when planning)
- `react-router-dom` v7 — for routing decisions
- `dexie` v4 — for the schema migration and `cards` store
- `@scryfall/api-types` (already a dep) — Card, List, Catalog type definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Dexie DB (`src/lib/db.ts`)** — already initialized with v1 schema; add `cards` store via `this.version(2).stores({ ... })`.
- **Zustand pattern (`src/store/deck-store.ts`)** — extend with `setCommander`, `clearCommander` actions on the existing store; add a separate `card-search-store.ts` for query/results state and a `card-cache-store.ts` (or just direct Dexie reads) for cached card lookups.
- **Existing `Deck` type fields** — `commanderId`, `commanderName`, `colorIdentity` are already in the schema; Phase 2 just needs to write them.
- **`storage.ts`** — Phase 1's persistent-storage helper; nothing new needed here.
- **Theme/Layout components** — Workspace pages render inside the existing `<Layout>` and inherit dark-mode styling.

### Established Patterns
- **Strict TypeScript** — interfaces in `src/types/`, no `any`.
- **Vitest + RTL** — co-located `*.test.tsx`/`*.test.ts` files. Maintain comprehensive coverage for new modules: Scryfall client (with mocked fetch), partner-detection function, query builder, card-cache read-through.
- **Tailwind v4 dark-by-default** — use existing color tokens, no new theme config.
- **Async in Zustand** — Phase 1 stores manage `loading` and `error` per slice; follow that pattern for the search store (`status: 'idle' | 'loading' | 'success' | 'error'`, `results`, `error`).

### Integration Points
- **Routing** — `src/App.tsx` will become a `<RouterProvider>` (or `<BrowserRouter>` + `<Routes>`); current `<Layout><DeckList/></Layout>` becomes the `/` route element.
- **DeckList navigation** — `src/components/DeckList.tsx` items become links/buttons that `useNavigate('/decks/${id}')` instead of just calling `setActiveDeck`.
- **Active deck loading** — workspace pulls deck by `id` from URL; if not found, render a "Deck not found" state with link back to `/`.
- **Dexie schema migration** — bumping from v1 → v2 requires testing migration with seeded v1 data so Phase 1 users don't lose decks.

</code_context>

<specifics>
## Specific Ideas

- **Visual-first results** — PROJECT.md emphasizes "Card image + basics display: Visual-first browsing matches how players think about cards." Keep the result cell uncluttered: image dominates; text is secondary.
- **Single-scroll workspace** (D-10) — explicitly chosen over tabs. The user wants minimal navigation; avoid building a tab system.
- **Locked color-identity chip** (D-07) — visible reassurance that the filter is doing its job, not hidden magic.
- **Partner detection as pure function with tests** (D-16) — encode the rules in a single tested module; do not scatter partner logic across UI components.

</specifics>

<deferred>
## Deferred Ideas

(None surfaced during discussion. Future v2 candidates already tracked in REQUIREMENTS.md: card autocomplete (ENH-01), bulk data cache (ENH-02), EDHREC-sorted card suggestions for a commander (SUGG-01).)

</deferred>
