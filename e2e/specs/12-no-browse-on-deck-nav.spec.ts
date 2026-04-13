// e2e/specs/12-no-browse-on-deck-nav.spec.ts
// Regression guard for the root-cause bug that DUP-3 (spec 10) masked:
// opening a deck via client-side navigation from the homepage must NOT
// fire the EDHREC empty-fragment commander browse.
//
// Why spec 10 (reload) missed this:
//   On page.reload(), deck-store.loading is true during the reload
//   window. DeckWorkspace.tsx:28-30 returns a "Loading deck..."
//   placeholder instead of rendering CommanderPanel. That placeholder
//   gives loadForDeck time to flip commander-store.loading=true before
//   CommanderPanel renders, so CommanderSearch never mounts.
//
//   On client-side navigation from the homepage, deck-store is already
//   populated (loading=false). DeckWorkspace renders CommanderPanel on
//   its very first render — BEFORE the loadForDeck effect has fired.
//   At that moment commander-store is {loadedDeckId:null, loading:false,
//   primaryCommander:null}, so CommanderPanel renders <CommanderSearch>,
//   which dispatches the EDHREC browse. loadForDeck fires immediately
//   after (effects run bottom-up post-commit), but the HTTP has already
//   landed.
//
// Fix (this commit): commander-store tracks loadedDeckId, set
// synchronously at loadForDeck entry. CommanderPanel gates on
// (loadedDeckId === deckId && !loading) instead of just !loading, so
// the render-before-effect window renders a skeleton.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';

test('navigating from homepage into a deck with saved commander fires zero commander browses', async ({ page }) => {
  // Seed: create a deck with a saved commander, then navigate back to
  // the homepage so the next click into the deck exercises the
  // client-side-nav code path (not a reload).
  await createDeck(page, 'Homepage Nav No Browse');
  await selectCommander(page, 'Thrasios');
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();

  // Back to homepage. This leaves deck-store loaded but commander-store
  // still holds Thrasios. The real user bug we're reproducing is the
  // fresh-tab / cleared-store case, so we hard-reload on the homepage
  // to drop commander-store while keeping the deck row in IndexedDB.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 3, name: 'Homepage Nav No Browse' })).toBeVisible();

  // Start counting commander-browse requests BEFORE the deck click.
  // Filter: t:legendary + f:commander, no name fragment, no id<= (which
  // would indicate the card-search auto-query, a separate expected call).
  const browseRequests: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.pathname !== '/cards/search') return;
    const q = url.searchParams.get('q') ?? '';
    if (/t:legendary/i.test(q) && /f:commander/i.test(q) && !/name\s*:/i.test(q) && !/id<=/i.test(q)) {
      browseRequests.push(q);
    }
  });

  // The actual user action: click the deck card from the homepage list.
  // This is a client-side route change, NOT a reload — deck-store stays
  // populated and DeckWorkspace renders CommanderPanel on its first
  // render, before any loadForDeck effect can flip a loading flag.
  await page.getByRole('heading', { level: 3, name: 'Homepage Nav No Browse' }).click();
  await expect(page).toHaveURL(/\/decks\/\d+$/);

  // Wait for hydration — commander image reappears only after loadForDeck
  // resolves with the saved Thrasios. If we timed out here, the fix
  // probably broke the loading path (skeleton never clears).
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();

  // Settle window: any duplicate-in-flight request is observed, not missed.
  await page.waitForTimeout(500);

  expect(
    browseRequests,
    `Empty-fragment commander browse fired ${browseRequests.length}× on homepage→deck nav (expected 0):\n${browseRequests.join(
      '\n',
    )}`,
  ).toHaveLength(0);
});
