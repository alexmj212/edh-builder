// e2e/specs/08-no-duplicate-commander-fetch.spec.ts
// Regression guard: opening a deck must not duplicate `GET /cards/:id` calls.
//
// Background: React.StrictMode (src/main.tsx) double-invokes mount effects in dev.
// DeckWorkspace's load effect previously had no cleanup, so loadForDeck fired twice
// on mount — yielding 2× Scryfall `cards/:id` requests per commander (plus 2× for
// partner). Fix: AbortController in the effect + signal threaded through loadForDeck
// → fetchCardById. This spec asserts the request count stays at 1 per commander card.
//
// Playwright webServer runs `npm run dev` (vite), which serves the React dev bundle.
// StrictMode's double-invocation is dev-only behavior — production builds do not
// exhibit it. So this spec runs against the exact configuration where the bug lived.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner } from '../helpers/commanderFlows';

test('opening a deck fetches each commander card exactly once (no StrictMode duplicate)', async ({ page }) => {
  // Seed: create a deck with both primary + partner so we also cover the partner path.
  await createDeck(page, 'No Duplicate Fetch');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toBeVisible();

  // Start counting `cards/:id` requests BEFORE the reload — the reload is the
  // exact path that re-runs DeckWorkspace's load effect (fresh mount under StrictMode).
  const byIdRequests: string[] = [];
  page.on('request', req => {
    const url = req.url();
    const m = url.match(/\/cards\/([0-9a-f-]{36})(?:\?|$)/i);
    if (m) byIdRequests.push(m[1]);
  });

  await page.reload();

  // Wait for hydration to complete — commander images reappear only after
  // loadForDeck resolves and CommanderPanel renders the cards.
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toBeVisible();

  // Small settle window so any duplicate-in-flight request is observed, not missed.
  await page.waitForTimeout(250);

  // Assert: each unique id appears exactly once. Using a Map to give a
  // diagnostic-friendly failure message when a duplicate slips in.
  const counts = new Map<string, number>();
  for (const id of byIdRequests) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const duplicates = Array.from(counts.entries()).filter(([, n]) => n > 1);
  expect(
    duplicates,
    `Duplicate cards/:id requests detected — StrictMode guard regressed?\n${JSON.stringify(
      Object.fromEntries(counts),
      null,
      2,
    )}`,
  ).toHaveLength(0);

  // Sanity floor: we must have seen at least one request per commander card.
  expect(counts.size, 'expected one request per unique commander id').toBeGreaterThanOrEqual(2);
});
