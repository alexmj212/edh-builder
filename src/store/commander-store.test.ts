import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../lib/db';
import { useCommanderStore } from './commander-store';
import * as scryfall from '../lib/scryfall';

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
      partnerCommanderId: 'existing-partner',
      partnerCommanderName: 'Generic Partner',
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

    const deck = await db.decks.get(deckId);
    expect(deck?.partnerCommanderId).toBeNull();
    expect(deck?.partnerCommanderName).toBeNull();
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

    const deck = await db.decks.get(deckId);
    // When partner is preserved, Dexie partner fields are untouched (never written in this path).
    // The seed row had no partner, so they remain undefined — not explicit null.
    expect(deck?.partnerCommanderId).toBeUndefined();
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
    expect(deck?.partnerCommanderId).toBeNull();
    expect(deck?.partnerCommanderName).toBeNull();
  });

  it('setPartner persists partnerCommanderId and partnerCommanderName to the deck row', async () => {
    const deckId = (await db.decks.add({
      name: 'Partner Test',
      commanderId: 'primary',
      commanderName: 'Primary',
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    const partnerCard = fakeCard({ id: 'partner-x', name: 'Partner X', keywords: ['Partner'] });
    await useCommanderStore.getState().setPartner(deckId, partnerCard as never);

    const deck = await db.decks.get(deckId);
    expect(deck?.partnerCommanderId).toBe('partner-x');
    expect(deck?.partnerCommanderName).toBe('Partner X');

    const state = useCommanderStore.getState();
    expect((state.partnerCommander as Record<string, unknown>)?.name).toBe('Partner X');
  });

  it('clearPartner nulls partnerCommanderId and partnerCommanderName on the deck row and in state', async () => {
    const deckId = (await db.decks.add({
      name: 'Clear Partner Test',
      commanderId: 'primary',
      commanderName: 'Primary',
      colorIdentity: [],
      partnerCommanderId: 'partner-x',
      partnerCommanderName: 'Partner X',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    useCommanderStore.setState({ partnerCommander: fakeCard({ id: 'partner-x', name: 'Partner X' }) as never });

    await useCommanderStore.getState().clearPartner(deckId);

    expect(useCommanderStore.getState().partnerCommander).toBeNull();
    const deck = await db.decks.get(deckId);
    expect(deck?.partnerCommanderId).toBeNull();
    expect(deck?.partnerCommanderName).toBeNull();
  });

  it('partner survives reload — fresh loadForDeck after setPartner restores partnerCommander', async () => {
    const deckId = (await db.decks.add({
      name: 'Reload Test',
      commanderId: 'primary-id',
      commanderName: 'Primary',
      colorIdentity: ['G', 'U'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    // Set partner — flushes to Dexie
    const partnerCard = fakeCard({ id: 'partner-reload', name: 'Partner Reload', keywords: ['Partner'] });
    await useCommanderStore.getState().setPartner(deckId, partnerCard as never);

    // Simulate hard reload: clear in-memory state
    useCommanderStore.setState({ primaryCommander: null, partnerCommander: null, loading: false, error: null });

    // Mock Scryfall hydration for both primary and partner
    vi.spyOn(scryfall, 'fetchCardById').mockImplementation(async (id: string) => {
      if (id === 'primary-id') return fakeCard({ id: 'primary-id', name: 'Primary' }) as never;
      if (id === 'partner-reload') return fakeCard({ id: 'partner-reload', name: 'Partner Reload', keywords: ['Partner'] }) as never;
      throw new Error(`Unexpected id: ${id}`);
    });

    await useCommanderStore.getState().loadForDeck(deckId);

    const state = useCommanderStore.getState();
    expect((state.primaryCommander as Record<string, unknown>)?.name).toBe('Primary');
    expect((state.partnerCommander as Record<string, unknown>)?.name).toBe('Partner Reload');
  });

  describe('loadForDeck', () => {
    it('loads and hydrates primaryCommander via fetchCardById when deck has a commanderId', async () => {
      const mockCard = fakeCard({ id: 'card-abc', name: 'Hydrated Commander' });
      vi.spyOn(scryfall, 'fetchCardById').mockResolvedValue(mockCard as never);

      const deckId = (await db.decks.add({
        name: 'Hydrate Test',
        commanderId: 'card-abc',
        commanderName: 'Hydrated Commander',
        colorIdentity: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;

      await useCommanderStore.getState().loadForDeck(deckId);

      expect(scryfall.fetchCardById).toHaveBeenCalledWith('card-abc');
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

    it('leaves partnerCommander null when deck has no partnerCommanderId', async () => {
      vi.spyOn(scryfall, 'fetchCardById').mockResolvedValue(
        fakeCard({ id: 'card-abc', name: 'Only Primary' }) as never
      );

      const deckId = (await db.decks.add({
        name: 'No Partner',
        commanderId: 'card-abc',
        commanderName: 'Only Primary',
        colorIdentity: [],
        // partnerCommanderId intentionally omitted (v2-shape row)
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;

      await useCommanderStore.getState().loadForDeck(deckId);

      expect(useCommanderStore.getState().partnerCommander).toBeNull();
    });

    it('hydrates partnerCommander via fetchCardById when deck.partnerCommanderId is set', async () => {
      vi.spyOn(scryfall, 'fetchCardById').mockImplementation(async (id: string) => {
        if (id === 'primary-hydrate') return fakeCard({ id: 'primary-hydrate', name: 'Primary' }) as never;
        if (id === 'partner-hydrate') return fakeCard({ id: 'partner-hydrate', name: 'Partner' }) as never;
        throw new Error(`Unexpected id: ${id}`);
      });

      const deckId = (await db.decks.add({
        name: 'Both Slots',
        commanderId: 'primary-hydrate',
        commanderName: 'Primary',
        colorIdentity: [],
        partnerCommanderId: 'partner-hydrate',
        partnerCommanderName: 'Partner',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;

      await useCommanderStore.getState().loadForDeck(deckId);

      expect(scryfall.fetchCardById).toHaveBeenCalledWith('primary-hydrate');
      expect(scryfall.fetchCardById).toHaveBeenCalledWith('partner-hydrate');
      const state = useCommanderStore.getState();
      expect((state.partnerCommander as Record<string, unknown>)?.name).toBe('Partner');
    });
  });
});
