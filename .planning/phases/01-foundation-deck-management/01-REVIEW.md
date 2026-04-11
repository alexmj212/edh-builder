---
phase: 01-foundation-deck-management
status: issues_found
files_reviewed: 14
findings:
  critical: 0
  warning: 7
  info: 5
  total: 12
---

# Phase 01 Code Review

Reviewer: Claude Code (gsd-code-review)
Date: 2026-04-11
Scope: src/App.tsx, src/components/DeckList.tsx, src/components/DeckList.test.tsx, src/components/Layout.tsx, src/components/ThemeToggle.tsx, src/index.css, src/lib/db.ts, src/lib/db.test.ts, src/lib/storage.ts, src/main.tsx, src/store/deck-store.ts, src/store/deck-store.test.ts, src/types/deck.ts, vite.config.ts

---

## Findings

### W-01 — State desync: `activeDeckId` set after a separate `loadDecks` call

**Severity:** warning
**File:** `src/store/deck-store.ts`
**Lines:** 26–39

`createDeck` calls `loadDecks()` first and then calls `set({ activeDeckId: numericId })` in a second state update. These are two independent `set` calls, so React/Zustand subscribers see two renders. More importantly, if `loadDecks` fails (IndexedDB error), the active ID is never set — the deck exists in the DB but the store is left in an inconsistent state because the error falls through. The two writes should be merged into one `set` call, and the ID should be derived from the freshly loaded decks list or set atomically with it.

**Suggested fix:**
```ts
createDeck: async (name: string) => {
  const now = Date.now()
  const id = await db.decks.add({ name, commanderId: null, commanderName: null, colorIdentity: [], createdAt: now, updatedAt: now }) as number
  const decks = await db.decks.orderBy('updatedAt').reverse().toArray()
  set({ decks, loading: false, activeDeckId: id })
  return id
},
```

---

### W-02 — Unhandled promise rejections throughout the store

**Severity:** warning
**File:** `src/store/deck-store.ts`
**Lines:** 21–58

None of the async store actions (`loadDecks`, `createDeck`, `renameDeck`, `deleteDeck`) have try/catch blocks. An IndexedDB failure (quota exceeded, browser private-mode restrictions, upgrade error) will throw an unhandled promise rejection and leave `loading` permanently `true` for `loadDecks`, or leave the UI optimistically showing a create/rename/delete that silently failed. At minimum `loadDecks` should catch errors and expose them in state so the UI can show a meaningful error message.

**Suggested fix:**
```ts
// Add an error field to DeckState:
error: string | null

// Then in loadDecks:
loadDecks: async () => {
  try {
    const decks = await db.decks.orderBy('updatedAt').reverse().toArray()
    set({ decks, loading: false, error: null })
  } catch (err) {
    set({ loading: false, error: 'Failed to load decks. Please reload.' })
  }
},
```

---

### W-03 — `ThemeToggle` reads `document` during render (SSR / test hazard) and does not persist initial theme across mounts

**Severity:** warning
**File:** `src/components/ThemeToggle.tsx`
**Lines:** 4–6

The `useState` initializer calls `document.documentElement.classList.contains('dark')` synchronously during render. This works in the browser but will throw in any environment that lacks `document` (SSR, certain test runners configured with `node` environment). Because `jsdom` provides `document`, tests pass today — but the pattern is fragile.

More practically: `main.tsx` strips the `dark` class when `savedTheme === 'light'`, but does nothing when the key is absent or `'dark'`. The initial HTML has `class="dark"` on `<html>`, so the default is implicitly dark — but the state initializer in `ThemeToggle` will still correctly read `true` in that case. This is fine, but the theme initialisation logic is split across two files (`main.tsx` and `ThemeToggle.tsx`) with no single source of truth, making it easy to introduce a mismatch when the logic is extended (e.g., adding a "system" option).

**Suggested fix:** Extract theme logic into a dedicated `useTheme` hook or a small theme store that reads/writes `localStorage` and applies the class. The component then just consumes it.

---

### W-04 — `DeckCardItem` internal state (`renameValue`) does not sync when `deck.name` changes externally

**Severity:** warning
**File:** `src/components/DeckList.tsx`
**Lines:** 22–23

`renameValue` is initialised from `deck.name` once on mount:
```ts
const [renameValue, setRenameValue] = useState(deck.name)
```
If the same deck is renamed from another location (e.g., a future bulk-import feature, sync, or concurrent tab) the stale `renameValue` will silently overwrite the newer name on the next rename submit. The Rename button handler resets it (line 95), which is a partial fix, but a defensive `useEffect` sync is the correct pattern:

```ts
useEffect(() => {
  if (!renaming) setRenameValue(deck.name)
}, [deck.name, renaming])
```

---

### W-05 — Rename submit does not reset `renameValue` to `deck.name` on empty input

**Severity:** warning
**File:** `src/components/DeckList.tsx`
**Lines:** 26–32

`handleRenameSubmit` returns early without calling `onRename` when `trimmed` is empty or equals `deck.name`. This is correct for not persisting a no-op. However, it does not reset `renameValue` back to `deck.name` — it only hides the input. If the user opens rename, clears the field, and presses Enter (or blurs), `renameValue` is left as an empty string. The next time they click Rename the input will be pre-populated with `""` instead of the current name. The Rename button handler resets it via `setRenameValue(deck.name)` (line 95), which masks this for the button click path, but the keyboard shortcut path (Escape resets, Enter does not reset on no-op) can still expose the stale state.

**Suggested fix:**
```ts
const handleRenameSubmit = () => {
  const trimmed = renameValue.trim()
  if (trimmed && trimmed !== deck.name) {
    onRename(deck.id!, trimmed)
  }
  setRenameValue(deck.name)  // always reset
  setRenaming(false)
}
```

---

### W-06 — `onDelete` and `onRename` use `deck.id!` non-null assertion on an optional field

**Severity:** warning
**File:** `src/components/DeckList.tsx`
**Lines:** 29, 74

`Deck.id` is typed as `id?: number` (optional) because Dexie auto-generates it. By the time a deck appears in the `decks` array from the store it always has an `id`, but the TypeScript type does not guarantee this. Using `deck.id!` suppresses the compiler check. A deck passed without an `id` (e.g., in a test or future feature) would produce `onRename(undefined, name)` or `onDelete(undefined)` and silently corrupt the DB call.

Two safer approaches:
1. Create a `PersistedDeck` type that extends `Deck` with `id: number` (required) and use it wherever the store returns loaded decks.
2. Add a runtime guard: `if (deck.id == null) return`.

The first approach is preferred as it propagates type safety to the store interface.

---

### W-07 — `db.test.ts`: `beforeEach` does not use `fake-indexeddb` correctly — instantiates a new DB without a fresh IDB environment

**Severity:** warning
**File:** `src/lib/db.test.ts`
**Lines:** 7–12

The `beforeEach` block calls `db.delete()` on a first instance, then constructs a second `new EDHBuilderDB()` — but both instances share the same underlying fake-indexeddb store because `fake-indexeddb/auto` is patched globally in the test setup file and the DB name `'EDHBuilder'` is fixed. This means tests are isolated only because `db.delete()` drops and the new instance re-opens the schema — which is correct and actually works. However, the pattern is fragile: if the first `db` instance never successfully opened (e.g., schema error) the `delete()` call can fail, causing all subsequent tests to bleed state.

A more robust approach is to use a unique database name per test run (e.g., `new EDHBuilderDB(\`EDHBuilder-${crypto.randomUUID()}\`)`) or rely on the global setup to reset the fake IDB environment. The `DeckList.test.tsx` and `deck-store.test.ts` files import the singleton `db` directly from `../lib/db`, which means all three test files share the same underlying database instance when running in the same worker — test order can affect results.

---

### I-01 — `main.tsx`: `requestPersistentStorage()` result is silently ignored at the call site

**Severity:** info
**File:** `src/main.tsx`
**Lines:** 19

`requestPersistentStorage()` is called fire-and-forget. The function internally logs a `console.warn` when not granted, but the app takes no action. For a deck builder, persistent storage matters significantly — a user who stores many decks could lose data when the browser evicts the IndexedDB under storage pressure. This is acceptable for phase 01 as a stub, but the returned `Promise<boolean>` should feed into a future UI-level warning or notification when storage is not persistent.

---

### I-02 — `index.css`: Only dark-mode tokens are defined; light-mode tokens are absent

**Severity:** info
**File:** `src/index.css`
**Lines:** 3–17

All `@theme` tokens are defined with dark-mode values (dark background, light text). The `@custom-variant dark (&:where(.dark, .dark *))` declaration exists but there are no corresponding light-mode overrides. When the `dark` class is removed from `<html>`, the same dark token values remain active — the light mode does not actually change the appearance. This appears to be an intentional scaffold decision (dark-only for now), but the ThemeToggle component and `main.tsx` both fully implement the switching logic, creating dead UI behaviour.

Either the light-mode token set should be added, or the ThemeToggle should be removed/disabled until it is.

---

### I-03 — `Deck.colorIdentity` stores color strings without validation

**Severity:** info
**File:** `src/types/deck.ts`
**Lines:** 6

`colorIdentity: string[]` accepts any string values. Magic color identity has a well-known domain (`W`, `U`, `B`, `R`, `G`). Using a union type `('W' | 'U' | 'B' | 'R' | 'G')[]` gives compile-time guarantees and makes intent explicit. The project already has `zod` in `package.json`, which could be used for runtime validation when data comes in from the Scryfall API.

---

### I-04 — `DeckList.test.tsx`: Tests do not use `userEvent` for interaction tests

**Severity:** info
**File:** `src/components/DeckList.test.tsx`
**Lines:** 1–62

The component test file renders components and queries the DOM but only tests initial/loaded states — it does not cover any user interactions (create, rename, delete, key navigation). `@testing-library/user-event` is already installed. Given that `DeckCardItem` has meaningful interaction logic (rename input, confirm-delete flow, keyboard events), interaction coverage should be added in a follow-up.

---

### I-05 — `DeckList` "loading" guard prevents rendering when `useEffect` has not yet fired

**Severity:** info
**File:** `src/components/DeckList.tsx`
**Lines:** 146–148

The store initialises `loading: true`, and `DeckList` renders `"Loading decks..."` immediately on the first render — before `useEffect` fires and calls `loadDecks`. This is the intended behavior, but if `loadDecks` is already called elsewhere before `DeckList` mounts (e.g., from a route guard or parent), the component still passes through the loading state because the store's `loading` flag starts as `true`. This is a minor data-flow concern, but worth noting for when the app grows: the loading flag should be scoped or reset at component mount if the store can be pre-populated.
