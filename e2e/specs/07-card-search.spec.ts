// e2e/specs/07-card-search.spec.ts
// Phase 02.3 Plan 05 regression gate — covers SRCH-01..07 end-to-end against the
// `src/lib/scryfall.ts` wrapper introduced in plan 02.3-02. Asserts the card
// result grid renders from stubbed page-1 data, the Load-more button is
// visible when has_more: true, and clicking it grows the grid with page-2
// data (SRCH-07 E2E coverage per plan 02.3-05 Task 1).
import { test, expect } from '../helpers/stubScryfall';
import { installConsoleGate } from '../helpers/consoleGate';
import { createDeck, selectCommander } from '../helpers/commanderFlows';
import cardSearchSample      from '../fixtures/searches/card-search-sample.json'       with { type: 'json' };
import cardSearchSamplePage2 from '../fixtures/searches/card-search-sample-page2.json' with { type: 'json' };

test.describe('Phase 02.3 — card search regression (SRCH-01..07)', () => {
  test.beforeEach(async ({ page }) => {
    // Block unresolvable fixture image hosts (img.example / example.com) so they
    // don't emit ERR_NAME_NOT_RESOLVED console errors — the console gate below
    // would otherwise flag them as unexpected output. Return a tiny 1×1 PNG.
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await page.route(/^https?:\/\/(img\.example|example\.com)\//i, route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }),
    );

    // Stateful rotation: first card-search hit (q contains `id<=`) → page1;
    // second hit → page2. Registered AFTER stubScryfall's auto-fixture so this
    // handler wins the Playwright LIFO route match. Commander-search requests
    // (q contains `t:legendary`) fall through to stubScryfall's existing handler.
    let cardSearchHits = 0;
    await page.route(/\/cards\/search\?/i, async (route, request) => {
      const url = new URL(request.url());
      const q = url.searchParams.get('q') ?? '';
      // Only intercept card-search (which always contains `id<=`); let commander
      // searches (which contain `t:legendary`) fall through to the default stub.
      if (!/id(%3C%3D|<=)/i.test(q) && !q.includes('id<=')) {
        return route.fallback();
      }
      cardSearchHits++;
      const body = cardSearchHits === 1 ? cardSearchSample : cardSearchSamplePage2;
      await route.fulfill({ json: body, status: 200 });
    });
  });

  test('renders result grid AND pagination click grows the grid', async ({ page }) => {
    const unexpected = installConsoleGate(page);

    // Arrange: create a deck, pick Atraxa as commander — this triggers the
    // CardSearchSection to auto-fire a /cards/search with `id<=bguw f:commander`.
    await createDeck(page, 'Card Search Regression');
    await selectCommander(page, 'Atraxa');

    // Assert page-1 grid renders (SRCH-01 render).
    const cardCells = page.getByTestId('card-result-cell');
    await expect(cardCells).toHaveCount(2);
    await expect(page.getByText('Sol Ring', { exact: false })).toBeVisible();
    await expect(page.getByText('Arcane Signet', { exact: false })).toBeVisible();

    // Load-more is visible because page1 fixture has has_more: true (SRCH-07 UI).
    const loadMore = page.getByRole('button', { name: /load more/i });
    await expect(loadMore).toBeVisible();

    // SRCH-07 E2E coverage: click Load-more, assert grid grows with page-2 cards.
    await loadMore.click();
    await expect(cardCells).toHaveCount(4);
    await expect(page.getByText('Command Tower', { exact: false })).toBeVisible();
    await expect(page.getByText('Exotic Orchard',  { exact: false })).toBeVisible();

    // page2 fixture has has_more: false — Load-more should disappear.
    await expect(loadMore).toHaveCount(0);

    expect(
      unexpected,
      `Unexpected console output:\n${JSON.stringify(unexpected, null, 2)}`,
    ).toHaveLength(0);
  });
});
