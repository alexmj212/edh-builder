// e2e/specs/06-primary-clear-cascade.spec.ts
// UAT flow 6: clearing primary commander cascades to clearing partner too.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner } from '../helpers/commanderFlows';

test('clearing primary cascades to clear partner (UI + IDB)', async ({ page }) => {
  await createDeck(page, 'Cascade Clear Test');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  // Clear primary directly (not replace) — FullCard's action button.
  await page.getByRole('button', { name: 'Change commander' }).click();

  // Both slots empty/disabled after primary clear.
  await expect(page.getByText('No commander selected')).toBeVisible();
  await expect(page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' })).toBeVisible();
  await expect(page.getByRole('img', { name: /thrasios/i })).toHaveCount(0);
  await expect(page.getByRole('img', { name: /tymna/i })).toHaveCount(0);

  await page.reload();

  await expect(page.getByText('No commander selected')).toBeVisible();
  await expect(page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' })).toBeVisible();

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
    return rows.find(r => r.name === 'Cascade Clear Test') ?? null;
  });

  expect(deckRow).not.toBeNull();
  expect(deckRow?.commanderId).toBeNull();
  expect(deckRow?.commanderName).toBeNull();
  expect(deckRow?.partnerCommanderId).toBeNull();
  expect(deckRow?.partnerCommanderName).toBeNull();
});
