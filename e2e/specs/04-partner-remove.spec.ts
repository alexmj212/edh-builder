// e2e/specs/04-partner-remove.spec.ts
// UAT flow 4: Remove partner persists through reload (null Dexie fields).
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner, removePartner } from '../helpers/commanderFlows';

test('remove partner persists through reload', async ({ page }) => {
  await createDeck(page, 'Remove Test');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  await removePartner(page);

  // Primary still Thrasios; partner slot empty-but-active (search input visible).
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByLabel('Search for a partner commander')).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toHaveCount(0);

  await page.reload();

  // After reload: partner stays gone (not ghost-restored).
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByLabel('Search for a partner commander')).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toHaveCount(0);

  // Assert IDB — both partner fields explicitly null.
  const deckRow = await page.evaluate(async () => {
    const req = indexedDB.open('EDHBuilder');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('decks', 'readonly');
    const allReq = tx.objectStore('decks').getAll();
    const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result as Array<Record<string, unknown>>);
      allReq.onerror = () => reject(allReq.error);
    });
    db.close();
    return rows.find(r => r.name === 'Remove Test') ?? null;
  });

  expect(deckRow).not.toBeNull();
  expect(deckRow?.partnerCommanderId).toBeNull();
  expect(deckRow?.partnerCommanderName).toBeNull();
});
