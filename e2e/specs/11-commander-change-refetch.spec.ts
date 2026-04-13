// e2e/specs/11-commander-change-refetch.spec.ts
// Regression guard for two coupled failure modes around the "Change
// commander" flow, both triggered by React.StrictMode's dev-mode
// effect → cleanup → effect double-invoke when CommanderSearch mounts
// after clearCommander():
//
//   1. Duplicate HTTP: without dedupe, both effect runs dispatch the
//      `t:legendary ... f:commander&order=edhrec` browse request on
//      the wire (cleanup aborts the signal but the HTTP is already in
//      flight). See commit 7405687 (DUP-4).
//
//   2. UI frozen: the first dedupe attempt (ref key + cleanup abort)
//      traded duplicate-on-wire for a stuck-loading bug — cleanup
//      aborted ctrl1, effect #2 no-opped, ctrl1's .then saw the
//      aborted signal and bailed before setResults/setLoading(false).
//      User saw the query on the network panel but skeleton loaders
//      in the UI that never cleared.
//
// This spec asserts BOTH: exactly one browse request fires AND the
// loading skeleton clears after mount (proving setLoading(false)
// ran — the canonical symptom of the stuck-UI bug).
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';

test('clicking Change commander fires exactly one browse request and lets the UI settle', async ({ page }) => {
  // Seed: create a deck and pick a commander so the initial CommanderSearch
  // unmounts. The bug only surfaces on the fresh mount triggered by
  // clearCommander — we need unmount → remount, not just a re-render.
  await createDeck(page, 'Change Commander Refetch');
  await selectCommander(page, 'Thrasios');
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();

  // Start counting *commander browse* requests (t:legendary ... f:commander),
  // excluding the `id<=` auto card-search. Counting starts here so the
  // pre-Thrasios mount's browse hit is excluded.
  const browseRequests: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.pathname !== '/cards/search') return;
    const q = url.searchParams.get('q') ?? '';
    if (/t:legendary/i.test(q) && /f:commander/i.test(q) && !/id<=/i.test(q)) {
      browseRequests.push(q);
    }
  });

  // The click that exercises the buggy path: clearCommander → CommanderSearch
  // mounts fresh → StrictMode double-invokes its mount effect.
  await page.getByRole('button', { name: 'Change commander' }).click();

  // Regression guard A (stuck-UI bug): the skeleton <ul aria-busy="true">
  // must clear. Pre-fix, setLoading(false) was never called because the
  // first effect's .then saw an aborted signal (from its own cleanup)
  // and bailed, and the second effect no-opped under the dedupe. The
  // skeleton stayed on screen indefinitely.
  await expect(page.getByLabel('Search for a commander')).toBeVisible();
  await expect(page.locator('ul[aria-busy="true"]')).toHaveCount(0, { timeout: 5_000 });

  // Also prove the list actually populates by typing a name whose stub
  // fixture returns results. This is the user-visible symptom: "I change
  // commander, I type Atraxa, nothing appears." If setResults never ran
  // on the debounced-query fetch, the result row won't render.
  await page.getByLabel('Search for a commander').fill('Atraxa');
  await expect(page.getByRole('button', { name: /atraxa/i }).first()).toBeVisible();

  // Small settle window so any duplicate-in-flight request from the
  // *Change-commander click itself* is observed before we assert. The
  // 'Atraxa' typing above fires its own (name:Atraxa) browse, which is
  // a legitimate separate request and is captured in browseRequests.
  await page.waitForTimeout(250);

  // Regression guard B (duplicate-on-wire): exactly two commander browses
  // fired from the Change-commander click path —
  //   1× empty-fragment browse on mount (post-clearCommander)
  //   1× name:Atraxa browse after typing
  // Pre-DUP-4 the mount fired 2×, yielding 3 total. This asserts the
  // StrictMode dedupe still works after the cleanup-abort removal.
  const mountBrowses = browseRequests.filter(q => !/name\s*:/i.test(q));
  expect(
    mountBrowses,
    `Empty-fragment commander browse fired ${mountBrowses.length}× on Change-commander mount (expected 1):\n${mountBrowses.join(
      '\n',
    )}`,
  ).toHaveLength(1);
});
