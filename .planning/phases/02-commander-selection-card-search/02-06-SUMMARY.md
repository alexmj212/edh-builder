---
phase: 02-commander-selection-card-search
plan: 06
subsystem: card-search-ui
tags: [react, zustand, scryfall, debounce, tdd, overlay, pagination, dfc]
dependency_graph:
  requires:
    - 02-05 (useDebouncedValue, ColorIdentityChip, CommanderPanel wired into DeckWorkspace)
    - 02-03 (useCardSearchStore: filters / results / hasMore / status / search / loadMore / setFilter / reset)
    - 02-02 (buildSearchQuery, getImageUri on scryfall-client)
  provides:
    - CardResultCell component (image cell + hover/focus overlay + disabled Add stub)
    - CardSearchSection component (filter row + color-identity pip strip + grid + load-more + inline states)
    - Read-only pip strip UX per D-07 (commander's color identity IS the filter — not a user toggle)
    - DeckWorkspace finalized (all three placeholder sections now real components)
  affects:
    - src/components/DeckWorkspace.tsx (Card search placeholder replaced)
    - src/components/CommanderPanel.tsx (full-card image rendering + DFC flip)
    - src/lib/scryfall-client.ts (n: → name: keyword fix)
    - .planning/phases/02-commander-selection-card-search/02-UI-SPEC.md (§3 full-card rules added)
tech_stack:
  added: []
  patterns:
    - Ref-guarded prev-oracle-id reset to avoid clobbering store state on initial mount
    - vi.spyOn must target the consumer module's import binding, not the source module (store uses local binding)
    - focus-within + group-hover Tailwind pattern for keyboard-accessible overlays
    - DFC commander flip via card_faces[0/1] toggle in FullCard subcomponent
key_files:
  created:
    - src/components/CardResultCell.tsx
    - src/components/CardResultCell.test.tsx
    - src/components/CardSearchSection.tsx
    - src/components/CardSearchSection.test.tsx
  modified:
    - src/components/DeckWorkspace.tsx (Card search placeholder replaced)
    - src/components/CommanderPanel.tsx (FullCard subcomponent + DFC flip)
    - src/components/CommanderPanel.test.tsx (full-card + flip regression tests)
    - src/lib/scryfall-client.ts (n: → name: in buildSearchQuery, buildCommanderSearchQuery, searchPartnersFor)
    - src/lib/scryfall-client.test.ts (regression assertions that n: shorthand does not sneak back in)
    - .planning/phases/02-commander-selection-card-search/02-UI-SPEC.md (§3 full-card rules)
decisions:
  - "D-07 pip strip is READ-ONLY: the commander's color_identity IS the filter; pips reflect state, do not accept input. aria-pressed conveys state for AT users."
  - "prevPrimaryOracleId ref skips the commander-change reset on initial mount — prevents test state override and no-op effect fires on first render."
  - "Module-level vi.spyOn on scryfall-client export does not reach the store's already-bound import — tests mock via the store's own module boundary instead."
  - "CommanderPanel switched from art_crop banner to full image_uris.normal card so mana cost / type line / oracle text / P/T are readable without hover. Width constrained to max-w-[240px] so two slots fit side-by-side."
  - "DFC commanders get a Flip button toggling card_faces[0] ↔ card_faces[1] (Garruk Relentless, Brisela meld, etc.)."
  - "Scryfall has no `n:` shorthand — the API silently ignores invalid keywords and returns unrelated fallback results. Replaced with `name:` in all three query builders. Tests previously stubbed matching responses so the broken query passed; regression assertions now fail if `n:` returns."
metrics:
  duration: ~2 days (2026-04-11 → 2026-04-12, multi-session)
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 6
  tests_added: 18  # 6 CardResultCell + 10 CardSearchSection + 2 CommanderPanel regression
requirements_closed:
  - SRCH-01
  - SRCH-02
  - SRCH-03
  - SRCH-04
  - SRCH-05
  - SRCH-06
  - SRCH-07
commits:
  - f76724d  # feat(02-06): CardResultCell
  - 5ca8112  # feat(02-06): CardSearchSection + DeckWorkspace wire-in
  - d5bcd1f  # fix(02-06): n: → name: keyword
  - b4ceba8  # feat(02-06): CommanderPanel full-card + DFC flip
---

# Phase 02 Plan 06: Card Search UI Summary

> **Bookkeeping note:** This SUMMARY.md was written retroactively on 2026-04-13 per BOOK-1 in `.planning/HANDOFF.json`. The plan was actually executed across four commits on 2026-04-11/12 (listed above); only the summary artifact was missing when Phase 02 was closed. No code was changed when this summary was written — see commits for authoritative deliverables.

**One-liner:** Image-first card search grid with hover/focus overlay, debounced filter row, color-identity pip display locked to the commander, load-more pagination, and inline states — the last visible piece of Phase 02, delivering SRCH-01..07.

## What Was Built

### Task 1: CardResultCell (commit `f76724d`)

- `src/components/CardResultCell.tsx` — image grid cell using `getImageUri(card, 'normal')` with `loading="lazy" decoding="async"`, `aspect-[488/680]` to avoid layout shift. Group + focus-within overlay reveals name / mana cost / type line / oracle snippet. Disabled Add stub button with `title="Add to deck — coming in Phase 3"`.
- DFC fallback: `getImageUri` reaches into `card_faces[0].image_uris.normal` when top-level `image_uris` is absent.
- 6 RTL tests: lazy-loaded image src, overlay content, XSS safety (literal `<script>` text), DFC fallback, mana-cost omission when empty, disabled Add stub tooltip.

### Task 2: CardSearchSection + DeckWorkspace wire-in (commit `5ca8112`)

- `src/components/CardSearchSection.tsx` — filter row (name / type / oracle text inputs), read-only color-identity pip strip (D-07), responsive results grid (`grid-cols-2 sm:3 md:4 lg:5 xl:6`), Load More button (hidden when `hasMore=false`, disabled while loading), and all five inline states: no-commander banner, loading spinner (`role="status"`), zero-results, API error (`role="alert"` + "Try again"), offline variant.
- Debounce via `useDebouncedValue(composedQuery, 400)` feeding `useCardSearchStore.search`; aborts stale requests through the store's AbortController.
- `DeckWorkspace.tsx` — "Card search placeholder" section replaced; `data-testid="card-search"` preserved.
- 10 RTL tests: no-commander banner, color chip render, debounce timing, loading spinner, zero-results copy, error + offline variants, grid population, Load More visibility + disabled states.
- Auto-fixed during execution:
  - `vi.spyOn(scryfallClient, 'search')` on the source module didn't reach the store's already-bound import — tests mock the store's own module binding instead.
  - `prevPrimaryOracleId` ref added so the commander-change reset doesn't fire on initial mount (was clobbering test state).

### Follow-up fix: `name:` keyword (commit `d5bcd1f`)

Scryfall has no `n:` shorthand — the API **silently** ignores invalid keywords and returns unrelated fallback results (23,703 cards instead of the 2 legitimate matches for "bolt"). Tests stubbed matching responses so the broken query passed. Fixed across `buildSearchQuery`, `buildCommanderSearchQuery`, and `searchPartnersFor`; regression assertions added that fail if `n:` sneaks back in. Verified live against `api.scryfall.com`. This is the incident that seeded the `feedback_verify_external_apis.md` memory.

### Follow-up feat: CommanderPanel full-card + DFC flip (commit `b4ceba8`)

- `CommanderPanel.tsx` — replaced `h-40`/`h-48` art_crop banner with full `image_uris.normal` card so mana cost, type line, oracle text, and P/T are readable without hover.
- New `FullCard` subcomponent: `max-w-[240px] aspect-[63/88] object-contain shadow-md` with a screen-reader caption. Width constrained so both slots fit side-by-side.
- Flip button for DFC commanders (Garruk Relentless, Brisela meld) toggles `card_faces[0]` ↔ `card_faces[1]`.
- Empty-art placeholder updated to match the new aspect ratio — no visible slot resize on selection.
- UI-SPEC §3 updated with the new image rules + dated deviation note.
- 2 regression tests: full-card image (not art_crop), Flip toggle.

## Requirements Closed

| ID | Acceptance | Met by |
|----|------------|--------|
| SRCH-01 | Debounced search against Scryfall | CardSearchSection `useDebouncedValue(400)` |
| SRCH-02 | Results filtered to commander color identity | Read-only pip strip + `buildSearchQuery` `id<=` |
| SRCH-03 | Image-first results grid | CardResultCell + responsive grid |
| SRCH-04 | Name / type / oracle text filters | Filter row in CardSearchSection |
| SRCH-05 | Inline loading / error / zero-results states | Section 8 copy verbatim per UI-SPEC |
| SRCH-06 | Offline variant distinguished from generic error | `!navigator.onLine` branch |
| SRCH-07 | Load-more pagination | Load More button → `useCardSearchStore.loadMore` |

## Verification

- Unit: 18 new tests (6 CardResultCell + 10 CardSearchSection + 2 CommanderPanel regression) — all green at commit time.
- E2E: `e2e/specs/07-card-search.spec.ts` (landed in plan 02.3-05) exercises Load More click + grid-growth against live Scryfall.
- Live API: `d5bcd1f` verified `name:bolt id<=wubg f:commander` returns the 2 expected cards; `atraxa` returns Atraxa first.

## Known Gaps at Phase-02 Close

- None. The post-phase human-verify checkpoint that fired here surfaced the partner-persistence gap (→ Phase 02.1) and later the StrictMode duplicate-call issues (→ post-02.3 polish commits). All have since been closed or tracked in `.planning/HANDOFF.json`.
