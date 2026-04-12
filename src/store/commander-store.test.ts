import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useCommanderStore } from './commander-store';
import * as scryfallClient from '../lib/scryfall-client';

function fakeCard(overrides: {
  id?: string;
  name?: string;
  oracle_id?: string;
  color_identity?: string[];
  keywords?: string[];
  oracle_text?: string;
  type_line?: string;
} = {}): Record<string, unknown> {
  return {
    id: 'card-1',
    oracle_id: 'oracle-1',
    name: 'Fake Commander',
    color_identity: [],
    keywords: [],
    oracle_text: '',
    type_line: 'Legendary Creature',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCommanderStore.setState({
    primaryCommander: null,
    partnerCommander: null,
    loading: false,
    error: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('commander-store', () => {
  it('setCommander writes commanderId, commanderName, colorIdentity to db.decks row', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    const card = fakeCard({ id: 'abc-123', name: 'Atraxa', color_identity: ['W', 'U', 'B', 'G'] });

    await useCommanderStore.getState().setCommander(deckId, card as never);

    const deck = await db.decks.get(deckId);
    expect(deck?.commanderId).toBe('abc-123');
    expect(deck?.commanderName).toBe('Atraxa');
    expect(deck?.colorIdentity).toEqual(['W', 'U', 'B', 'G']);
  });

  it('setCommander updates primaryCommander in store state', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    const card = fakeCard({ id: 'abc-123', name: 'Atraxa' });

    await useCommanderStore.getState().setCommander(deckId, card as never);

    const state = useCommanderStore.getState();
    expect(state.primaryCommander).not.toBeNull();
    expect((state.primaryCommander as Record<string, unknown>)?.name).toBe('Atraxa');
  });

  it('setCommander clears partnerCommander when new primary is not partner-eligible', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    // Set a partner as existing partner
    const existingPartner = fakeCard({
      id: 'partner-1',
      name: 'Generic Partner',
      keywords: ['Partner'],
    });
    useCommanderStore.setState({ partnerCommander: existingPartner as never });

    // New primary has no partner keywords — not partner-eligible
    const nonPartnerPrimary = fakeCard({
      id: 'non-partner',
      name: 'Non Partner Commander',
      keywords: [],
      oracle_text: '',
    });

    await useCommanderStore.getState().setCommander(deckId, nonPartnerPrimary as never);

    expect(useCommanderStore.getState().partnerCommander).toBeNull();
  });

  it('setCommander preserves compatible partnerCommander when primary is partner-eligible', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    // Both are generic partners
    const existingPartner = fakeCard({
      id: 'partner-2',
      name: 'Partner Card B',
      keywords: ['Partner'],
    });
    useCommanderStore.setState({ partnerCommander: existingPartner as never });

    const genericPartnerPrimary = fakeCard({
      id: 'partner-1',
      name: 'Partner Card A',
      keywords: ['Partner'],
    });

    await useCommanderStore.getState().setCommander(deckId, genericPartnerPrimary as never);

    expect(useCommanderStore.getState().partnerCommander).not.toBeNull();
  });

  it('clearCommander resets both primary and partner and nulls deck row fields', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      commanderId: 'some-id',
      commanderName: 'Some Commander',
      colorIdentity: ['R'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    useCommanderStore.setState({
      primaryCommander: fakeCard() as never,
      partnerCommander: fakeCard({ id: 'partner' }) as never,
    });

    await useCommanderStore.getState().clearCommander(deckId);

    const state = useCommanderStore.getState();
    expect(state.primaryCommander).toBeNull();
    expect(state.partnerCommander).toBeNull();

    const deck = await db.decks.get(deckId);
    expect(deck?.commanderId).toBeNull();
    expect(deck?.commanderName).toBeNull();
    expect(deck?.colorIdentity).toEqual([]);
  });

  it('setPartner writes nothing to db.decks (partner is UI-only in Phase 2) but updates store state', async () => {
    const updateSpy = vi.spyOn(db.decks, 'update');

    const partnerCard = fakeCard({ id: 'partner-x', name: 'Partner X', keywords: ['Partner'] });
    useCommanderStore.getState().setPartner(partnerCard as never);

    expect(updateSpy).not.toHaveBeenCalled();

    const state = useCommanderStore.getState();
    expect(state.partnerCommander).not.toBeNull();
    expect((state.partnerCommander as Record<string, unknown>)?.name).toBe('Partner X');
  });

  it('clearPartner resets partnerCommander to null', () => {
    useCommanderStore.setState({ partnerCommander: fakeCard() as never });

    useCommanderStore.getState().clearPartner();

    expect(useCommanderStore.getState().partnerCommander).toBeNull();
  });

  describe('loadForDeck', () => {
    it('loads and hydrates primaryCommander via fetchCardById when deck has a commanderId', async () => {
      const mockCard = fakeCard({ id: 'card-abc', name: 'Hydrated Commander' });
      vi.spyOn(scryfallClient, 'fetchCardById').mockResolvedValue(mockCard as never);

      const deckId = (await db.decks.add({
        name: 'Hydrate Test',
        commanderId: 'card-abc',
        commanderName: 'Hydrated Commander',
        colorIdentity: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;

      await useCommanderStore.getState().loadForDeck(deckId);

      expect(scryfallClient.fetchCardById).toHaveBeenCalledWith('card-abc');
      const state = useCommanderStore.getState();
      expect((state.primaryCommander as Record<string, unknown>)?.name).toBe('Hydrated Commander');
    });

    it('sets primaryCommander to null when deck has no commanderId', async () => {
      const deckId = (await db.decks.add({
        name: 'Empty Deck',
        commanderId: null,
        commanderName: null,
        colorIdentity: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;

      await useCommanderStore.getState().loadForDeck(deckId);

      expect(useCommanderStore.getState().primaryCommander).toBeNull();
    });
  });
});
