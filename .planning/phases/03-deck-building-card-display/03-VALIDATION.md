---
phase: 3
slug: deck-building-card-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/component) + Playwright (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run test:e2e` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run <changed-file-glob>`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite (unit + e2e) must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

*Planner fills this in during plan generation — each task must have a test target or Wave 0 dependency.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Populated by planner based on RESEARCH.md Wave 0 enumeration (12 new test files, 2 edits, 1 manual Scryfall probe).*

- [ ] Wave 0 test file stubs for deck-cards-store, categorizer, singleton enforcement, changelog writer
- [ ] Playwright specs for add/remove, grid/list toggle, side-by-side layout
- [ ] Manual Scryfall `oracleid:` vs `oracle_id:` probe (documented, one-time)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Commander art_crop visual prominence | UI-02 | Subjective aesthetic quality | Human verifier inspects deck view at ≥1024px; confirms art is "prominent" per UI-SPEC |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
