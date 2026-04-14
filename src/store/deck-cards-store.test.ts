import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../lib/db';
import type { Card } from '../lib/scryfall';

// Mock scryfall search — every test controls the response per-test.
vi.mock('../lib/scryfall', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/scryfall')>();
  return {
    ...mod,
    searchCards: vi.fn(),
  };
});

const { searchCards } = await import('../lib/scryfall');
const searchCardsMock = vi.mocked(searchCards);

import { useDeckCardsStore } from './deck-cards-store';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'scry-id-1',
    oracle_id: 'oracle-id-1',
    name: 'Sol Ring',
    type_line: 'Artifact',
    mana_cost: '{1}',
    cmc: 1,
    colors: [],
    color_identity: [],
    keywords: [],
    image_uris: { small: '', normal: '', art_crop: '' } as Card['image_uris'],
    released_at: new Date('2010-10-01'),
    ...overrides,
  } as unknown as Card;
}

async function seedDeck(overrides: Partial<{ name: string; viewMode: 'grid' | 'list'; updatedAt: number }> = {}) {
  const now = Date.now();
  return (await db.decks.add({
    name: 'Test Deck',
    commanderId: null,
    commanderName: null,
    colorIdentity: [],
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
    ...(overrides.viewMode !== undefined ? { viewMode: overrides.viewMode } : {}),
    ...(overrides.name !== undefined ? { name: overrides.name } : {}),
  })) as number;
}

async function resetDb() {
  await db.deckCards.clear();
  await db.deckChanges.clear();
  await db.decks.clear();
}

beforeEach(async () => {
  await resetDb();
  useDeckCardsStore.setState({ deckId: null, cards: [], viewMode: 'list', loading: false, error: null });
  searchCardsMock.mockReset();
});

afterEach(() => {
  searchCardsMock.mockReset();
});

describe('loadForDeck', () => {
  it('loads cards for a deckId and reads Deck.viewMode', async () => {
    const deckId = await seedDeck({ viewMode: 'grid' });
    await db.deckCards.add({ deckId, scryfallId: 'card-a', cardName: 'Card A', quantity: 1, isCommander: false, addedAt: Date.now() });
    await db.deckCards.add({ deckId, scryfallId: 'card-b', cardName: 'Card B', quantity: 1, isCommander: false, addedAt: Date.now() });

    await useDeckCardsStore.getState().loadForDeck(deckId);

    const state = useDeckCardsStore.getState();
    expect(state.viewMode).toBe('grid');
    expect(state.cards.length).toBe(2);
    expect(state.deckId).toBe(deckId);
    expect(state.loading).toBe(false);
  });

  it('defaults viewMode to "list" when Deck.viewMode is undefined', async () => {
    const deckId = await seedDeck(); // no viewMode
    await useDeckCardsStore.getState().loadForDeck(deckId);
    expect(useDeckCardsStore.getState().viewMode).toBe('list');
  });
});

describe('addCard — singleton & basic-land rules', () => {
  it('writes deckCards + deckChanges + decks.updatedAt in a single transaction', async () => {
    const originalUpdatedAt = Date.now() - 1000;
    const deckId = await seedDeck({ updatedAt: originalUpdatedAt });
    searchCardsMock.mockResolvedValueOnce({ data: [{ released_at: new Date('1993-12-31') } as unknown as Card], hasMore: false, totalCards: 1, _page: {} as never });

    const result = await useDeckCardsStore.getState().addCard(deckId, makeCard());

    expect(result.ok).toBe(true);
    expect(await db.deckCards.count()).toBe(1);
    expect(await db.deckChanges.count()).toBe(1);
    const changes = await db.deckChanges.toArray();
    expect(changes[0].type).toBe('add');
    const deck = await db.decks.get(deckId);
    expect(deck!.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  it('returns {ok:false, reason:"already-in-deck"} for duplicate non-basic', async () => {
    const deckId = await seedDeck();
    const solRing = makeCard({ id: 'scry-id-1', name: 'Sol Ring', type_line: 'Artifact' });
    // Pre-seed state with Sol Ring already in cards
    useDeckCardsStore.setState({
      cards: [{
        id: 1,
        deckId,
        scryfallId: 'scry-id-1',
        cardName: 'Sol Ring',
        quantity: 1,
        isCommander: false,
        addedAt: Date.now(),
      }],
    });

    const result = await useDeckCardsStore.getState().addCard(deckId, solRing);

    expect(result).toEqual({ ok: false, reason: 'already-in-deck' });
    expect(searchCardsMock).not.toHaveBeenCalled();
    expect(await db.deckCards.count()).toBe(0);
  });

  it('allows multiple basic lands — each add creates a new row', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValue({ data: [{ released_at: new Date('1993-08-05') } as unknown as Card], hasMore: false, totalCards: 1, _page: {} as never });
    const forest = makeCard({ id: 'forest-id', oracle_id: 'forest-oracle', name: 'Forest', type_line: 'Basic Land — Forest' });

    await useDeckCardsStore.getState().addCard(deckId, forest);
    await useDeckCardsStore.getState().addCard(deckId, forest);

    const state = useDeckCardsStore.getState();
    expect(state.cards.length).toBe(2);
    expect(await db.deckChanges.count()).toBe(2);
  });
});

describe('addCard — originalReleaseDate', () => {
  it('stores released_at formatted as YYYY-MM-DD (not ISO timestamp)', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValueOnce({ data: [{ released_at: new Date('1993-12-31T00:00:00.000Z') } as unknown as Card], hasMore: false, totalCards: 1, _page: {} as never });

    await useDeckCardsStore.getState().addCard(deckId, makeCard());

    const state = useDeckCardsStore.getState();
    expect(state.cards[0].originalReleaseDate).toBe('1993-12-31');
  });

  it('stores null when searchCards throws', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockRejectedValueOnce(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await useDeckCardsStore.getState().addCard(deckId, makeCard());

    const state = useDeckCardsStore.getState();
    expect(state.cards[0].originalReleaseDate).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  it('stores null when searchCards returns empty data array', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValueOnce({ data: [], hasMore: false, totalCards: 0, _page: {} as never });

    await useDeckCardsStore.getState().addCard(deckId, makeCard());

    const state = useDeckCardsStore.getState();
    expect(state.cards[0].originalReleaseDate).toBeNull();
  });

  it('dedupes across decks — reuses originalReleaseDate from existing deckCards row with same scryfallId', async () => {
    const otherDeckId = await seedDeck({ name: 'Other Deck' });
    const myDeckId = await seedDeck({ name: 'My Deck' });

    // Pre-insert a deckCards row in a DIFFERENT deckId with the same scryfallId and an originalReleaseDate
    await db.deckCards.add({
      deckId: otherDeckId,
      scryfallId: 'scry-id-1',
      cardName: 'Sol Ring',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
      originalReleaseDate: '1993-12-31',
    });

    await useDeckCardsStore.getState().addCard(myDeckId, makeCard({ id: 'scry-id-1', oracle_id: 'oracle-id-1' }));

    const state = useDeckCardsStore.getState();
    expect(state.cards[0].originalReleaseDate).toBe('1993-12-31');
    expect(searchCardsMock).not.toHaveBeenCalled();
  });

  it('uses the locked Scryfall operator oracleid: from 03-ORACLEID-PROBE.md', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValueOnce({ data: [], hasMore: false, totalCards: 0, _page: {} as never });
    const card = makeCard({ oracle_id: 'test-oracle-id-xyz' });

    await useDeckCardsStore.getState().addCard(deckId, card);

    expect(searchCardsMock).toHaveBeenCalled();
    const firstArg = searchCardsMock.mock.calls[0][0];
    expect(firstArg).toBe('oracleid:test-oracle-id-xyz');
  });

  it('passes unique:"prints", order:"released", dir:"asc" in options', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValueOnce({ data: [], hasMore: false, totalCards: 0, _page: {} as never });

    await useDeckCardsStore.getState().addCard(deckId, makeCard());

    expect(searchCardsMock).toHaveBeenCalled();
    const secondArg = searchCardsMock.mock.calls[0][1];
    expect(secondArg).toEqual({ unique: 'prints', order: 'released', dir: 'asc' });
  });
});

describe('addCard — guards against useEffect refactor', () => {
  it('fires exactly one searchCards call per addCard invocation', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValue({ data: [], hasMore: false, totalCards: 0, _page: {} as never });

    await useDeckCardsStore.getState().addCard(deckId, makeCard());

    expect(searchCardsMock.mock.calls.length).toBe(1);
  });
});

describe('addCard — error handling', () => {
  it('returns {ok:false, reason:"storage-error"} when Dexie transaction throws', async () => {
    const deckId = await seedDeck();
    searchCardsMock.mockResolvedValueOnce({ data: [], hasMore: false, totalCards: 0, _page: {} as never });
    vi.spyOn(db.deckCards, 'add').mockRejectedValueOnce(new Error('quota'));

    const result = await useDeckCardsStore.getState().addCard(deckId, makeCard());

    expect(result).toEqual({ ok: false, reason: 'storage-error' });
    expect(useDeckCardsStore.getState().error).not.toBeNull();
  });
});

describe('removeCard', () => {
  it('deletes deckCards row and writes deckChanges{type:"remove"} atomically', async () => {
    const deckId = await seedDeck();
    const cardId = (await db.deckCards.add({
      deckId,
      scryfallId: 'scry-id-1',
      cardName: 'Sol Ring',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
    })) as number;

    // Seed state to match
    useDeckCardsStore.setState({
      deckId,
      cards: [{
        id: cardId,
        deckId,
        scryfallId: 'scry-id-1',
        cardName: 'Sol Ring',
        quantity: 1,
        isCommander: false,
        addedAt: Date.now(),
      }],
    });

    await useDeckCardsStore.getState().removeCard(cardId);

    expect(await db.deckCards.count()).toBe(0);
    expect(await db.deckChanges.count()).toBe(1);
    const changes = await db.deckChanges.toArray();
    expect(changes[0].type).toBe('remove');
    expect(useDeckCardsStore.getState().cards).toHaveLength(0);
  });

  it('touches decks.updatedAt on remove', async () => {
    const oldUpdatedAt = Date.now() - 5000;
    const deckId = await seedDeck({ updatedAt: oldUpdatedAt });
    const cardId = (await db.deckCards.add({
      deckId,
      scryfallId: 'scry-id-1',
      cardName: 'Sol Ring',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
    })) as number;

    useDeckCardsStore.setState({
      deckId,
      cards: [{
        id: cardId,
        deckId,
        scryfallId: 'scry-id-1',
        cardName: 'Sol Ring',
        quantity: 1,
        isCommander: false,
        addedAt: Date.now(),
      }],
    });

    await useDeckCardsStore.getState().removeCard(cardId);

    const deck = await db.decks.get(deckId);
    expect(deck!.updatedAt).toBeGreaterThan(oldUpdatedAt);
  });
});

describe('setViewMode', () => {
  it('persists viewMode to Dexie and updates state', async () => {
    const deckId = await seedDeck({ viewMode: 'list' });

    await useDeckCardsStore.getState().setViewMode(deckId, 'grid');

    const deck = await db.decks.get(deckId);
    expect(deck!.viewMode).toBe('grid');
    expect(useDeckCardsStore.getState().viewMode).toBe('grid');
  });
});
