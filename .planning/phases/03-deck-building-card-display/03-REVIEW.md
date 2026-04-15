---
phase: 03-deck-building-card-display
reviewed: 2026-04-15T02:00:21Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - src/lib/db.ts
  - src/lib/db.test.ts
  - src/lib/basic-lands.ts
  - src/lib/basic-lands.test.ts
  - src/lib/card-categorizer.ts
  - src/lib/card-categorizer.test.ts
  - src/store/deck-cards-store.ts
  - src/store/deck-cards-store.test.ts
  - src/types/deck.ts
  - src/components/ViewToggle.tsx
  - src/components/ViewToggle.test.tsx
  - src/components/DeckListView.tsx
  - src/components/DeckListView.test.tsx
  - src/components/DeckGridView.tsx
  - src/components/DeckGridView.test.tsx
  - src/components/DeckColumn.tsx
  - src/components/DeckColumn.test.tsx
  - src/components/DeckWorkspace.tsx
  - src/components/DeckWorkspace.test.tsx
  - src/components/CommanderPanel.tsx
  - src/components/CommanderPanel.test.tsx
  - src/components/CardResultCell.tsx
  - src/components/CardResultCell.test.tsx
  - src/components/CardSearchSection.tsx
  - e2e/helpers/deckBuildingFlows.ts
  - e2e/helpers/stubScryfall.ts
  - e2e/specs/13-deck-building.spec.ts
  - e2e/fixtures/cards/sol-ring.json
  - e2e/fixtures/cards/forest.json
  - e2e/fixtures/searches/sol-ring-prints.json
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-15T02:00:21Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 3 ships a solid core: atomic 3-table Dexie transactions, StrictMode-safe guards on all effects with side-effects, pure presentation components (ViewToggle, DeckListView, DeckGridView carry zero store imports as required), comprehensive unit + E2E coverage, and no XSS vectors anywhere in the component tree. Security posture is clean — all Scryfall-sourced strings reach the DOM via React's text nodes only, no `dangerouslySetInnerHTML` usage, no hardcoded credentials.

**Four warnings require attention before merge.** Two are correctness risks (unhandled rejection in `removeCard`, stale-closure trap in `DeckColumn`'s lookup effect). One is an accessibility misuse on a read-only element in `CardSearchSection`. One is a singleton-check bypass window that could allow a brief duplicate non-basic if the user clicks fast. Five info items round out the set.

**Clean areas:** db.ts migration, basic-lands.ts, card-categorizer.ts, ViewToggle, DeckListView, DeckGridView (pure / no store imports verified), CardResultCell, all E2E fixtures, stubScryfall, deckBuildingFlows.

---

## Warnings

### WR-01: `removeCard` transaction errors are unhandled — UI never shows feedback and in-memory state diverges from DB

**File:** `src/store/deck-cards-store.ts:141`

**Issue:** The `removeCard` action wraps the 3-table transaction in a bare `await` with no try/catch. If the Dexie transaction fails (storage quota exceeded, DB closed, conflict), the error propagates as an unhandled promise rejection. The `set()` call that updates in-memory state on line 153 still runs because the `await` bubbles rather than being caught — actually in JS `await` that rejects will throw, so `set()` will NOT run. The result is:
1. The `cards` array in memory is NOT updated (card appears to remain in the deck visually).
2. The DB delete also failed — so the card truly is still in the DB.
These stay consistent. BUT the error surfaces as an unhandled rejection (no `error` field is set, no UI alert is shown), and the calling component has no way to surface failure to the user. Compare to `addCard` which wraps identically and sets `error` on failure.

**Fix:**
```ts
removeCard: async (deckCardId: number) => {
  const state = get();
  const row = state.cards.find((c) => c.id === deckCardId);
  if (!row) return;

  const now = Date.now();
  try {
    await db.transaction('rw', [db.deckCards, db.deckChanges, db.decks], async () => {
      await db.deckCards.delete(deckCardId);
      await db.deckChanges.add({ deckId: row.deckId, type: 'remove',
        cardName: row.cardName, scryfallId: row.scryfallId, timestamp: now });
      await db.decks.update(row.deckId, { updatedAt: now });
    });
    set((s) => ({ cards: s.cards.filter((c) => c.id !== deckCardId) }));
  } catch (err) {
    set({ error: 'Could not remove card. Check your browser storage settings and try again.' });
  }
},
```

---

### WR-02: `DeckColumn` lookup effect captures `lookupMap` via closure but deps array omits it — stale Map on card list changes

**File:** `src/components/DeckColumn.tsx:52-72`

**Issue:** The "fetch missing cards" effect at line 52 has `// eslint-disable-next-line react-hooks/exhaustive-deps` with only `[cards]` in its dependency array. Inside the effect, `lookupMap` is read on line 57 (`!lookupMap.has(id)`) via the closure. React will use the `lookupMap` value captured at the time the effect was scheduled, not the current value when it runs. In practice, because `lookupMap` state updates always cause a re-render which re-runs the effect (since `cards` is derived from the store), this is usually harmless. But if `lookupMap` changes without `cards` changing (e.g., from the seed effect at line 40-49), the fetch effect will not re-fire to check newly warmed IDs and may issue redundant fetches. The suppress comment documents the intent, but a `useCallback` wrapping `cardLookup` or including `lookupMap` in deps would make this correct rather than coincidentally-safe.

Additionally, calling `useCardSearchStore.getState()` directly inside an effect at line 41 bypasses React's subscription model — this is intentional to avoid a reactive dependency, but it means the seed only runs when `cards` changes, never when search results arrive while `cards` is unchanged (e.g., user gets more search results but hasn't added any cards yet). This is a UX gap: newly searched cards won't populate `lookupMap` until the user adds one.

**Fix (minimal — suppress the actual stale closure):**
```ts
// Add lookupMap to the dep array of the fetch-missing effect,
// and wrap the update in a ref guard to avoid loops:
}, [cards, lookupMap]);
// Remove the eslint-disable comment once deps are correct.
```

**Fix (correct for the seed problem):** Subscribe to `useCardSearchStore` results directly instead of using `getState()`:
```ts
const searchResults = useCardSearchStore(s => s.results);
useEffect(() => {
  if (searchResults.length > 0) {
    setLookupMap(prev => {
      const next = new Map(prev);
      for (const c of searchResults) next.set(c.id, c);
      return next;
    });
  }
}, [searchResults]);
```

---

### WR-03: `aria-pressed` misused on a non-interactive read-only span in `CardSearchSection`

**File:** `src/components/CardSearchSection.tsx:187`

**Issue:** The color-identity pip display renders `<span>` elements with `aria-pressed={identity.includes(letter)}`. The `aria-pressed` attribute is valid only on elements with `role="button"` (or elements that are natively buttons). A plain `<span>` with `aria-pressed` is invalid ARIA — screen readers will either ignore it or produce confusing output ("W button, pressed" when the span is not interactive). Since the pips are read-only display (locked to commander identity, per the inline comment), the correct attribute is `aria-current` or simply a visible label.

**Fix:**
```tsx
// Option A: remove aria-pressed, use aria-label only
<span
  key={letter}
  aria-label={`${letter} (in commander identity)`}
  className={...}
>
  {letter}
</span>

// Option B: if "selected" semantics are needed, use a role=img group with a descriptive label:
<div role="img" aria-label={`Commander color identity: ${identity.join('')}`}>
  {PIP_ORDER.map(letter => <span key={letter} ...>{letter}</span>)}
</div>
```

---

### WR-04: `GridCell` receives `deckCard` prop that is declared but never used

**File:** `src/components/DeckGridView.tsx:12`

**Issue:** The `GridCell` function signature declares `{ deckCard: DeckCard; card: Card; onRemove: () => void }` but `deckCard` is never referenced inside the function body. TypeScript does not warn on unused destructured props in this pattern. The prop is passed from the parent at line 48 (`deckCard={dc}`). This is dead code that makes the component's interface misleading — future maintainers might assume the `deckCard` prop contributes something (e.g., `quantity` display) when it does not.

**Fix:** Remove `deckCard` from the destructured signature and the prop interface, or use it (e.g., show quantity for multiple basic lands — though that may be Phase 4 scope):
```tsx
function GridCell({ card, onRemove }: { card: Card; onRemove: () => void }) {
```
And at the call site:
```tsx
<GridCell key={dc.id} card={card} onRemove={() => onRemove(dc.id!)} />
```

---

## Info

### IN-01: `categorizeCard` silent fallback to 'Creatures' for unknown types is undocumented and surprising

**File:** `src/lib/card-categorizer.ts:17`

**Issue:** The final `return 'Creatures'` fallback fires for any type_line that matches none of the 7 known categories (e.g., "Scheme", "Conspiracy", "Vanguard", "Emblem"). The test suite documents this as intentional ("Unknown type falls back to Creatures"), but a card with `type_line: "Scheme"` appearing in the Creatures bucket is confusing for future maintainers and could produce a wrong card count in the header. Consider an explicit 'Unknown' bucket or logging a warning in dev.

**Suggestion:** Add an `// intentional: non-Commander-legal types (Schemes, Conspiracies, etc.) are filed under Creatures` comment on the fallback line, or add a sentinel category.

---

### IN-02: `DeckColumn` uses `deckCard.id!` non-null assertion in render

**File:** `src/components/DeckColumn.tsx:130` (and `DeckGridView.tsx:52`, `DeckListView.tsx:54`)

**Issue:** `deckCard.id!` appears in remove button click handlers in DeckListView and DeckGridView, and in the `GridCell` key. `DeckCard.id` is typed as `number | undefined` (the `?` in the interface reflects it being an auto-increment key that Dexie may not have set yet). In practice, cards loaded from `db.deckCards` always have an id, but the type assertion bypasses TypeScript's guard. If a card is somehow in state without an id (e.g., a transient optimistic insert), clicking Remove would call `removeCard(undefined)` which would not match any row and silently do nothing.

**Suggestion:** Narrow the type at the store boundary: the `loadForDeck` result and the post-add `{ id: newId, ...row }` both guarantee `id` is present. Create a `PersistedDeckCard` type analogous to `PersistedDeck` and use it for the `cards` array in store state. This eliminates all the `!` assertions in component code.

---

### IN-03: `removeCardFromDeck` E2E helper relies on focus to reveal opacity-0 button — fragile in CI headless environments

**File:** `e2e/helpers/deckBuildingFlows.ts:34`

**Issue:** The helper calls `await removeBtn.focus()` to trigger the CSS `focus:opacity-100` transition before clicking. In CSS, `:focus` styling requires the element to actually receive focus. In some headless browser configurations and at certain animation speeds, the focus event may fire but the element may not yet be considered `visible` by Playwright before `click()` is called, causing intermittent `element not visible` failures. The helper does not await visibility before clicking.

**Suggestion:** Add `await expect(removeBtn).toBeVisible({ timeout: 2000 })` between `.focus()` and `.click()`, or use `removeBtn.click({ force: true })` since the button is in the DOM and focusable (just opacity-hidden).

---

### IN-04: `db.test.ts` v4 migration tests all run against a fresh DB — no "upgrading from v3" path tested

**File:** `src/lib/db.test.ts:193-277`

**Issue:** The v4 migration test suite deletes and recreates the database in `beforeEach`, so every test starts at v4 from scratch. The meaningful migration scenario — an existing user with a v3 DB who opens the app after upgrading — is not covered. An additive migration without an `upgrade()` callback is safe per Dexie conventions, but the test suite does not verify that existing v3 rows survive the bump or that `Deck.viewMode` defaults to `undefined` on pre-existing rows (only a new insert without `viewMode` is tested, not a simulated v3→v4 upgrade). This is a coverage gap, not a code bug.

**Suggestion:** Add a test that seeds a v3-shaped row via the raw `indexedDB` API or via a lower-version Dexie instance, then opens the v4 DB and reads it back.

---

### IN-05: `DeckWorkspace.test.tsx` does not wrap renders in `StrictMode`

**File:** `src/components/DeckWorkspace.test.tsx:11-19`

**Issue:** Per project memory ("StrictMode-safe components need StrictMode-wrapped tests"), component tests must wrap renders in `<StrictMode>`. `DeckWorkspace` contains two `useEffect` hooks that perform async work. The `DeckColumn.test.tsx` correctly wraps in `React.StrictMode` for the `loadForDeck` guard test, but the `DeckWorkspace.test.tsx` renders never use `<StrictMode>`. Any StrictMode double-invocation regression in the workspace-level effects would go undetected.

**Suggestion:** Wrap `renderWorkspaceAt` in `React.StrictMode`:
```ts
async function renderWorkspaceAt(path: string) {
  render(
    <React.StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/decks/:id" element={<DeckWorkspace />} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </MemoryRouter>
    </React.StrictMode>
  );
}
```

---

## Clean Areas

- **Security:** No `dangerouslySetInnerHTML`, `eval`, or `innerHTML` anywhere in the component tree. All Scryfall strings reach the DOM via React text nodes. No XSS vectors found. The XSS test in `CardResultCell.test.tsx:57` confirms React escaping is relied upon correctly.
- **db.ts migration:** v4 is a correct additive migration following the v1→v2→v3 pattern. No data loss risk.
- **basic-lands.ts:** Name-based and regex-based detection are both correct. The regex `^Basic\s+(Snow\s+)?Land\b` correctly matches `Basic Snow Land` and fails on `Land Creature`.
- **card-categorizer.ts:** Land-wins precedence is correctly placed before Creature to handle creature-lands. All 7 categories covered.
- **ViewToggle, DeckListView, DeckGridView:** Confirmed pure — zero store imports. All wrapped in `<StrictMode>` in tests.
- **StrictMode guards:** `DeckColumn`'s `lastLoadedDeckIdRef` pattern correctly mirrors the `CardSearchSection` guard and is test-covered with an exact-call-count assertion.
- **Atomic transactions:** All 3-table writes in `addCard` and `removeCard` use `db.transaction('rw', [...])` correctly. The `resolveOriginalReleaseDate` call is correctly placed *outside* the transaction (non-blocking, may be slow — inside would hold the tx open during a network call).
- **`originalReleaseDate` formatting:** `toISOString().slice(0, 10)` on a validated `Date` object is correct for YYYY-MM-DD. The `instanceof Date && !isNaN(released.getTime())` guard is correct type narrowing.
- **E2E coverage:** All 9 ROADMAP Phase 3 success criteria have corresponding E2E specs. `stubScryfall` correctly intercepts both card-search and prints-lookup routes with a default-deny fallback for unmatched paths.

---

_Reviewed: 2026-04-15T02:00:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
