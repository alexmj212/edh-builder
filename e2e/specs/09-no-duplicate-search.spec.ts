// e2e/specs/09-no-duplicate-search.spec.ts
// Regression guard: opening a deck with a commander must not fire the auto-card-
// search twice. The previous bug: CardSearchSection's search effect depended on
// `[debouncedKey, hasCommander]`. When the commander loaded async, `hasCommander`
// flipped false→true and fired the effect immediately with a STALE debouncedKey;
// 400ms later the debouncer caught up and fired the effect AGAIN with the same
// query. Fix (src/components/CardSearchSection.tsx): fold hasCommander into
// searchKey so the null→non-null transition is absorbed by the debouncer.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';

test('selecting a commander fires the auto card-search exactly once', async ({ page }) => {
  await createDeck(page, 'No Duplicate Search');

  // Start counting BEFORE commander selection — that's the trigger path we're
  // guarding against. `cards/search` commander-search requests also pass
  // through this endpoint, so we filter by the query-shape the card-search
  // effect builds: it always includes `f:commander` + `id<=` (color-identity
  // floor). Commander searches use `t:legendary` instead.
  const autoSearchRequests: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.pathname !== '/cards/search') return;
    const q = url.searchParams.get('q') ?? '';
    // Distinguish auto card-search (f:commander + id<=) from commander picker
    // searches (t:legendary). Only count the former.
    if (/f:commander/i.test(q) && /id<=/i.test(q)) {
      autoSearchRequests.push(q);
    }
  });

  await selectCommander(page, 'Atraxa');

  // Wait for the commander to be applied + the debounced auto-search to fire +
  // the request to be observed. 400ms debounce + network settle.
  await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();
  await page.waitForTimeout(800);

  expect(
    autoSearchRequests,
    `Auto card-search fired ${autoSearchRequests.length} time(s). Expected exactly 1.\nQueries:\n${autoSearchRequests.join('\n')}`,
  ).toHaveLength(1);
});
