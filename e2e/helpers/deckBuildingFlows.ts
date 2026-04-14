import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Clicks the (+) add button on the card result cell matching the given card name.
 * Waits until the card appears in the deck column list (success) or the (+) button
 * becomes disabled with "Already in deck" (duplicate — still a successful click).
 */
export async function addCardToDeck(page: Page, cardName: string): Promise<void> {
  // Find the card result cell whose overlay text matches cardName
  const cell = page.locator('[data-testid="card-result-cell"]').filter({
    has: page.getByText(cardName, { exact: true }),
  }).first();

  // Find and click the add button
  const addBtn = cell.getByRole('button', { name: new RegExp(`Add ${cardName} to deck`, 'i') });
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();

  // Wait for the add to settle: card appears in deck column list row
  // Use getByText with .first() to avoid strict mode violation when multiple elements match
  const deckColumn = page.locator('[data-testid="deck-column"]');
  await expect(deckColumn.getByText(cardName, { exact: true }).first()).toBeVisible({ timeout: 10000 });
}

/**
 * Clicks the (×) remove button for the given card name in the deck column.
 * Focuses the button first so the opacity-0 button becomes keyboard-accessible/visible.
 */
export async function removeCardFromDeck(page: Page, cardName: string): Promise<void> {
  const removeBtn = page
    .locator('[data-testid="deck-column"]')
    .getByRole('button', { name: `Remove ${cardName} from deck` })
    .first();
  // Focus to trigger opacity-0 → opacity-100 transition
  await removeBtn.focus();
  await removeBtn.click();
}

/**
 * Clicks the List or Grid toggle button in the deck column.
 */
export async function toggleDeckView(page: Page, mode: 'grid' | 'list'): Promise<void> {
  const label = mode === 'grid' ? 'Grid' : 'List';
  await page
    .locator('[role="group"][aria-label="Deck view"]')
    .getByRole('button', { name: label })
    .click();
}

/**
 * Asserts that the deck column contains an element with the given card name text.
 */
export async function assertInDeckColumn(page: Page, cardName: string): Promise<void> {
  await expect(
    page.locator('[data-testid="deck-column"]').getByText(cardName, { exact: true }).first()
  ).toBeVisible();
}

/**
 * Asserts that the deck column does NOT contain the given card name.
 */
export async function assertNotInDeckColumn(page: Page, cardName: string): Promise<void> {
  await expect(
    page.locator('[data-testid="deck-column"]').getByText(cardName, { exact: true })
  ).toHaveCount(0);
}

/**
 * Reads the "Cards: {n}" badge from the deck column header and returns n as a number.
 */
export async function getDeckCountBadge(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="deck-column"] span').filter({
    hasText: /Cards:\s*\d+/,
  });
  const text = await badge.textContent();
  const match = text?.match(/Cards:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
