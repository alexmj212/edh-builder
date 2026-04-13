// e2e/specs/10-no-commander-search-on-hydration.spec.ts
// Regression guard: opening a deck with a saved commander must NOT fire the
// EDHREC commander browse query. The previous bug: during the hydration window
// (loadForDeck in flight, primaryCommander still null), CommanderPanel rendered
// <CommanderSearch>, whose mount effect immediately dispatched
// `/cards/search?q=(t:legendary+t:creature+or+o:"can+be+your+commander")+f:commander&order=edhrec`
// with an empty name fragment. CommanderSearch unmounted when the commander
// finally loaded, but the HTTP request had already been sent.
//
// Fix (src/components/CommanderPanel.tsx): gate both commander slots on the
// commander-store `loading` flag. A skeleton renders during hydration; the
// search component only mounts after loading resolves AND no commander exists.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';

test('reloading a deck with a saved commander does not fire an empty-fragment commander browse', async ({ page }) => {
  // Seed: create a deck with a saved commander so the reload path exercises hydration.
  await createDeck(page, 'No Commander Browse On Hydration');
  await selectCommander(page, 'Thrasios');
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();

  // Observe requests across the reload. Commander browse queries contain
  // `t:legendary` (per buildCommanderSearchQuery); auto card-search queries use
  // `f:commander` + `id<=`. We guard specifically against the t:legendary shape
  // with no name fragment — that's the empty-fragment browse hit.
  const commanderBrowseRequests: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.pathname !== '/cards/search') return;
    const q = url.searchParams.get('q') ?? '';
    if (/t:legendary/i.test(q) && !/name:/i.test(q)) {
      commanderBrowseRequests.push(q);
    }
  });

  await page.reload();
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await page.waitForTimeout(500);

  expect(
    commanderBrowseRequests,
    `Commander browse query fired during hydration (expected 0):\n${commanderBrowseRequests.join('\n')}`,
  ).toHaveLength(0);
});
