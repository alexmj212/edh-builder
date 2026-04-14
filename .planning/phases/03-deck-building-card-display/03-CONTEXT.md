# Phase 3: Deck Building & Card Display - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

User can add cards from the search results into the active deck, remove cards, view the deck in either a categorized list or an image grid (toggleable), see the commander prominently at the top, and hit a live card-count display. Every add/remove writes a `deckChanges` entry, `originalReleaseDate` is captured on first add (for v2 age analysis), singleton is enforced (multiples of basic lands allowed), and search + deck columns remain simultaneously visible on desktop viewports.

Out of scope: live format-validation sidebar (Phase 4), import/export (Phase 5), hover tooltips (999.1), card detail modal (999.2), undo/redo.

</domain>

<decisions>
## Implementation Decisions

### Layout & Selection Column
- Split ratio **60/40** at `lg` (≥1024px): search results on the left (5-col grid fits), selected deck on the right.
- Below `lg`: **stack vertically** — search on top, deck below. No tabbed switcher, no drawer (simpler; no local UI state to manage).
- Default sort in the deck column: **by type category** — mirrors the categorized list view so the mental model is consistent across grid/list.
- Deck column is an **independent scroll pane** (sticky on desktop). Search pagination does not push the deck off-screen.

### Add/Remove UX
- **Add** reuses the existing disabled `(+)` button on `CardResultCell` (src/components/CardResultCell.tsx:33-48). Phase 3 enables it, wires the click handler, and drops the "coming in Phase 3" copy.
- **Duplicate non-basic feedback**: button becomes disabled with tooltip / aria-label "Already in deck." Inline, non-blocking — matches the existing disabled pattern. No toast, no modal.
- **Remove**: explicit `(×)` button on each deck row (both list and grid views). Keyboard-accessible, not a hover-reveal.
- **Undo**: deferred to v2. `deckChanges` log already captures the events so no data is lost — the UI affordance ships later.

### Grid vs List View
- View toggle lives at the top of the deck column. Persisted **per-deck** via a new `Deck.viewMode: 'grid' | 'list'` field.
- **Dexie v4 additive migration** (version(4).stores({...}) with same key signatures + no upgrade callback) — consistent with the v2 and v3 additive pattern established in Phase 02.1.
- Default view: **list** (categorized). 100-card scanning is easier in list form during deckbuilding.
- List grouping buckets (derived from `type_line`): **Creatures, Planeswalkers, Instants, Sorceries, Artifacts, Enchantments, Lands** (7 categories). Land type always wins regardless of other type words. Each bucket shows its own count in the header.
- Grid image size: `small` (146×204). Lazy-load with a skeleton placeholder at the same aspect ratio (488/680) — UI-02 satisfied via `<img loading="lazy">` + a sized placeholder div to avoid layout shift.

### originalReleaseDate Fetching
- On add, call `search({ q: 'oracle_id:<id>', unique: 'prints', order: 'released', dir: 'asc' })` via the Phase 02.3 `scryfall-api` wrapper (`src/lib/scryfall.ts`). Take the first result's `released_at` (ISO date string).
- Persist on the `DeckCard` row as `originalReleaseDate: string | null`. Travels with the deck card, survives `cards` cache eviction, available offline after first add.
- **Non-blocking on failure**: if the prints lookup throws or returns no results, still persist the deckCard with `originalReleaseDate: null`, and emit a `console.warn`. Add must not fail because of a Scryfall hiccup.
- **Dedupe across the app**: before firing the prints query, check if ANY existing `deckCard` (across all decks) already has a non-null `originalReleaseDate` for the same `scryfallId` / `oracle_id`. If so, reuse it. First-add-ever pays the API cost; subsequent adds are free.

### Claude's Discretion
- Concrete Tailwind classes, spacing, and hover/focus states — follow patterns already established by `CardSearchSection` and `CardResultCell`.
- Component/file decomposition inside the deck column (single `DeckColumn` vs `DeckListView` + `DeckGridView` children) — planner's call.
- Exact Playwright locators and test scaffolding — follow the `e2e/specs/` conventions established in Phase 02.2.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CardResultCell` (src/components/CardResultCell.tsx) already has a disabled `(+)` button and hover-overlay copy — Phase 3 enables, does not replace.
- `CardSearchSection` (src/components/CardSearchSection.tsx) owns search state; deck column will sit next to it inside `DeckWorkspace`.
- `DeckWorkspace` (src/components/DeckWorkspace.tsx:60-66) has a placeholder `<section aria-label="Deck Cards" data-testid="deck-placeholder">` — this is where the selection column mounts.
- `deck-store` (src/store/deck-store.ts) manages deck CRUD; a new deckCard slice (or companion store) is needed for add/remove and view-mode state.
- `commander-store` already loads partner/primary — we can reuse its `loadForDeck` pattern for loading deckCards when the route mounts.
- `db` (src/lib/db.ts) already has `deckCards` + `deckChanges` tables from Phase 1 (v1 schema). Phase 3 adds a Dexie `version(4)` migration for `Deck.viewMode` and (if needed) for `DeckCard.originalReleaseDate` — both additive fields.
- `scryfall.ts` wrapper (src/lib/scryfall.ts) + `scryfall-queries.ts` (Phase 02.3) — use for the prints lookup. Do not hand-roll a new client.
- `card-cache` (src/lib/card-cache.ts) — read-through 7-day TTL on `oracle_id`; already warmed by search results.

### Established Patterns
- Zustand stores per domain (deck, commander, card-search); async actions mutate Dexie inside the store action, then `set()` the new state.
- Dexie additive migrations: `version(N+1).stores({...})` with **no upgrade callback** (pattern from v1→v2→v3).
- RED tests first, component tests in `*.test.tsx` co-located, E2E spec under `e2e/specs/NN-name.spec.ts` with `stubScryfall` fixture.
- `useDebouncedValue` hook (src/hooks/useDebouncedValue.ts) for any debounced UI state.
- Tailwind v4 tokens: `bg-surface`, `border-border`, `text-text-primary/secondary`, `text-accent`. Keep to these.
- StrictMode-safe components: guard effects that fire side-effects with a ref on mount (pattern from DUP-4/DUP-5, e.g., CardSearchSection.tsx:83-96).

### Integration Points
- `DeckWorkspace.tsx:60-66` — replace placeholder `<section>` with the new deck column.
- `CardResultCell.tsx:33-48` — enable the `(+)` button and wire `onClick` to a new `useDeckBuilder().addCard(card)` action.
- `db.ts` — bump to `version(4).stores({...})` with additive schema for `Deck.viewMode` and confirm `DeckCard.originalReleaseDate` is declared on the type (no stores-string change needed since it is not an indexed field).
- `types/deck.ts` — add `viewMode?: 'grid' | 'list'` to `Deck` and `originalReleaseDate?: string | null` to `DeckCard`.
- `e2e/specs/` — add `08-deck-building.spec.ts` (or similarly numbered) covering add, duplicate-prevention, basic-land-multiples, remove, grid/list toggle, commander-prominence, and side-by-side visibility at ≥1024px.

</code_context>

<specifics>
## Specific Ideas

- Exactly-100 card count is **not** a Phase 3 concern — that UI/validation sidebar is Phase 4. Phase 3 just displays the current count (e.g. "Cards: 47").
- Basic land detection: match against the 12 recognized basic land types (Plains, Island, Swamp, Mountain, Forest, Wastes, and 6 snow-covered variants). A type_line lookup is sufficient — no need for a separate Scryfall call.
- Commander prominence at top of deck view: `art_crop` image, name, type line. Partner (if any) sits next to primary (reuse `CommanderPanel` — it already handles both slots).
- Toggle-between-views must preserve scroll position (ROADMAP success criterion). Store the deck column's `scrollTop` on view switch and restore.

</specifics>

<deferred>
## Deferred Ideas

- Undo/redo affordance for add/remove (deckChanges log already captures the events — deferred to a future phase).
- Drag-and-drop between search and deck columns — nice-to-have, not required.
- Bulk operations (add 4-of basic lands in one click) — ergonomic win but out of v1 scope.
- Per-category collapse/expand in list view — possible polish for Phase 5.
- `originalReleaseDate` backfill for decks built before Phase 3 — not needed yet; no prior decks have cards.

</deferred>
