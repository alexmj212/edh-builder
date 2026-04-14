import { describe, it } from 'vitest';
describe('DeckColumn', () => {
  it.todo('renders CommanderPanel, ViewToggle, and a list/grid view inside a scrollable container');
  it.todo('shows "No cards yet." empty state when store.cards is empty and a commander is set');
  it.todo('shows "Pick a commander first." gate when no commander is selected');
  it.todo('renders "Cards: {n}" live count in the header');
  it.todo('resets scrollTop to 0 on view toggle');
  it.todo('defaults to list view when Deck.viewMode is undefined');
});
