---
phase: 3
slug: deck-building-card-display
audited: 2026-04-14
baseline: 03-UI-SPEC.md
screenshots: not captured (dev server on :5173 — code-only audit)
pillar_scores:
  copywriting: 4
  visuals: 3
  color: 4
  typography: 4
  spacing: 3
  experience_design: 3
overall: 21
verdict: PASS
---

# Phase 3 — UI Review

**Audited:** 2026-04-14
**Baseline:** 03-UI-SPEC.md (approved design contract)
**Screenshots:** not captured (code-only audit; dev server confirmed on :5173 but no Playwright-MCP available in this session)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All declared copy matches spec exactly; aria-labels fully qualified |
| 2. Visuals | 3/4 | CommanderPanel action buttons missing focus rings; outer CardResultCell div has invisible focus state |
| 3. Color | 4/4 | Token-only, no hardcoded hex; accent reserved correctly; danger tint on remove only |
| 4. Typography | 4/4 | Only 3 sizes (xs/sm/xl) + 2 weights (normal/semibold) — within declared scale |
| 5. Spacing | 3/4 | No banned gap-3/p-3; one off-scale `mt-0.5` (2px); double overflow-y-auto creates redundant scroll context |
| 6. Experience Design | 3/4 | Scroll-reset targets wrong scroll container; CommanderPanel action buttons lack focus rings and aria-label |

**Overall: 21/24**
**Verdict: PASS**

---

## Top 3 Priority Fixes

1. **CommanderPanel "Change commander" / "Remove partner" buttons have no focus ring** — Keyboard users tabbing through the commander panel receive no visible indicator when these text buttons are focused, violating the spec's `focus:ring-2 focus:ring-accent` contract. Fix: add `focus:outline-none focus:ring-2 focus:ring-accent rounded` to both buttons in `FullCard` (lines 74 and 79–84 of `CommanderPanel.tsx`).

2. **`scrollRef` targets the inner DeckColumn div, not the actual scroll container** — The outer `flex-[2]` wrapper in `DeckWorkspace` holds `overflow-y-auto + max-h`, making it the real scroll container. `DeckColumn.tsx:78` calls `scrollRef.current.scrollTop = 0` on the inner div, which is not scrolling, so view-switch scroll-reset silently no-ops. Fix: either remove `overflow-y-auto` from `DeckColumn`'s own wrapper (let the outer scroll container handle it and pass a ref down), or hoist the scroll reset into `DeckWorkspace` via a `ref` on the outer flex child div.

3. **`CardResultCell` outer `div` has `tabIndex={0}` with no visible focus indicator** — The outer div is reachable by keyboard but renders no ring when focused; only the inner `+` button has a focus ring. Users tabbing through search results see a focus disappear into the card. Fix: add `focus:outline-none focus:ring-2 focus:ring-accent` to the outer `div` in `CardResultCell.tsx:62`, or remove `tabIndex={0}` from the container and rely entirely on the inner button's tab stop.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All copywriting contract entries match the implementation exactly.

| Spec entry | Implementation | Status |
|-----------|---------------|--------|
| "Your Deck" heading | `DeckColumn.tsx:89` | Match |
| "Cards: {n}" count | `DeckColumn.tsx:91` | Match — no parens, no `/100` denominator |
| "List" / "Grid" toggle labels | `ViewToggle.tsx:17,24` | Match |
| "No cards yet." | `DeckColumn.tsx:121` | Match |
| "Add from search results on the left." | `DeckColumn.tsx:123` | Match |
| "Pick a commander first." | `DeckColumn.tsx:114` | Match |
| "Card search will be enabled once a commander is selected." | `DeckColumn.tsx:115-117` | Match |
| `aria-label="Remove {card.name} from deck"` | `DeckListView.tsx:53`, `DeckGridView.tsx:30` | Match |
| `aria-label="Add {card.name} to deck"` | `CardResultCell.tsx:47` | Match |
| `aria-label="Already in deck"` + `title` | `CardResultCell.tsx:44–49` | Match |
| `aria-label="Adding {card.name}…"` | `CardResultCell.tsx:43` | Match |
| `aria-label="Deck view"` on toggle group | `ViewToggle.tsx:11` | Match |
| Category headers: Creatures…Lands | `card-categorizer.ts:3–5` | Match, correct order |
| Error banner: "Could not add card…" | `DeckColumn.tsx:104` (passes `error` from store) | Pattern match |

The "Something went wrong fetching cards…" copy in `CardSearchSection.tsx:110` is a pre-Phase-3 string not in the Phase 3 copywriting contract — it existed before this phase and is not a regression.

No generic labels ("Submit", "OK", "Save", "Cancel") found in any Phase 3 component.

---

### Pillar 2: Visuals (3/4)

**Strengths:**
- Clear 60/40 split enforced by `flex-[3] / flex-[2]` (`DeckWorkspace.tsx:51,55`). Spec compliance: exact.
- Category headers are sticky (`sticky top-0 z-10`, `DeckListView.tsx:32`), maintaining orientation context while scrolling — strong UX signal.
- `animate-pulse` skeleton in `DeckGridView.tsx:17` replaced by image on load via `useState` (`loaded` flag, line 13) — correct fade pattern.
- Remove button reveal (`opacity-0 group-hover:opacity-100 focus:opacity-100`, `DeckListView.tsx:55`) keeps the list visually quiet without sacrificing keyboard access.
- Grid remove button is always visible (`DeckGridView.tsx:27–38`) matching the spec rationale for touch targets.
- ViewToggle segmented control (`role="group"` + `aria-pressed`) is semantically correct.

**Gaps:**
- `CommanderPanel.tsx:79–85`: "Change commander" and "Remove partner" action buttons have no `focus:ring` classes. These are visible, interactive text buttons below the commander art and are keyboard-reachable — their invisible focus state is a WCAG 2.1 2.4.7 failure at the component level.
- `CardResultCell.tsx:60–62`: The outer `div` has `tabIndex={0}` but no `focus:ring-*`. The `focus-within:opacity-100` on the overlay panel (line 70) does reveal the card info on keyboard focus of the inner button, but when the outer div itself receives focus, nothing renders visually. This is a secondary tab stop with no affordance.
- `CommanderPanel` layout: the spec's workspace grid ASCII art depicts CommanderPanel as a full-width section above the search/deck split. The implementation places it inside the 40% deck column. The spec's own component contract section (line 305–308) contradicts the ASCII art and explicitly says "render it as the first visual element in the deck column." Implementation follows the component-level contract correctly; the ASCII art is the spec's internal inconsistency. No deduction — noted for future spec clarity.

---

### Pillar 3: Color (4/4)

**Token usage (no hardcoded values found):**

All colors are OKLCH CSS custom properties from `src/index.css`. Zero `#hex` or `rgb()` strings found in any audited component.

Accent token distribution:
- `bg-accent`: add button base (`CardResultCell.tsx:82`), active view toggle segment (`ViewToggle.tsx:7`)
- `text-accent`: hyperlinks in `DeckWorkspace.tsx:38` and `CardSearchSection.tsx:222`
- `ring-accent`: focus rings across all interactive elements (7 occurrences)

This is exactly the spec reservation: `(+)` button, view toggle active state, focus rings, hyperlinks. No decorative or ambient accent use found.

Danger token:
- `border-danger`: error banners in `DeckColumn.tsx:102` and `CardSearchSection.tsx:210`
- `text-danger`: remove button hover/focus only (`DeckListView.tsx:55`, `DeckGridView.tsx:31`)
- Spec: danger tint on remove is icon-color-only on hover/focus — matches exactly.

`bg-background/80` in `DeckGridView.tsx:31` (remove button backdrop) uses Tailwind opacity modifier on a token, not a hardcoded color — acceptable.

---

### Pillar 4: Typography (4/4)

**Size distribution across all Phase 3 components:**

| Class | Count | Spec role |
|-------|-------|-----------|
| `text-sm` | 20 | Body — card names, count badge, meta, state copy |
| `text-xs` | 9 | Label — category headers, mana cost, type line, metadata |
| `text-xl` | 2 | Heading — "Your Deck", "Card Search" |

`text-2xl` appears in `WorkspaceHeader.tsx:16` (deck name) — this is the Display role from spec, and WorkspaceHeader is a pre-Phase-3 component correctly maintained.

Only 3 distinct sizes within Phase 3 scope (spec declares 4, with `text-2xl` handled by WorkspaceHeader). No rogue `text-lg`, `text-3xl`, or larger sizes introduced.

**Weight distribution:**

| Class | Count |
|-------|-------|
| `font-semibold` | 10 |
| `font-normal` | 1 |

`font-semibold` used for: headings, category headers, toggle labels, card name overlay, "Load more" button. `font-normal` is the `<span>` card count inside the heading (`DeckColumn.tsx:91`). Exactly 2 weights — within the spec's declared constraint.

---

### Pillar 5: Spacing (3/4)

**Spacing scale compliance:**

| Token | Class | Found in Phase 3 |
|-------|-------|-----------------|
| xs 4px | `gap-1/p-1` | Not found (spec: icon gaps — not introduced in this phase) |
| sm 8px | `gap-2/p-2/px-2/py-2` | 20 occurrences — primary compact spacing |
| md 16px | `gap-4/p-4` | 6 occurrences — container padding |
| xl 24px | `gap-6/mt-6` | 2 occurrences — workspace gap, sticky top |
| 2xl 32px | `mt-8` | 1 occurrence — CardSearchSection top margin |
| 3xl 64px | `py-16` | 4 occurrences — empty/loading states |

**Banned value check — CLEAN:** Zero occurrences of `gap-3`, `p-3`, `px-3`, `py-3`, `m-3`, `mt-3`, `mb-3` found. The 12px removal (commit 3068e45) held.

**Off-scale values:**
- `mt-0.5` (2px) in `CardResultCell.tsx:73` — type line margin inside the hover overlay. Not in the declared scale. This is a minor visual nudge in a dense info overlay; the impact is cosmetic. Recommend aligning to `mt-1` (4px/xs) in a future pass.
- `max-w-[240px]` in `CommanderPanel.tsx:32,55` — arbitrary pixel width on the normal-variant card image. Not a spacing token issue (it's a sizing constraint, not rhythm spacing), and the `art_crop` variant in the deck column does not use it. Advisory only.

**Double scroll wrapper:**
Both `DeckWorkspace.tsx:55` (outer wrapper: `max-h-[calc(100vh-6rem)] overflow-y-auto`) and `DeckColumn.tsx:85` (inner: `overflow-y-auto` without `max-h`) declare overflow scrolling. The outer wrapper is the actual scroll container; the inner's `overflow-y-auto` is redundant. This does not cause visual breakage at typical viewport heights but adds layout complexity and is the root cause of the scroll-reset bug (Priority Fix 2). Remove `overflow-y-auto` from `DeckColumn.tsx:85`.

---

### Pillar 6: Experience Design (3/4)

**State coverage:**

| State | Coverage | Evidence |
|-------|----------|---------|
| Deck loading | `DeckWorkspace.tsx:28-29` — "Loading deck..." | Present |
| Deck not found | `DeckWorkspace.tsx:36-40` — "Deck not found." + back link | Present |
| Commander loading/hydration | `CommanderPanel.tsx:100` — `isHydratedForDeck` skeleton | Present, well-engineered |
| Search loading | `CardSearchSection.tsx:200-205` — Spinner + "Searching..." | Present |
| Search error | `CardSearchSection.tsx:207-227` — offline-aware error + retry | Present |
| Search empty | `CardSearchSection.tsx:229-231` — "No cards match your filters." | Present |
| No commander (search gate) | `CardSearchSection.tsx:140-147` + `DeckColumn.tsx:113` | Present in both columns |
| No cards in deck | `DeckColumn.tsx:119-126` — "No cards yet." | Present |
| Add loading (per-card) | `CardResultCell.tsx:84-86` — Spinner replaces `+` icon | Present |
| Already in deck | `CardResultCell.tsx:41,51-54` — `opacity-40 cursor-not-allowed` + tooltip | Present |
| Remove (immediate, no confirm) | Spec-compliant — v1 does not require confirm | Correct |
| Deck column error | `DeckColumn.tsx:99-106` — `role="alert"` banner | Present |
| Grid image skeleton | `DeckGridView.tsx:17-18` — `animate-pulse` + `aria-hidden` | Present |
| List row image fallback | `DeckListView.tsx:44-46` — `bg-surface` CSS fallback on broken load | Present |

**Gaps:**

1. `CommanderPanel.tsx:79–85`: "Change commander" / "Remove partner" buttons have no `focus:ring`, no `aria-label`. The button text is visible so screen readers read it, but the keyboard focus ring absence is flagged under Visuals and repeats here as an interaction-state gap.

2. `DeckColumn.tsx:78` (`scrollRef.current.scrollTop = 0`): the `scrollRef` is attached to the inner div (which has `overflow-y-auto` but is not the constrained scroll container — the outer wrapper in DeckWorkspace holds `max-h`). View-switch scroll reset will silently no-op when the deck column is tall enough to overflow the outer wrapper. At short decks this doesn't matter; at 30+ cards it will. This is the highest-impact functional gap in the phase.

3. StrictMode-safe `loadForDeck` guard (`DeckColumn.tsx:29-34`) mirrors the pattern established in CardSearchSection — positive signal. The abort controller pattern in `DeckColumn.tsx:54-72` is correct for preventing stale-fetch races.

4. `aria-busy={status === 'loading'}` on the search results grid (`CardSearchSection.tsx:237`) is excellent — announces to screen readers that content is being replaced.

---

## Registry Safety

No shadcn registry (`components.json` not present). No third-party component registries used. All components hand-rolled Tailwind v4. Registry audit: skipped (not applicable).

---

## Files Audited

- `/home/alex/Projects/edh-builder/src/components/ViewToggle.tsx`
- `/home/alex/Projects/edh-builder/src/components/DeckListView.tsx`
- `/home/alex/Projects/edh-builder/src/components/DeckGridView.tsx`
- `/home/alex/Projects/edh-builder/src/components/DeckColumn.tsx`
- `/home/alex/Projects/edh-builder/src/components/DeckWorkspace.tsx`
- `/home/alex/Projects/edh-builder/src/components/CommanderPanel.tsx`
- `/home/alex/Projects/edh-builder/src/components/CardResultCell.tsx`
- `/home/alex/Projects/edh-builder/src/components/CardSearchSection.tsx`
- `/home/alex/Projects/edh-builder/src/index.css` (token definitions)
- `/home/alex/Projects/edh-builder/src/lib/card-categorizer.ts` (category order)
- `/home/alex/Projects/edh-builder/.planning/phases/03-deck-building-card-display/03-UI-SPEC.md`
