# E2E Tests (Playwright)

End-to-end browser coverage for the EDH Deck Builder. Unit/integration tests
live under `src/**` and run via `npm test` (Vitest). Playwright is additive
and focuses on real-browser flows that Vitest + jsdom cannot faithfully
exercise.

## Folder Layout

```
e2e/
├── specs/      # *.spec.ts — one file per flow area
├── fixtures/   # Hand-crafted Scryfall JSON (typed via scryfall-api's Card)
└── helpers/    # Shared fixtures (stubScryfall), flow helpers, console gate
```

## Running

```bash
# First-time setup after clone (one-time per machine):
npm install
npm run e2e:install      # downloads chromium + OS deps

# Full suite:
npm run e2e

# Single spec:
npm run e2e -- e2e/specs/00-smoke.spec.ts

# Headed/dev mode (interactive timeline):
npm run e2e:ui

# Typecheck only:
npm run typecheck:e2e
```

## Conventions

- **No real network.** All `api.scryfall.com/*` traffic is intercepted via
  `page.route()` in the `stubScryfall` auto-fixture. Unmatched Scryfall
  routes return HTTP 599 so accidental real traffic fails loudly.
- **Hand-crafted fixtures only.** Each named card referenced by a spec has
  a dedicated `e2e/fixtures/cards/<card>.json` and search response. No
  generic "browse" fixtures.
- **UI-driven setup.** Specs reach their starting state by driving the UI
  (create deck, select commander, etc.) — not by direct Dexie injection.
- **Role/name locators only.** Helpers use `getByRole`, `getByLabel`,
  `getByText`. Any `data-testid` addition must be justified in the PR.
- **Per-test browser context.** Playwright's default per-test context
  provides fresh IndexedDB automatically — do not reuse storage state.

## Console Policy

The cold-start smoke spec (`00-smoke.spec.ts`) is the console gate. It
fails on any `console.error`/`console.warn` except the single
`KNOWN_BENIGN_CONSOLE` allowlist entry (`storage.ts:5` "Persistent storage
not granted"). Other specs do not enforce the console policy unless they
opt in explicitly.

## Standing Rule for Phase 3+

> From Phase 3 onward, every phase plan must include at least one E2E
> spec task covering the phase's user-facing acceptance flows before
> the phase can be marked complete.

See `.planning/PROJECT.md` §Standing Rules for the canonical statement.
Phase planners MUST surface this rule in any plan that introduces
user-facing behavior.

## Adding a New Spec

1. Add the card fixture(s) under `e2e/fixtures/cards/` and corresponding
   search response under `e2e/fixtures/searches/`.
2. Register them in `e2e/helpers/stubScryfall.ts`.
3. Write the spec, importing `{ test, expect }` from
   `'../helpers/stubScryfall'` so the auto-fixture applies.
4. Run `npm run typecheck:e2e` then `npm run e2e -- <your-spec>`.
