# Phase 2: Commander Selection & Card Search — Discussion Log

**Conducted:** 2026-04-11
**Mode:** Interactive (default)

This is a verbatim audit trail of the discuss-phase Q&A. It is for human reference only; downstream agents should read `02-CONTEXT.md` for decisions.

---

## Areas Selected by User

User chose to discuss all four surfaced gray areas:
1. Commander discovery flow
2. Card search UX
3. Routing & screen structure
4. Card caching strategy

---

## Area 1: Commander Discovery Flow

### Q1 — Where does commander selection happen for a deck?
**Options presented:**
- Dedicated commander panel inside deck workspace (Recommended)
- Modal over deck list
- Required at deck creation

**User chose:** Dedicated commander panel inside deck workspace

### Q2 — How do users discover commanders within that surface?
**Options presented:**
- Search-only with EDHREC-sorted default list (Recommended)
- Search-only, no default browsing
- Tabs: Search / Popular / Recently used

**User chose:** Search-only with EDHREC-sorted default list

### Q3 — How is the partner-commander flow presented?
**Options presented:**
- Two visible slots (Recommended)
- One slot, +Add partner button
- Modal with partner search

**User chose:** Two visible slots

### Q4 — How are invalid partner pairings handled?
**Options presented:**
- Pre-filter the partner search (Recommended)
- Inline error after invalid pick
- Allow any pick, validate at deck-save

**User chose:** Pre-filter the partner search

---

## Area 2: Card Search UX

### Q5 — How does the card search input behave?
**Options presented:**
- Debounced full search only (Recommended)
- Autocomplete dropdown + debounced full search
- Submit-on-enter only

**User chose:** Debounced full search only

### Q6 — How are search filters exposed in the UI?
**Options presented:**
- Form fields per filter (Recommended)
- Single Scryfall syntax box
- Form fields + 'Advanced' toggle for raw syntax

**User chose:** Form fields per filter

### Q7 — How is the commander's color-identity filter shown during search?
**Options presented:**
- Always-on locked chip with explanation (Recommended)
- Toggleable chip
- Invisible / always applied silently

**User chose:** Always-on locked chip with explanation

### Q8 — How does each search result render?
**Options presented:**
- Image-first card with hover/tap details (Recommended)
- Image + full meta visible
- Compact list row

**User chose:** Image-first card with hover/tap details

---

## Area 3: Routing & Screen Structure

### Q9 — Add React Router for per-deck URLs?
**Options presented:**
- Add React Router with /decks/:id (Recommended)
- Stay single-page, drive views from Zustand
- Lightweight hash-based routing (no library)

**User chose:** Add React Router with /decks/:id

### Q10 — How is the deck workspace laid out within /decks/:id?
**Options presented:**
- Tabs: Commander | Search | Deck (Recommended)
- Three-pane: deck nav | active section | persistent deck sidebar
- Single scroll: commander up top, search below, deck below that

**User chose:** Single scroll (commander → search → deck) — overrode the recommended tabs

### Q11 — What happens to the existing DeckList component when the workspace exists?
**Options presented:**
- DeckList stays at `/`, links into `/decks/:id` (Recommended)
- DeckList becomes a sidebar, no separate home page
- Both: DeckList on `/` AND in a collapsible sidebar within workspace

**User chose:** DeckList stays at `/`, links into `/decks/:id`

---

## Area 4: Card Caching Strategy

### Q12 — Should we cache fetched Scryfall card objects?
**Options presented:**
- IndexedDB cache by oracle_id with 7-day TTL (Recommended)
- In-memory session cache only
- No cache for v1

**User chose:** IndexedDB cache by oracle_id with 7-day TTL

### Q13 — Cache full search-result pages too, or just individual cards?
**Options presented:**
- Cards only, not search pages (Recommended)
- Cache last N search queries with results in memory
- Cache search result pages in IndexedDB

**User chose:** Cards only, not search pages

### Q14 — How should the search surface handle API errors and edge cases?
**Options presented:**
- Inline status messages (Recommended)
- Toast notifications for errors
- Throw to error boundary

**User chose:** Inline status messages

### Q15 — How is partner-eligibility detected from Scryfall data?
**Options presented:**
- Parse oracle_text keywords (Recommended)
- Use keywords[] field if Scryfall exposes it
- Maintain a hardcoded compatibility table

**User chose:** Parse oracle_text keywords

---

## Wrap-up

User confirmed "Write context" — no revisits, no additional gray areas surfaced. (User mentioned having an additional thought but it slipped their mind; instructed to proceed.)

---

*End of log.*
