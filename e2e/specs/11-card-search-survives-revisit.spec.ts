// e2e/specs/11-card-search-survives-revisit.spec.ts
// Regression guard: when the user opens a deck, goes back, and re-opens the
// same deck, the card-search grid must re-populate.
//
// Root cause (pre-fix): commander-store.loadForDeck synchronously wiped
// primaryCommander → null on every load. On same-deck revisit, that null
// flicker triggered CardSearchSection's prev-ref reset() effect, which aborted
// the in-flight search. When primary was restored to the SAME commander, the
// searchKey (stringify of filters+identity) was identical to its pre-flicker
// value → React's Object.is dep comparison considered debouncedKey unchanged
// → the search effect never re-fired → store stayed at status:'idle' with
// results:[] forever, leaving the grid empty even though 2 /cards/search
// requests had successfully executed before being aborted.
//
// Fix: loadForDeck only wipes primary/partner on cross-deck navigation.
// On same-deck revisit, the commanders stay in place — searchKey is stable,
// the search that fires on remount completes normally, grid renders.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander } from '../helpers/commanderFlows';
import cardSearchSample from '../fixtures/searches/card-search-sample.json' with { type: 'json' };

test.describe('same-deck revisit preserves card-search hydration', () => {
  test.beforeEach(async ({ page }) => {
    // Transparent PNG so fixture image hosts don't emit ERR_NAME_NOT_RESOLVED.
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await page.route(/^https?:\/\/(img\.example|example\.com)\//i, route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }),
    );

    // Return the card-search sample for every `id<=` color-identity query.
    await page.route(/\/cards\/search\?/i, async (route, request) => {
      const url = new URL(request.url());
      const q = url.searchParams.get('q') ?? '';
      if (!/id(%3C%3D|<=)/i.test(q) && !q.includes('id<=')) {
        return route.fallback();
      }
      await route.fulfill({ json: cardSearchSample, status: 200 });
    });
  });

  test('grid re-populates after back-to-decks → re-open same deck', async ({ page }) => {
    // Arrange: deck with atraxa, confirm grid shows on first visit.
    await createDeck(page, 'Revisit Test');
    await selectCommander(page, 'Atraxa');
    await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();

    const cells = page.getByTestId('card-result-cell');
    await expect(cells).toHaveCount(2);

    // Act: back to deck list, then re-click the same deck.
    await page.getByRole('link', { name: /back to decks/i }).click();
    await expect(page).toHaveURL('/');

    await page.getByRole('heading', { level: 3, name: 'Revisit Test' }).click();
    await expect(page).toHaveURL(/\/decks\/\d+$/);

    // Commander still visible (rehydrated from Dexie).
    await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();

    // Assert: card-search grid re-populates. Before the fix this assertion
    // times out because the section is stuck at status:'idle' with no cells
    // rendered — the revisit search was fired, aborted by reset(), and never
    // retried because searchKey was identical pre- and post-flicker.
    await expect(cells).toHaveCount(2);
    await expect(page.getByText('Sol Ring', { exact: false })).toBeVisible();
    await expect(page.getByText('Arcane Signet', { exact: false })).toBeVisible();
  });
});
