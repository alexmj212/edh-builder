// e2e/specs/02-partner-selection.spec.ts
// UAT flow 2b: selecting a partner renders the card image + Remove partner button.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, selectPartner } from '../helpers/commanderFlows';

test('selecting Tymna as Thrasios partner renders partner card and Remove button', async ({ page }) => {
  await createDeck(page, 'Partner Selection Test');
  await selectCommander(page, 'Thrasios');
  await selectPartner(page, 'Tymna');

  await expect(page.getByRole('img', { name: /tymna/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove partner' })).toBeVisible();

  // Primary still visible — partner did not overwrite primary.
  await expect(page.getByRole('img', { name: /thrasios/i })).toBeVisible();
});
