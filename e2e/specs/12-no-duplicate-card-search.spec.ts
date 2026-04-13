// e2e/specs/12-no-duplicate-card-search.spec.ts
// Regression guard: on same-deck revisit (back-to-decks → re-open), the card-
// search auto-fire must make exactly one /cards/search request, not two.
//
// Background: React.StrictMode (src/main.tsx) double-invokes mount effects in
// dev. On revisit with a primary commander already in the store, CardSearchSection
// mounts with a non-null debouncedKey on its first render, so the search
// useEffect fires under the StrictMode double-invoke cycle and sends a second
// redundant /cards/search. The first request gets aborted by the second's
// controller.abort() but both are already out on the wire.
//
// (The reload / first-open path doesn't expose this: primary starts null so
// debouncedKey starts null and the effect early-returns on the StrictMode
// double-fire. Only the store-has-primary-on-mount path exposes it, which
// matches exactly the revisit user flow.)
//
// DUP-4 established a ref-based dedupe pattern for CommanderSearch; this guard
// enforces the same pattern for CardSearchSection.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';
import cardSearchSample from '../fixtures/searches/card-search-sample.json' with { type: 'json' };

test('revisiting a deck fires exactly one color-identity /cards/search (StrictMode dedupe)', async ({ page }) => {
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  await page.route(/^https?:\/\/(img\.example|example\.com)\//i, route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }),
  );

  await page.route(/\/cards\/search\?/i, async (route, request) => {
    const url = new URL(request.url());
    const q = url.searchParams.get('q') ?? '';
    if (!/id(%3C%3D|<=)/i.test(q) && !q.includes('id<=')) {
      return route.fallback();
    }
    await route.fulfill({ json: cardSearchSample, status: 200 });
  });

  // Seed: deck with Atraxa. This also populates the card-search store once.
  await createDeck(page, 'Dedupe Guard');
  await selectCommander(page, 'Atraxa');
  await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();
  await expect(page.getByTestId('card-result-cell')).toHaveCount(2);

  // Back to deck list (DeckWorkspace unmounts). commander-store retains primary.
  await page.getByRole('link', { name: /back to decks/i }).click();
  await expect(page).toHaveURL('/');

  // NOW start counting. Re-click the deck — CardSearchSection remounts with
  // a primary commander already in the store, so debouncedKey starts non-null
  // and the StrictMode double-mount exposes the duplicate-fire bug.
  const colorIdSearches: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (!/\/cards\/search\?/i.test(url)) return;
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q') ?? '';
    if (/id(%3C%3D|<=)/i.test(q) || q.includes('id<=')) {
      colorIdSearches.push(url);
    }
  });

  await page.getByRole('heading', { level: 3, name: 'Dedupe Guard' }).click();
  await expect(page).toHaveURL(/\/decks\/\d+$/);
  await expect(page.getByTestId('card-result-cell')).toHaveCount(2);
  await page.waitForTimeout(250);

  expect(
    colorIdSearches,
    `Expected exactly 1 color-identity /cards/search on revisit, got ${colorIdSearches.length}:\n${colorIdSearches.join('\n')}`,
  ).toHaveLength(1);
});
