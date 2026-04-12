// e2e/specs/05-partner-autoclear.spec.ts
// UAT flow 5: changing primary to non-Partner commander auto-clears partner (UI + IDB).
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner, changePrimaryCommander } from '../helpers/commanderFlows';

test('non-partner primary auto-clears partner and persists null through reload', async ({ page }) => {
  await createDeck(page, 'Auto-Clear Test');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  await changePrimaryCommander(page, 'Atraxa');

  // Atraxa is primary, partner disabled.
  await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();
  await expect(page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole('img', { name: /atraxa/i })).toBeVisible();
  await expect(page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toHaveCount(0);

  const deckRow = await page.evaluate(async () => {
    const req = indexedDB.open('EDHBuilder');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const allReq = db.transaction('decks', 'readonly').objectStore('decks').getAll();
    const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result as Array<Record<string, unknown>>);
      allReq.onerror = () => reject(allReq.error);
    });
    db.close();
    return rows.find(r => r.name === 'Auto-Clear Test') ?? null;
  });

  expect(deckRow).not.toBeNull();
  expect(deckRow?.partnerCommanderId).toBeNull();
  expect(deckRow?.partnerCommanderName).toBeNull();
  expect(String(deckRow?.commanderName ?? '')).toMatch(/atraxa/i);
});
