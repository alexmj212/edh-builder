# EDH Deck Builder

## What This Is

A locally-running web app for building and managing Magic: The Gathering Commander (EDH) decks. Users pick a commander, search and browse cards, build a 100-card deck, and get real-time validation against Commander format rules. All data persists in the browser — no backend required.

## Core Value

You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Create, rename, and delete multiple decks
- [ ] Select a commander for each deck
- [ ] Search cards by name, type, text, and color via Scryfall API
- [ ] Browse cards with image art, name, mana cost, type, and color
- [ ] Add/remove cards from a deck
- [ ] View deck as visual card grid or categorized text list (toggle)
- [ ] Live validation checklist: exactly 100 cards, color identity, singleton, banned list
- [ ] Export/import deck lists in standard text format
- [ ] All deck data persisted in browser storage

### Out of Scope

- Server-side storage / accounts — local-only for v1, keeps things simple
- Deck statistics / mana curve analysis — nice-to-have, not core
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
| Browser storage (IndexedDB) | No backend requirement, works offline, user controls their data | — Pending |
| Card image + basics display | Visual-first browsing matches how players think about cards | — Pending |

---
*Last updated: 2026-04-11 after initial project definition*
