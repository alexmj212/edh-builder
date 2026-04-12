// e2e/specs/00-smoke.spec.ts
// Cold-start smoke spec — the project's console gate (D-13/D-14/D-15).
// Mirrors Phase 02.1 UAT Test 1.
import { test, expect } from '../helpers/stubScryfall';
import { installConsoleGate } from '../helpers/consoleGate';

test('cold start: app boots with empty deck list and no unexpected console output', async ({ page }) => {
  // Install listener BEFORE navigation — mount-time errors would otherwise be missed (RESEARCH Pitfall 6).
  const unexpected = installConsoleGate(page);

  await page.goto('/');

  // Wait for real first paint (React mounted) — not just DOMContentLoaded.
  await expect(page.getByRole('heading', { name: /your decks/i })).toBeVisible();

  // Empty state OR existing decks both acceptable — what matters is zero console noise
  // outside the single allowlisted storage.ts "Persistent storage not granted" warning.
  expect(
    unexpected,
    `Unexpected console output:\n${JSON.stringify(unexpected, null, 2)}`,
  ).toHaveLength(0);
});
