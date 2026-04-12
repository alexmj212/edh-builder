---
phase: 02
slug: commander-selection-card-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vite.config.ts` (inline `test` block) |
| **Quick run command** | `npx vitest run --reporter=verbose <changed file>` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose <changed file>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Filled in by gsd-planner when generating PLAN.md files. Each task must map to a row below with a runnable command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-XX-XX | XX | 0 | CMDR-04, CMDR-05 | — | Pure partner-detection function | unit | `npx vitest run src/lib/partner-detection.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | CMDR-01, SRCH-01..04, SRCH-06 | T-02-01 (rate limit) | Rate-limited, abortable Scryfall client | unit | `npx vitest run src/lib/scryfall-client.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | Cache (D-12..14) | — | TTL-based read-through cache | unit | `npx vitest run src/lib/card-cache.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | CMDR-02, CMDR-03 | — | Commander assignment + reset semantics | unit | `npx vitest run src/store/commander-store.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | SRCH-05, SRCH-07 | — | Abort + paginated search store | unit | `npx vitest run src/store/card-search-store.test.ts` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | Routing | — | Workspace routing + not-found state | integration (RTL + MemoryRouter) | `npx vitest run src/components/DeckWorkspace.test.tsx` | ❌ W0 | ⬜ pending |
| 02-XX-XX | XX | 0 | Migration | — | Dexie v1 → v2 preserves decks | unit (fake-indexeddb) | `npx vitest run src/lib/db.test.ts` | ❌ W0 (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/partner-detection.test.ts` — stubs for CMDR-04, CMDR-05
- [ ] `src/lib/scryfall-client.test.ts` — stubs for CMDR-01, SRCH-01..04, SRCH-06
- [ ] `src/lib/card-cache.test.ts` — stubs for cache read-through, TTL, bulkPut
- [ ] `src/store/commander-store.test.ts` — stubs for CMDR-02, CMDR-03
- [ ] `src/store/card-search-store.test.ts` — stubs for SRCH-05, SRCH-07
- [ ] `src/components/DeckWorkspace.test.tsx` — stubs for routing + not-found
- [ ] `src/lib/db.test.ts` — extend with v1 → v2 migration coverage
- [ ] `npm install react-router-dom` — required dep not yet present

---

## What to Mock

- **`fetch`** — Use `vi.spyOn(globalThis, 'fetch').mockResolvedValue(...)` or `vi.mock`. No real network calls in tests.
- **Dexie/IndexedDB** — `fake-indexeddb` is already auto-imported in `src/test/setup.ts`. No additional setup.
- **`Date.now`** — Use `vi.useFakeTimers()` for TTL and rate-limiter timing.
- **Rate limiter state** — Export `__resetRateLimit()` from `scryfall-client.ts`; call in `beforeEach`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser back/forward navigates between `/` and `/decks/:id` correctly | Routing (D-09) | True browser history not exercised in MemoryRouter tests | Open app → click deck → click browser Back → confirm DeckList renders → click Forward → confirm workspace renders |
| Image-first card grid feels visually correct on desktop and touch | D-08 | Visual polish + responsive feel cannot be unit-tested | Open workspace, search "lightning", confirm grid renders with hover-reveal on desktop and tap-reveal on touch |
| Search disabled state communicates clearly when no commander selected | D-07 | Copy + visual emphasis judged by eye | Open workspace without commander, confirm search field shows "Pick a commander first to start searching cards." |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
