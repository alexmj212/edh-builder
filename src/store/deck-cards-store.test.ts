import { describe, it } from 'vitest';
describe('deck-cards-store.loadForDeck', () => {
  it.todo('loads deckCards rows for a deckId and sets viewMode from Deck.viewMode (defaults to list if undefined)');
});
describe('deck-cards-store.addCard', () => {
  it.todo('writes deckCards row + deckChanges{type:"add"} + decks.updatedAt in one transaction');
  it.todo('returns { ok: false, reason: "already-in-deck" } for duplicate non-basic');
  it.todo('allows multiple basic lands (isBasicLand true) — each add writes a new row');
  it.todo('resolves originalReleaseDate via searchCards(oracleid:..., unique:prints, order:released, dir:asc) and stores YYYY-MM-DD string');
  it.todo('persists originalReleaseDate: null and console.warns when prints lookup throws');
  it.todo('dedupes originalReleaseDate: reuses an existing deckCards row value before firing a new Scryfall call');
  it.todo('appends the new DeckCard to state.cards after successful commit');
});
describe('deck-cards-store.removeCard', () => {
  it.todo('deletes deckCards row + writes deckChanges{type:"remove"} + touches decks.updatedAt atomically');
});
describe('deck-cards-store.setViewMode', () => {
  it.todo('writes Deck.viewMode to Dexie and updates state.viewMode');
});
describe('deck-cards-store StrictMode safety', () => {
  it.todo('fires exactly one Scryfall prints lookup per addCard call under <StrictMode>');
});
