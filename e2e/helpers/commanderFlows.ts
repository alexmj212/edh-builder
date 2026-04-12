// e2e/helpers/commanderFlows.ts
// Locators chosen per Task 1 reconnaissance findings — see 02.2-02 plan.
import { type Page, expect } from '@playwright/test';

/**
 * Creates a deck via the DeckList UI and navigates into its workspace.
 * DeckList row click target is the outer <div>, not the <h3> heading,
 * so we locate the div by the heading it contains.
 */
export async function createDeck(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Deck' }).first().click();
  await page.getByPlaceholder('Deck name...').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await page
    .locator('div')
    .filter({ has: page.getByRole('heading', { level: 3, name }) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/decks\/\d+$/);
}

/**
 * Types into the primary commander search and clicks the first matching
 * result. CommanderSearch renders results as <li role="button"> whose
 * accessible name is the card name.
 *
 * Note: cardName must not contain regex metacharacters beyond what's expected
 * for the cards in scope (Thrasios/Tymna/Atraxa). Match is performed with
 * new RegExp(cardName, 'i') — use the base name without punctuation if needed.
 */
export async function selectCommander(page: Page, cardName: string): Promise<void> {
  await page.getByLabel('Search for a commander').fill(cardName);
  await page
    .getByRole('button', { name: new RegExp(cardName, 'i') })
    .first()
    .click();
}

export async function selectPartner(page: Page, cardName: string): Promise<void> {
  await page.getByLabel('Search for a partner commander').fill(cardName);
  await page
    .getByRole('button', { name: new RegExp(cardName, 'i') })
    .first()
    .click();
}

export async function removePartner(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Remove partner' }).click();
}

export async function changePrimaryCommander(page: Page, newCardName: string): Promise<void> {
  await page.getByRole('button', { name: 'Change commander' }).click();
  await selectCommander(page, newCardName);
}
