import type { Page } from '@playwright/test';
export async function addCardToDeck(_page: Page, _cardName: string): Promise<void> {
  throw new Error('addCardToDeck not yet implemented — ships in 03-05-PLAN.md');
}
export async function removeCardFromDeck(_page: Page, _cardName: string): Promise<void> {
  throw new Error('removeCardFromDeck not yet implemented — ships in 03-05-PLAN.md');
}
export async function toggleDeckView(_page: Page, _mode: 'grid' | 'list'): Promise<void> {
  throw new Error('toggleDeckView not yet implemented — ships in 03-05-PLAN.md');
}
