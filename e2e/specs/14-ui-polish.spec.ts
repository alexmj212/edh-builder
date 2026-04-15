// e2e/specs/14-ui-polish.spec.ts
// Phase 03.1 — UI Polish regression coverage
// Covers UI-REVIEW Priority Fixes #1 (CommanderPanel focus rings),
// #2 (DeckColumn scroll-ref lift), and #3 (CardResultCell focus state).
import { test, expect } from '../helpers/stubScryfall';
import { installConsoleGate } from '../helpers/consoleGate';
import { createDeck, selectCommander } from '../helpers/commanderFlows';
import solRing from '../fixtures/cards/sol-ring.json' with { type: 'json' };
import forest  from '../fixtures/cards/forest.json'   with { type: 'json' };

// Deck-building search results (Atraxa's WUBG color identity permits colorless Sol Ring + Forest)
const DECK_SEARCH_RESULTS = {
  object: 'list',
  total_cards: 2,
  has_more: false,
  data: [solRing, forest],
};

// Tiny transparent PNG for image stubs — prevents ERR_NAME_NOT_RESOLVED console noise.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Phase 03.1 — UI Polish', () => {
  test.beforeEach(async ({ page }) => {
    // Block image hosts that would otherwise raise DNS errors
    await page.route(/^https?:\/\/(img\.example|example\.com)\//i, route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG }),
    );

    // Route card-search for deck-building queries to our inline fixture.
    // Commander searches (t:legendary) + prints lookups (unique=prints) fall
    // through to stubScryfall's defaults.
    await page.route(/\/cards\/search\?/i, async (route, request) => {
      const url = new URL(request.url());
      const q = url.searchParams.get('q') ?? '';
      const unique = url.searchParams.get('unique') ?? '';

      if (unique === 'prints') return route.fallback();
      if (/t:legendary/i.test(q)) return route.fallback();
      if (/f:commander/i.test(q) || /id<=/i.test(q)) {
        return route.fulfill({ json: DECK_SEARCH_RESULTS, status: 200 });
      }
      return route.fallback();
    });
  });

  async function setupDeck(page: Parameters<typeof createDeck>[0]) {
    await createDeck(page, 'Phase 03.1 UI Polish Deck');
    await selectCommander(page, 'Atraxa');
    // Wait for the post-commander-selection search results to land
    await expect(page.getByText('Sol Ring', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  }

  // ── Test 1 — CommanderPanel "Change commander" focus ring ────────────────────
  test('CommanderPanel "Change commander" button shows focus ring on keyboard focus', async ({ page }) => {
    const unexpected = installConsoleGate(page);
    await setupDeck(page);

    const btn = page.getByRole('button', { name: 'Change commander' });
    await expect(btn).toBeVisible({ timeout: 8000 });

    // Move real keyboard focus onto the element (not just .focus() JS call, so we
    // exercise :focus-visible-adjacent styling paths identically).
    await btn.focus();
    await expect(btn).toBeFocused();

    // Class surface — Phase 03.1-01 guarantees these tokens.
    await expect(btn).toHaveClass(/focus:ring-2/);
    await expect(btn).toHaveClass(/focus:ring-accent/);

    // Computed paint — Tailwind's focus:ring utility lays the indicator down via
    // box-shadow. A non-empty, non-'none' computed box-shadow proves the class
    // actually rendered pixels, not just string-matched.
    const boxShadow = await btn.evaluate(el => getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe('none');
    expect(boxShadow).not.toBe('');

    expect(unexpected, `Console errors: ${JSON.stringify(unexpected)}`).toHaveLength(0);
  });

  // ── Test 2 — CardResultCell outer container focus ring ───────────────────────
  test('CardResultCell outer container shows focus ring on keyboard focus', async ({ page }) => {
    const unexpected = installConsoleGate(page);
    await setupDeck(page);

    const cell = page.getByTestId('card-result-cell').first();
    await expect(cell).toBeVisible({ timeout: 8000 });

    // Regression guard for Plan 03's preserved tab stop (keep tabIndex=0 +
    // pair with focus-within overlay reveal).
    await expect(cell).toHaveAttribute('tabindex', '0');

    await cell.focus();
    await expect(cell).toBeFocused();

    await expect(cell).toHaveClass(/focus:ring-2/);
    await expect(cell).toHaveClass(/focus:ring-accent/);

    const boxShadow = await cell.evaluate(el => getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe('none');
    expect(boxShadow).not.toBe('');

    expect(unexpected, `Console errors: ${JSON.stringify(unexpected)}`).toHaveLength(0);
  });

  // ── Test 3 — DeckColumn view-toggle scroll reset (overflow deck) ─────────────
  test('view toggle resets outer scroll container scrollTop when deck overflows', async ({ page }) => {
    const unexpected = installConsoleGate(page);
    await setupDeck(page);

    // Outer scroll wrapper = parent of the DeckColumn (the flex-[2] div in
    // DeckWorkspace that carries outerScrollRef + overflow-y-auto).
    const outerWrapper = page.locator('[data-testid="deck-column"]').locator('..');
    await expect(outerWrapper).toBeVisible();

    // Force overflow so scrollTop > 0 is observable.  The DeckWorkspace layout
    // caps max-h at calc(100vh-6rem); inject a tall spacer + seed scrollTop.
    await outerWrapper.evaluate(el => {
      const spacer = document.createElement('div');
      spacer.style.height = '2000px';
      spacer.setAttribute('data-testid', 'test-spacer');
      el.insertBefore(spacer, el.firstChild);
      el.scrollTop = 500;
    });

    const pre = await outerWrapper.evaluate(el => el.scrollTop);
    expect(pre).toBeGreaterThan(0);

    // Toggle to Grid — this is what invokes onViewToggle → outerScrollRef reset.
    await page.locator('[role="group"][aria-label="Deck view"]').getByRole('button', { name: 'Grid' }).click();

    await expect.poll(async () => outerWrapper.evaluate(el => el.scrollTop)).toBe(0);

    expect(unexpected, `Console errors: ${JSON.stringify(unexpected)}`).toHaveLength(0);
  });
});
