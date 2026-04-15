# Architecture Rules — EDH Deck Builder

Durable rules for preventing whole classes of bugs. Each rule is stated, explained ("because…"), and paired with the concrete evidence from this codebase that drove it.

These rules were extracted from a four-agent parallel investigation of the "second-open console message" bug (2026-04-15). The user reported a console message appearing on the second open of a deck (create → open → pick commander → add card → back → reopen); stubbed Playwright repros came back clean, so the bug depends on real Scryfall timing or a state transition the fixtures don't exercise. Rather than hunt for one symptom, we extracted the bug *class* and made it structurally impossible.

**Invariant-first culture:** if a rule is violated, the code is wrong — even if it passes tests. Tests validate rules; they don't replace them.

---

## R-01 — Module-level mutable async state MUST live inside the Zustand `create()` closure, not outside it

**Because:** Any mutable state that affects async behavior but lives outside the store atom is invisible to React DevTools, invisible to time-travel debugging, survives module cache across tests, and cannot be reasoned about locally. Someone reading `create<State>((set, get) => ({...}))` assumes it is the full surface area of the store.

**Evidence:** `src/store/card-search-store.ts:26` declares `let controller: AbortController | null = null` at module scope. `reset()` does correctly call `.abort()` on the captured pointer before nulling it, so the isolated behavior is sound — but the pattern is invisible to every test that uses `useCardSearchStore.getState()` and cannot be exercised by a test that cares about abort ordering. If a future refactor swaps the reset/abort order, no test will catch it.

**Correct pattern:** Put the controller ref inside `create()`:
```ts
export const useCardSearchStore = create<State>((set, get) => {
  let controller: AbortController | null = null;  // closure, not module-level
  return { /* ...actions close over `controller` */ };
});
```

---

## R-02 — Every async store action that can be interrupted MUST accept and thread an `AbortSignal`

**Because:** Without a signal chain from effect → action → network/Dexie call, you cannot cancel on unmount, cannot dedupe StrictMode double-invoke correctly, and cannot protect against rapid cross-deck navigation. The caller has context the store doesn't — only the caller knows when it's time to stop.

**Evidence:** `src/store/commander-store.ts:38` accepts `signal` and checks at three checkpoints. `src/store/deck-cards-store.ts:72` originally did not — fixed in the current commit. The asymmetry was a silent hazard: `DeckWorkspace` aborted commander loads but had no way to abort deck-cards loads, so a rapid deck switch could interleave Dexie reads between two different deckIds.

**Correct pattern:** Every `async` store action that awaits anything (network, Dexie) accepts `signal?: AbortSignal` and checks `if (signal?.aborted) return;` after each await.

---

## R-03 — A "loaded-for-which-deck" sentinel MUST be set synchronously before the first `await` in any `loadForDeck`

**Because:** Between a component's render commit and its load effect firing (or between effect fire and the first Dexie resolution), any sibling component that reads the store sees stale data for the previous deck. The commander-store learned this the hard way in Phase 02 (the "homepage → /decks/N empty-browse bug" — see the comment at `commander-store.ts:39-51`).

**Evidence:** `src/store/deck-cards-store.ts:72` originally set `deckId` only after both DB queries resolved — fixed in the current commit to set `{ deckId, loading: true }` synchronously at entry. Commander-store was already correct.

**Correct pattern:**
```ts
loadForDeck: async (deckId, signal) => {
  set({ deckId, loading: true, error: null });   // ← synchronous, before any await
  const deck = await db.decks.get(deckId);
  if (signal?.aborted) return;
  // …
},
```

Components that render off the store must gate on the sentinel (`loadedDeckId === props.deckId && !loading`), not just on whether data exists.

---

## R-04 — Effects that call `setX` MUST NOT list `x` in their dependency array; use the functional setter form

**Because:** Listing `x` in the deps of an effect that calls `setX` creates a re-render loop on every state change. Even if a guard stops the loop (`if (missing.length === 0) return`), the wasted render passes happen. If the inner work is async and failure-silent, missed writes can cause infinite-retry loops with no backoff.

**Evidence:** `src/components/DeckColumn.tsx:54-73` originally listed `lookupMap` in deps and called `setLookupMap` inside — fixed in the current commit. Combined with `.catch(() => null)` on `fetchCardById`, failed ids stayed "missing" on every render and re-fired the fetch on each cycle with no circuit breaker. On persistent network failure this was an uncontrolled retry loop.

**Correct pattern:**
```ts
useEffect(() => {
  setX(prev => deriveNext(prev, input));
}, [input]);   // not [input, x]
```

If the effect needs to track failures that would cause repeated retries, maintain a `useRef<Set<...>>` alongside the state and consult it before retry.

---

## R-05 — The "abort on cleanup" and "dedupe via ref" patterns MUST NOT coexist in the same effect for the same request

**Because:** They contradict each other. Abort-on-cleanup kills the request started by the effect instance currently cleaning up. Ref-based dedupe prevents the next effect instance from re-launching the request. Combined, you get: either (a) request aborted AND next run no-ops (leaving UI stuck), or (b) the order accidentally works but is invisible to future maintainers who touch one pattern without understanding the other.

**Evidence:** `src/components/DeckColumn.tsx` originally used `lastLoadedDeckIdRef` alongside an effect that spawned its own AbortController. `src/components/CommanderSearch.tsx:27-33` deliberately does NOT abort on cleanup specifically because it uses ref-dedup — the comment explains this, but the asymmetry between these two components with identical-looking code was a maintenance hazard. Fixed in the current commit: DeckColumn uses abort-only; the ref gate was removed.

**Correct pattern:** Pick one per effect.
- **Abort-based** (preferred for store loads): fresh AbortController each effect run, cleanup calls `.abort()`, store action checks signal at every await.
- **Ref-based** (only for true "once-per-key" operations where the request itself cannot be aborted): use a ref that records the key, never combine with cleanup abort.

Any component that combines them needs a block comment explaining why; the default position is that combining them is a bug.

---

## R-06 — `loadForDeck` / any gated loader MUST leave the store in a renderable state on every exit path

**Because:** If a loader sets `loading: true` and exits via abort without clearing it, the store stays in a "loading" state forever (until a later unaborted loader resolves it). If the component never gets a re-mount (user navigates to a non-deck route), the stuck state is invisible but real. Future loaders that short-circuit on same-deck revisit may inherit the sticky flag.

**Evidence:** `src/store/commander-store.ts:86-88` deliberately does not reset `loading` on abort, relying on the next effect invocation to resolve it. This works under StrictMode (cleanup → remount → new load clears it) but leaves a latent trap: if the component genuinely unmounts without remount, `loading: true` persists in module state. Not fixed in this round (architectural decision deferred), but rule is documented so future loaders handle every exit explicitly.

**Correct pattern:** On abort, either (a) set `loading: false` and treat the abort as a clean "no result" state, or (b) document at the call site exactly who is responsible for clearing it, and write a test that asserts the clear happens.

---

## R-07 — Store-level duplicate guards MUST re-check against the authoritative source immediately before the write, not before the async gap

**Because:** The interval between reading in-memory state and writing to the DB can be arbitrarily long (hundreds of ms for a Scryfall call). Two concurrent callers race through the gap, both pass the guard, both write. UI-layer debounces (`addingIds` sets, disabled buttons) are bypassable — anything programmatic (tests, scripted imports, future features) goes straight to the store.

**Evidence:** `src/store/deck-cards-store.ts:85-91` originally checked `state.cards` for duplicates, then awaited `resolveOriginalReleaseDate` (~200ms Scryfall call), then wrote. Fixed in the current commit: a re-check inside the Dexie transaction queries `db.deckCards` by `deckId` index, filters to `scryfallId`, and aborts the write if a concurrent caller won.

**Correct pattern:** Inside the write transaction, re-read the authoritative source (Dexie, not `get()`'s in-memory snapshot) and make the duplicate decision there.

---

## R-08 — `useRef`-based dedupe MUST NOT gate writes that could be legitimately re-issued on same-key revisit

**Because:** `useRef` persists for the lifetime of the component instance, including across StrictMode's simulated unmount. That's *intentional* for StrictMode safety. But on a genuine route unmount + remount to the same route key (e.g. back-navigate + re-open same deck), the component instance is fresh and the ref is fresh — so legitimate reloads fire. *However*, if a future refactor memoizes or keys the component differently, the ref silently blocks the reload and the user sees stale data.

**Evidence:** `src/components/DeckColumn.tsx:28-35` (removed in the current commit) used `lastLoadedDeckIdRef` to gate `loadForDeck`. Analysis showed the ref does reset correctly on genuine unmount (it's per-instance), but the abort-signal pattern is strictly safer: it produces the same dedup under StrictMode (second invocation aborts before first await) without creating a "what if the component instance is recycled?" invariant.

**Correct pattern:** Prefer abort-based dedup (R-05). If you must use a ref, write an explicit e2e test that closes + reopens the same route and asserts the ref path fires.

---

## R-09 — `.catch(() => null)` / silent failure handlers MUST be paired with a fallback-tracking mechanism

**Because:** Silently catching a failure and omitting the bad id from a collection causes the collection to "want" the id every cycle. Without a tracker (`failedIdsRef`, error state, retry budget), the next render will try again, fail again, silently omit again, and repeat — an infinite retry loop invisible to tests and users.

**Evidence:** `src/components/DeckColumn.tsx:61` originally did `fetchCardById(id).catch(() => null)` with no tracker. Fixed in the current commit: `failedIdsRef` records nulls and excludes them from future `missing` calculations.

**Correct pattern:** Either (a) surface the failure via error state, (b) track failures and skip them on retry, or (c) have a bounded retry budget. Never silently drop and hope for the best.

---

## R-10 — Card-cache reads MUST be consulted before falling back to `fetchCardById`

**Because:** Cards that were added to a deck in a prior session exist in Dexie's `cards` cache table. `DeckColumn` currently seeds `lookupMap` from search results (in-memory) and then falls back to network — the persistent cache is never consulted. This causes a redundant network call on every second-open for cards that were cached from the first open.

**Evidence:** `src/components/DeckColumn.tsx:54-73` — missing cards go straight to `fetchCardById`. `src/lib/card-cache.ts` (read-side not consulted here). Not fixed in this round — larger refactor; rule is documented for future work.

**Correct pattern:** `(searchResults || cache.get(id) || fetchCardById(id))`, in that order. Warms the map without a network hit for cached cards.

---

## R-11 — Every async test MUST wrap the code under test in `<React.StrictMode>` when the component uses effects with cleanup semantics

**Because:** The app runs under StrictMode in dev (`src/main.tsx`). Tests that mount without StrictMode run effects once; tests under StrictMode run them twice. Bugs that only appear on the second invocation (stale refs, double-fetches, unsafe module singletons) are invisible to non-StrictMode tests. This is a memory-backed user preference (`feedback_strictmode_test_coverage.md`).

**Evidence:** `src/components/DeckColumn.test.tsx:195-207` already does this — the StrictMode wrapper catches exactly the bug class we're hardening against.

**Correct pattern:** Render under `<React.StrictMode>`, assert exact call counts (not "at least N"), and pair with an e2e test that asserts BOTH request count AND rendered content.

---

## R-12 — Every phase MUST ship a Playwright spec that asserts — not merely captures — console output

**Because:** Observation without assertion is not a test. A captured console log that prints to stdout passes CI whether the app is healthy or broken. The `installConsoleGate` helper returns an `unexpected` array; if no spec calls `expect(unexpected).toHaveLength(0)`, the gate is ornamental.

**Evidence:** `e2e/specs/99-repro-second-open.spec.ts:48-80` installs `installConsoleGate(page)` but never asserts on the returned `unexpected` array — it prints contents to console and succeeds. This was the repro harness for the bug we're fixing; without an assertion it would have passed even when the bug fires.

**Correct pattern:**
```ts
const unexpected = installConsoleGate(page);
// … exercise flow …
expect(unexpected, unexpected.map(m => `${m.type}@${m.location}: ${m.text}`).join('\n')).toHaveLength(0);
```

When new noise is discovered and deemed benign, add it to `KNOWN_BENIGN_CONSOLE` with a stated reason — do not weaken the assertion.

---

## R-13 — "Stubbed tests pass" is not proof the feature works against real external APIs

**Because:** Stubs have zero network latency, predictable response shapes, and no rate limits. Race conditions, malformed-response handlers, and timing-dependent bugs only surface against real services. This is a memory-backed user preference (`feedback_verify_external_apis.md`).

**Evidence:** The bug under investigation was not reproducible against stubs; Agent investigation confirmed the race windows require real Scryfall latency (~100-500ms). Phases that ship without live-API verification are vulnerable to this class of bug.

**Correct pattern:** At least one verification per phase that touches an external API must hit the real service (gated behind `RUN_LIVE_API=1` or similar). The CI default stays stubbed; the local pre-merge check hits reality.

---

## Meta — When a rule is violated

1. **Open a fix PR immediately** — a violation is not technical debt to park; it's a latent production bug.
2. **If you need to violate a rule temporarily**, add a `// ARCH-RULE-WAIVER: R-0X — <why, with ticket link>` comment. Grep for these in code review.
3. **If the rule itself is wrong**, update this file in the same PR that removes the violation. Don't let drift accumulate.

---

## Changelog

| Date | Rules added / changed | Driver |
|------|----------------------|--------|
| 2026-04-15 | R-01 through R-13 initial set | Second-open bug investigation — four-agent audit of `src/store/*`, `src/components/DeckColumn.tsx`, `src/components/CommanderSearch.tsx`, lifecycle patterns |
