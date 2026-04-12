// e2e/specs/01-partner-activation.spec.ts
// UAT flow 2: partner slot activates ONLY when primary has Partner keyword.
import { test, expect } from '../helpers/stubScryfall';
import { createDeck, selectCommander, changePrimaryCommander } from '../helpers/commanderFlows';

test('partner slot activates on Partner-keyword primary and deactivates on non-Partner primary', async ({ page }) => {
  await createDeck(page, 'Partner Activation Test');

  // With no primary: partner slot disabled.
  const partnerDisabled = page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' });
  await expect(partnerDisabled).toBeVisible();
  await expect(page.getByLabel('Search for a partner commander')).toHaveCount(0);

  // Select Thrasios (Partner keyword): partner slot becomes active.
  await selectCommander(page, 'Thrasios');
  await expect(page.getByLabel('Search for a partner commander')).toBeVisible();
  await expect(partnerDisabled).toHaveCount(0);

  // Change primary to Atraxa (non-Partner): partner slot disabled again.
  await changePrimaryCommander(page, 'Atraxa');
  await expect(page.locator('[aria-disabled="true"]').filter({ hasText: 'Partner (optional)' })).toBeVisible();
  await expect(page.getByLabel('Search for a partner commander')).toHaveCount(0);
});
