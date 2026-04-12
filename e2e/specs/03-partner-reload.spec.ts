// e2e/specs/03-partner-reload.spec.ts
// UAT flow 3: partner survives page.reload() — Dexie round-trip.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner } from '../helpers/commanderFlows';

test('partner commander survives hard reload (IDB round-trip)', async ({ page }) => {
  await createDeck(page, 'Reload Test');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toBeVisible();

  await page.reload();

  // Still there after reload — no "No commander selected" flash.
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /tymna/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove partner' })).toBeVisible();

  // Assert IndexedDB row carries partner fields.
  const deckRow = await page.evaluate(async () => {
    // Open Dexie DB by name (matches src/lib/db.ts).
    const req = indexedDB.open('EDHBuilder');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('decks', 'readonly');
    const store = tx.objectStore('decks');
    const allReq = store.getAll();
    const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result as Array<Record<string, unknown>>);
      allReq.onerror = () => reject(allReq.error);
    });
    db.close();
    return rows.find(r => r.name === 'Reload Test') ?? null;
  });

  expect(deckRow, 'deck row exists in IDB').not.toBeNull();
  expect(deckRow?.partnerCommanderId, 'partnerCommanderId set').toBeTruthy();
  expect(String(deckRow?.partnerCommanderName ?? '')).toMatch(/tymna/i);
});
