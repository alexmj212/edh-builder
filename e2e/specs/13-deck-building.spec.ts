// e2e/specs/13-deck-building.spec.ts
// Phase 3 — Deck Building & Card Display
// Covers every ROADMAP Phase 3 success criterion end-to-end.
import { test, expect } from '../helpers/stubScryfall';
import { installConsoleGate } from '../helpers/consoleGate';
import { createDeck, selectCommander } from '../helpers/commanderFlows';
import * as deckBuildingFlows from '../helpers/deckBuildingFlows';
import solRing from '../fixtures/cards/sol-ring.json' with { type: 'json' };
import forest  from '../fixtures/cards/forest.json'   with { type: 'json' };

// ── Shared search fixture ──────────────────────────────────────────────────────
// The deck-building tests need a search result set that includes Sol Ring and
// Forest. We route card-search responses to this inline fixture using a
// beforeEach route registration (registered AFTER stubScryfall's auto-fixture
// so it wins the Playwright LIFO route match for card-search queries).

const DECK_SEARCH_RESULTS = {
  object: 'list',
  total_cards: 3,
  has_more: false,
  data: [solRing, forest],
};

// Tiny transparent PNG for image stubs — prevents ERR_NAME_NOT_RESOLVED
// console errors on example.com image hosts (would trip console gate).
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Phase 3 — Deck Building & Card Display', () => {
  test.beforeEach(async ({ page }) => {
    // Block image hosts that would cause DNS resolution errors
    await page.route(/^https?:\/\/(img\.example|example\.com)\//i, route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG }),
    );

    // Route card-search requests to our deck-building fixture.
    // Uses LIFO: registered after stubScryfall so it wins for card searches.
    // Commander searches (t:legendary) fall through via route.fallback().
    await page.route(/\/cards\/search\?/i, async (route, request) => {
      const url = new URL(request.url());
      const q = url.searchParams.get('q') ?? '';
      const unique = url.searchParams.get('unique') ?? '';

      // Prints lookups handled by stubScryfall (oracleid: + unique=prints)
      if (unique === 'prints') return route.fallback();
      // Commander searches use t:legendary — fall through to stubScryfall
      if (/t:legendary/i.test(q)) return route.fallback();
      // Card search (f:commander + id<=): return our deck-building fixture
      if (/f:commander/i.test(q) || /id<=/i.test(q)) {
        return route.fulfill({ json: DECK_SEARCH_RESULTS, status: 200 });
      }
      // Anything else — fall through
      return route.fallback();
    });
  });

  // Helper: create deck + select Atraxa commander (WUBG — permits all colorless cards)
  async function setupDeck(page: Parameters<typeof createDeck>[0]) {
    await createDeck(page, 'Phase 3 Test Deck');
    await selectCommander(page, 'Atraxa');
    // Wait for card search results to appear (Sol Ring should be visible)
    await expect(page.getByText('Sol Ring', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  }

  // ── BUILD-01: Add card from search ──────────────────────────────────────────
  test('BUILD-01: user can add a card from search results to the active deck', async ({ page }) => {
    const unexpected = installConsoleGate(page);
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.assertInDeckColumn(page, 'Sol Ring');
    expect(await deckBuildingFlows.getDeckCountBadge(page)).toBe(1);

    expect(unexpected, `Console errors: ${JSON.stringify(unexpected)}`).toHaveLength(0);
  });

  // ── BUILD-02: Remove card ───────────────────────────────────────────────────
  test('BUILD-02: user can remove a card from the deck', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.assertInDeckColumn(page, 'Sol Ring');
    expect(await deckBuildingFlows.getDeckCountBadge(page)).toBe(1);

    await deckBuildingFlows.removeCardFromDeck(page, 'Sol Ring');
    await deckBuildingFlows.assertNotInDeckColumn(page, 'Sol Ring');
    expect(await deckBuildingFlows.getDeckCountBadge(page)).toBe(0);
  });

  // ── BUILD-03: Duplicate non-basic disabled ──────────────────────────────────
  test('BUILD-03: adding a duplicate non-basic shows the (+) button disabled with aria-label "Already in deck"', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');

    // The Sol Ring cell's (+) button should now be disabled
    const cell = page.locator('[data-testid="card-result-cell"]').filter({
      has: page.getByText('Sol Ring', { exact: true }),
    }).first();
    const addBtn = cell.getByRole('button', { name: 'Already in deck' });
    await expect(addBtn).toBeDisabled();
    await expect(addBtn).toHaveAttribute('title', 'Already in deck');
  });

  // ── BUILD-04: Basic land multiples ─────────────────────────────────────────
  test('BUILD-04: adding multiple basic lands is permitted', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Forest');
    expect(await deckBuildingFlows.getDeckCountBadge(page)).toBe(1);

    // Second Forest add — basic lands bypass duplicate gate
    const cell = page.locator('[data-testid="card-result-cell"]').filter({
      has: page.getByText('Forest', { exact: true }),
    }).first();
    const addBtn = cell.getByRole('button', { name: 'Add Forest to deck' });
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    // Wait for count to reach 2
    await expect(page.locator('[data-testid="deck-column"] span').filter({ hasText: /Cards:\s*2/ })).toBeVisible({ timeout: 8000 });
    expect(await deckBuildingFlows.getDeckCountBadge(page)).toBe(2);
  });

  // ── BUILD-05 / UI-02: Grid view lazy-load skeletons ────────────────────────
  test('BUILD-05 / UI-02: grid view renders card images with lazy-load skeletons', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.toggleDeckView(page, 'grid');

    // Grid images should have loading="lazy"
    const gridImg = page.locator('[data-testid="deck-column"] img[loading="lazy"]').first();
    await expect(gridImg).toBeVisible({ timeout: 8000 });
    await expect(gridImg).toHaveAttribute('loading', 'lazy');

    // Grid cell has correct aspect ratio class
    const cell = page.locator('[data-testid="deck-column"] .aspect-\\[146\\/204\\]').first();
    await expect(cell).toBeVisible();
  });

  // ── BUILD-06: List view category grouping ──────────────────────────────────
  test('BUILD-06: list view groups cards by type with per-category counts', async ({ page }) => {
    await setupDeck(page);

    // Add Sol Ring (Artifact) and Forest (Land)
    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.addCardToDeck(page, 'Forest');

    // Make sure we're in list view (default)
    await deckBuildingFlows.toggleDeckView(page, 'list');

    const deckColumn = page.locator('[data-testid="deck-column"]');

    // Artifacts section should show count 1
    await expect(deckColumn.getByRole('region', { name: /Artifacts \(1\)/ })).toBeVisible({ timeout: 8000 });
    // Lands section should show count 1
    await expect(deckColumn.getByRole('region', { name: /Lands \(1\)/ })).toBeVisible({ timeout: 8000 });
  });

  // ── BUILD-07: Grid/list toggle persists across reload ──────────────────────
  test('BUILD-07: grid/list toggle persists per-deck across reload', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.toggleDeckView(page, 'grid');

    // Grid button should be active (aria-pressed=true)
    await expect(
      page.locator('[role="group"][aria-label="Deck view"]').getByRole('button', { name: 'Grid' })
    ).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    // After reload, wait for deck column to appear and Grid still active
    await expect(page.locator('[data-testid="deck-column"]')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('[role="group"][aria-label="Deck view"]').getByRole('button', { name: 'Grid' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  // ── BUILD-08: originalReleaseDate populated ────────────────────────────────
  test('BUILD-08: DeckCard.originalReleaseDate is populated after add', async ({ page }) => {
    await setupDeck(page);
    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');

    // Read IndexedDB directly to verify originalReleaseDate
    const deckCardRow = await page.evaluate(async () => {
      const req = indexedDB.open('EDHBuilder');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('deckCards', 'readonly');
      const allReq = tx.objectStore('deckCards').getAll();
      const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        allReq.onsuccess = () => resolve(allReq.result as Array<Record<string, unknown>>);
        allReq.onerror = () => reject(allReq.error);
      });
      db.close();
      return rows.find(r => r.cardName === 'Sol Ring') ?? null;
    });

    expect(deckCardRow).not.toBeNull();
    // originalReleaseDate should be the Sol Ring LEA date from our fixture
    expect(deckCardRow?.originalReleaseDate).toBe('1993-12-31');
  });

  // ── DECK-09: deckChanges audit log ─────────────────────────────────────────
  test('DECK-09: every add/remove writes a deckChanges entry', async ({ page }) => {
    await setupDeck(page);

    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');
    await deckBuildingFlows.removeCardFromDeck(page, 'Sol Ring');
    // Wait for deck to update (count shows 0)
    await expect(
      page.locator('[data-testid="deck-column"] span').filter({ hasText: /Cards:\s*0/ })
    ).toBeVisible({ timeout: 8000 });

    const changes = await page.evaluate(async () => {
      const req = indexedDB.open('EDHBuilder');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('deckChanges', 'readonly');
      const allReq = tx.objectStore('deckChanges').getAll();
      const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        allReq.onsuccess = () => resolve(allReq.result as Array<Record<string, unknown>>);
        allReq.onerror = () => reject(allReq.error);
      });
      db.close();
      return rows;
    });

    expect(changes.length).toBeGreaterThanOrEqual(2);
    const types = changes.map(r => r.type as string);
    expect(types).toContain('add');
    expect(types).toContain('remove');
  });

  // ── UI-04: Commander art_crop prominently at top of deck column ────────────
  test('UI-04: commander is prominently displayed at the top of the deck column with art_crop', async ({ page }) => {
    await setupDeck(page);

    const stripImg = page.locator('[data-testid="deck-column"] [data-testid="commander-strip-image"]');
    await expect(stripImg).toBeVisible({ timeout: 8000 });
    await expect(stripImg).toHaveAttribute('src', /art_crop|atraxa-art/i);

    // Single-mount lock: no commander-strip-image OUTSIDE deck-column
    const workspace = page.locator('[data-testid="deck-workspace"]');
    const allStripImgs = workspace.locator('[data-testid="commander-strip-image"]');
    await expect(allStripImgs).toHaveCount(1);

    const deckColumn = page.locator('[data-testid="deck-column"]');
    const insideDeckColumn = deckColumn.locator('[data-testid="commander-strip-image"]');
    await expect(insideDeckColumn).toHaveCount(1);
  });

  // ── Layout: side-by-side visibility at >=1024px ────────────────────────────
  test('search results and deck column are simultaneously visible at >=1024px (no scroll required)', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await setupDeck(page);
    await deckBuildingFlows.addCardToDeck(page, 'Sol Ring');

    const searchGrid = page.locator('[data-testid="card-results-grid"]');
    const deckColumn = page.locator('[data-testid="deck-column"]');

    const searchBox = await searchGrid.boundingBox();
    const deckBox   = await deckColumn.boundingBox();

    expect(searchBox).not.toBeNull();
    expect(deckBox).not.toBeNull();

    // Both are in the viewport (y + height <= viewport height)
    expect(searchBox!.y).toBeGreaterThanOrEqual(0);
    expect(deckBox!.y).toBeGreaterThanOrEqual(0);

    // Deck column is to the right of the search column (side-by-side)
    expect(deckBox!.x).toBeGreaterThan(searchBox!.x + searchBox!.width / 2);

    // Sol Ring appears in deck column within viewport height
    const solRingInDeck = deckColumn.getByText('Sol Ring', { exact: true }).first();
    const solRingBox = await solRingInDeck.boundingBox();
    expect(solRingBox).not.toBeNull();
    expect(solRingBox!.y + solRingBox!.height).toBeLessThanOrEqual(900);
  });

  // ── StrictMode: addCard fires exactly one prints lookup per click ───────────
  test('addCard triggers exactly one Scryfall prints lookup per click (StrictMode safety)', async ({ page }) => {
    await setupDeck(page);

    // Count prints-lookup requests (unique=prints + oracleid:)
    let printsLookupCount = 0;
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname !== '/cards/search') return;
      const unique = url.searchParams.get('unique') ?? '';
      const q = url.searchParams.get('q') ?? '';
      if (unique === 'prints' && /oracleid:/i.test(q)) {
        printsLookupCount++;
      }
    });

    // Click (+) once
    const cell = page.locator('[data-testid="card-result-cell"]').filter({
      has: page.getByText('Sol Ring', { exact: true }),
    }).first();
    const addBtn = cell.getByRole('button', { name: /Add Sol Ring to deck/i });
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    // Wait for add to complete (card appears in deck)
    await deckBuildingFlows.assertInDeckColumn(page, 'Sol Ring');

    // Exactly 1 prints lookup fired
    expect(printsLookupCount).toBe(1);
  });
});
