# EDH Deck Builder

## What This Is

A locally-running web app for building and managing Magic: The Gathering Commander (EDH) decks. Users pick a commander, search and browse cards, build a 100-card deck, and get real-time validation against Commander format rules. All data persists in the browser — no backend required.

## Core Value

You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] Create, rename, and delete multiple decks — Validated in Phase 1: Foundation & Deck Management
- [x] All deck data persisted in browser storage — Validated in Phase 1: Foundation & Deck Management

### Active

<!-- Current scope. Building toward these. -->

- [ ] Select a commander for each deck
- [ ] Search cards by name, type, text, and color via Scryfall API
- [ ] Browse cards with image art, name, mana cost, type, and color
- [ ] Add/remove cards from a deck
- [ ] View deck as visual card grid or categorized text list (toggle)
- [ ] Live validation checklist: exactly 100 cards, color identity, singleton, banned list
- [ ] Export/import deck lists in standard text format
- [ ] All deck data persisted in browser storage (partially validated — IndexedDB layer shipped in Phase 1)

### Out of Scope

- Server-side storage / accounts — local-only for v1, keeps things simple
- Deck statistics / mana curve analysis — planned for v2 (MANA-01 through MANA-04)
- Price tracking / budget tools — adds API complexity, defer
- Playtesting / goldfish mode — large feature, separate project
- Social features (sharing, comments) — no backend

## Context

- Scryfall has a free, well-documented REST API with card images, oracle text, legality data, and color identity — ideal data source
- Commander format: exactly 100 cards including commander, singleton (except basic lands), all cards must match commander's color identity, official banned list
- Target user: someone who plays Commander and wants a lightweight local tool without creating accounts on Moxfield/Archidekt
- Standard text export format: `1 Card Name` per line, widely compatible with other deck tools

## Constraints

- **Tech stack**: Browser-based SPA, no backend services — must work offline after initial card data fetch
- **Data source**: Scryfall API — must respect their rate limits (50-100ms between requests)
- **Storage**: Browser storage only (IndexedDB/localStorage) — no server persistence
- **Performance**: Card search should feel snappy despite hitting an external API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scryfall API for card data | Free, comprehensive, well-documented, includes images and legality | — Pending |
| Browser storage (IndexedDB) | No backend requirement, works offline, user controls their data | Validated (Phase 1) |
| Card image + basics display | Visual-first browsing matches how players think about cards | — Pending |

## Standing Rules

Rules applying to all planning and execution for this project. Downstream
planners (from Phase 3 onward) MUST read this section before writing any
phase plan.

### E2E Coverage (established Phase 02.2, 2026-04-12)

From Phase 3 onward, every phase plan must include at least one E2E spec
task covering the phase's user-facing acceptance flows before the phase
can be marked complete.

- E2E specs live under `e2e/specs/` (Playwright).
- See `e2e/README.md` for conventions (fixture policy, role/name locators,
  UI-driven setup).
- The smoke spec (`e2e/specs/00-smoke.spec.ts`) is the project's console
  gate; other specs do not enforce the console policy by default (D-15).

---
*Last updated: 2026-04-11 after Phase 1 completion*
