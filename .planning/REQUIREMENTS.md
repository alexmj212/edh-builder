# Requirements: EDH Deck Builder

**Defined:** 2026-04-11
**Core Value:** You can build a valid Commander deck with confidence — the app tells you in real time whether your deck meets every format rule.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Deck Management

- [ ] **DECK-01**: User can create a new deck with a name
- [ ] **DECK-02**: User can rename an existing deck
- [ ] **DECK-03**: User can delete a deck
- [ ] **DECK-04**: User can switch between multiple decks
- [ ] **DECK-05**: User can see a list of all saved decks with last-modified sorting
- [ ] **DECK-06**: All deck data persists in IndexedDB via Dexie.js across browser sessions
- [ ] **DECK-07**: Browser requests persistent storage on first launch (navigator.storage.persist)
- [ ] **DECK-08**: Dexie schema includes a `deckChanges` store for change tracking from day one (add/remove events with timestamps)
- [x] **DECK-09**: Every card add/remove writes a changelog entry to `deckChanges` (enables v2 history features without retrofit)

### Commander Selection

- [x] **CMDR-01**: User can search for a valid commander (legendary creature or "can be your commander")
- [x] **CMDR-02**: User can set a commander for a deck
- [x] **CMDR-03**: User can change the commander of an existing deck (triggers re-validation)
- [x] **CMDR-04**: User can select two partner commanders (generic partner, partner with, friends forever, choose a background)
- [x] **CMDR-05**: Partner pairing is validated — only compatible partner types can be paired

### Card Search

- [x] **SRCH-01**: User can search cards by name via Scryfall API
- [x] **SRCH-02**: User can filter search by card type, color, and text
- [x] **SRCH-03**: Search results automatically filter to commander's color identity (id<= operator)
- [x] **SRCH-04**: Search results show card image (normal size), name, mana cost, type, and color
- [x] **SRCH-05**: Search input is debounced (300-500ms) with AbortController for stale requests
- [x] **SRCH-06**: Scryfall API rate limiting is enforced (100ms minimum between requests)
- [x] **SRCH-07**: Search results paginate (175 per page via Scryfall), with load-more

### Deck Building

- [x] **BUILD-01**: User can add a card from search results to the active deck
- [x] **BUILD-02**: User can remove a card from the deck
- [x] **BUILD-03**: Deck prevents adding duplicate non-basic-land cards (singleton enforcement)
- [x] **BUILD-04**: Deck allows multiple copies of basic lands (12 basic land types recognized)
- [x] **BUILD-05**: User can view deck as a visual card image grid
- [x] **BUILD-06**: User can view deck as a categorized text list (grouped by type: creatures, instants, sorceries, lands, etc.)
- [x] **BUILD-07**: User can toggle between grid and list views
- [x] **BUILD-08**: Card references store `originalReleaseDate` (earliest printing date via oracle_id) for v2 age analysis

### Validation

- [ ] **VALID-01**: Live validation checklist visible while building — updates as cards are added/removed
- [ ] **VALID-02**: Card count check — shows current count vs. required 100 (including commander)
- [ ] **VALID-03**: Color identity check — flags any card outside commander's color identity
- [ ] **VALID-04**: Singleton check — flags duplicate non-basic-land cards by name
- [ ] **VALID-05**: Banned list check — flags cards where legalities.commander is "banned"
- [ ] **VALID-06**: Format legality check — flags cards where legalities.commander is "not_legal"
- [ ] **VALID-07**: Valid commander check — confirms commander is eligible (legendary creature or explicit text)
- [ ] **VALID-08**: Each validation rule shows green (pass) or red (fail) with details on violations

### Import/Export

- [ ] **IO-01**: User can export a deck as standard text format ("1 Card Name" per line)
- [ ] **IO-02**: User can import a deck from pasted text in standard format
- [ ] **IO-03**: Import resolves card names via Scryfall /cards/collection batch endpoint (75 per request)
- [ ] **IO-04**: Import shows errors for unrecognized card names

### UI/UX

- [ ] **UI-01**: Dark mode by default (toggleable to light)
- [x] **UI-02**: Card images lazy-load with placeholder skeletons
- [ ] **UI-03**: Responsive layout — usable on desktop and tablet
- [x] **UI-04**: Commander displayed prominently at top of deck view with art_crop image

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Mana Curve Analysis

- **MANA-01**: Deck view shows mana curve bar chart (card count by mana value 0-7+)
- **MANA-02**: Mana curve updates live as cards are added/removed
- **MANA-03**: Color pip distribution chart (count of W/U/B/R/G symbols across all cards)
- **MANA-04**: Land count recommendation based on curve (suggests total lands and color distribution)

### Theme / Strategy Analysis

- **THEME-01**: User can assign multiple strategy themes to a deck (e.g., voltron + equipment tribal)
- **THEME-02**: Commander-driven theme detection — parse commander's oracle text and type line to auto-suggest relevant themes (e.g., commander references "Frog" → suggest frog tribal)
- **THEME-03**: Curated archetype definitions for common strategies (voltron, aristocrats, spellslinger, mill, tokens, reanimator, tribal, etc.) with mapped keywords/abilities/types
- **THEME-04**: Theme analysis counts how many cards in the deck support each assigned theme
- **THEME-05**: Theme breakdown shows which cards match which theme and why (keyword, type, or oracle text match)
- **THEME-06**: Tribal theme auto-detects creature types from commander and counts matching creatures in deck

### Card Suggestions & Staples

- **SUGG-01**: Card suggestions for a commander sorted by EDHREC rank from Scryfall (order:edhrec)
- **SUGG-02**: Staples checklist — flag missing format staples for the deck's color identity (Sol Ring, Command Tower, etc.)
- **SUGG-03**: Staples list is user-customizable — add/remove cards from what counts as a "staple"

### Power Level / Bracket Assessment

- **PWR-01**: Commander bracket estimate (1-4 + Game Changers) based on deck contents
- **PWR-02**: Count cards on the Game Changers list and surface them prominently
- **PWR-03**: Detect known infinite combo pairs/packages in the deck
- **PWR-04**: Factor tutor density, fast mana count, and interaction density into bracket estimate
- **PWR-05**: Summary display suitable for Rule 0 conversation ("This deck is estimated Bracket 3 with 2 Game Changers and 1 known combo")

### Draw Probability

- **DRAW-01**: Hypergeometric probability display — chance of drawing at least 1 of a card type by turn N
- **DRAW-02**: Breakdown by category (land, creature, removal, ramp, draw) per turn
- **DRAW-03**: Opening hand analysis — probability of a "keepable" hand (e.g., 2-4 lands + at least 1 ramp or draw)

### Set / Card Age Analysis

- **AGE-01**: Show original printing date for each card (earliest release via oracle_id, ignoring reprints)
- **AGE-02**: Deck age summary — average card age, distribution by era (e.g., pre-Modern, Modern era, recent sets)
- **AGE-03**: "Deck trends newer/older" indicator — quick read for table talk ("mostly cards from the last 3 years")

### Deck History & Snapshots

- **HIST-01**: Automatic change log — every add/remove records a timestamped entry
- **HIST-02**: History view showing summarized changes ("You added 10 cards, removed 3")
- **HIST-03**: Milestone snapshots — auto-snapshot when deck first meets minimum criteria (100 cards, all validations pass)
- **HIST-04**: Manual version tagging — user can label a point in history (e.g., "v2 — swapped combo package")
- **HIST-05**: Revert to a previous snapshot

### Enhanced Features

- **ENH-01**: Card autocomplete suggestions while typing in search (via /cards/autocomplete)
- **ENH-02**: Bulk data cache for offline card search
- **ENH-03**: Deck comparison — side-by-side view of two decks

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Server-side storage / user accounts | Local-only for v1, keeps architecture simple |
| Price tracking / budget tools | Adds API complexity and Scryfall warns against caching prices |
| Playtesting / goldfish mode | Large feature, separate project scope |
| Social features (sharing, comments) | No backend — requires server infrastructure |
| Mobile-native app | Web-first, responsive design covers tablet |
| Companion zone support | Rare edge case with significant complexity (Lutri special case) — defer |
| Game Changers / Bracket display | Moved to v2 as PWR-01 through PWR-05 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DECK-01 | Phase 1 | Pending |
| DECK-02 | Phase 1 | Pending |
| DECK-03 | Phase 1 | Pending |
| DECK-04 | Phase 1 | Pending |
| DECK-05 | Phase 1 | Pending |
| DECK-06 | Phase 1 | Pending |
| DECK-07 | Phase 1 | Pending |
| DECK-08 | Phase 1 | Pending |
| DECK-09 | Phase 3 | Complete |
| CMDR-01 | Phase 2 | Complete |
| CMDR-02 | Phase 2 | Complete |
| CMDR-03 | Phase 2 | Complete |
| CMDR-04 | Phase 2 | Complete |
| CMDR-05 | Phase 2 | Complete |
| SRCH-01 | Phase 2 | Complete |
| SRCH-02 | Phase 2 | Complete |
| SRCH-03 | Phase 2 | Complete |
| SRCH-04 | Phase 2 | Complete |
| SRCH-05 | Phase 2 | Complete |
| SRCH-06 | Phase 2 | Complete |
| SRCH-07 | Phase 2 | Complete |
| BUILD-01 | Phase 3 | Complete |
| BUILD-02 | Phase 3 | Complete |
| BUILD-03 | Phase 3 | Complete |
| BUILD-04 | Phase 3 | Complete |
| BUILD-05 | Phase 3 | Complete |
| BUILD-06 | Phase 3 | Complete |
| BUILD-07 | Phase 3 | Complete |
| BUILD-08 | Phase 3 | Complete |
| VALID-01 | Phase 4 | Pending |
| VALID-02 | Phase 4 | Pending |
| VALID-03 | Phase 4 | Pending |
| VALID-04 | Phase 4 | Pending |
| VALID-05 | Phase 4 | Pending |
| VALID-06 | Phase 4 | Pending |
| VALID-07 | Phase 4 | Pending |
| VALID-08 | Phase 4 | Pending |
| IO-01 | Phase 5 | Pending |
| IO-02 | Phase 5 | Pending |
| IO-03 | Phase 5 | Pending |
| IO-04 | Phase 5 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 3 | Complete |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after v2 feature discussion — baked v2 foundations into v1*
