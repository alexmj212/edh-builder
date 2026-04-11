import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../lib/db'
import { useDeckStore } from './deck-store'

beforeEach(async () => {
  // Reset store state and database before each test
  await db.delete()
  await db.open()
  useDeckStore.setState({ decks: [], activeDeckId: null, loading: true })
})

describe('useDeckStore', () => {
  describe('createDeck', () => {
    it('adds a deck and sets it as active', async () => {
      const { createDeck } = useDeckStore.getState()
      const id = await createDeck('My Test Deck')

      const state = useDeckStore.getState()
      expect(state.decks).toHaveLength(1)
      expect(state.decks[0].name).toBe('My Test Deck')
      expect(state.activeDeckId).toBe(id)
    })

    it('sets correct default fields', async () => {
      const { createDeck } = useDeckStore.getState()
      await createDeck('Default Fields Deck')

      const state = useDeckStore.getState()
      const deck = state.decks[0]
      expect(deck.commanderId).toBeNull()
      expect(deck.commanderName).toBeNull()
      expect(deck.colorIdentity).toEqual([])
      expect(typeof deck.createdAt).toBe('number')
      expect(typeof deck.updatedAt).toBe('number')
      expect(deck.createdAt).toBeGreaterThan(0)
    })
  })

  describe('renameDeck', () => {
    it('updates name and updatedAt', async () => {
      const { createDeck, renameDeck } = useDeckStore.getState()
      const id = await createDeck('Original Name')

      const beforeUpdate = useDeckStore.getState().decks[0].updatedAt
      // Small delay to ensure timestamp differs
      await new Promise(r => setTimeout(r, 5))

      await renameDeck(id, 'New Name')

      const state = useDeckStore.getState()
      expect(state.decks[0].name).toBe('New Name')
      expect(state.decks[0].updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('deleteDeck', () => {
    it('removes the deck and its associated deckCards and deckChanges', async () => {
      const { createDeck, deleteDeck } = useDeckStore.getState()
      const id = await createDeck('Deck To Delete')

      // Add a deckCard and deckChange associated to this deck
      await db.deckCards.add({
        deckId: id,
        scryfallId: 'abc123',
        cardName: 'Lightning Bolt',
        quantity: 1,
        isCommander: false,
        addedAt: Date.now(),
      })
      await db.deckChanges.add({
        deckId: id,
        type: 'add',
        cardName: 'Lightning Bolt',
        scryfallId: 'abc123',
        timestamp: Date.now(),
      })

      await deleteDeck(id)

      const state = useDeckStore.getState()
      expect(state.decks).toHaveLength(0)

      const remainingCards = await db.deckCards.where('deckId').equals(id).toArray()
      expect(remainingCards).toHaveLength(0)

      const remainingChanges = await db.deckChanges.where('deckId').equals(id).toArray()
      expect(remainingChanges).toHaveLength(0)
    })

    it('clears activeDeckId when deleting the active deck', async () => {
      const { createDeck, deleteDeck } = useDeckStore.getState()
      const id = await createDeck('Active Deck')
      expect(useDeckStore.getState().activeDeckId).toBe(id)

      await deleteDeck(id)
      expect(useDeckStore.getState().activeDeckId).toBeNull()
    })

    it('does not clear activeDeckId when deleting a non-active deck', async () => {
      const { createDeck, deleteDeck, setActiveDeck } = useDeckStore.getState()
      const id1 = await createDeck('Deck 1')
      const id2 = await createDeck('Deck 2')

      setActiveDeck(id1)
      expect(useDeckStore.getState().activeDeckId).toBe(id1)

      await deleteDeck(id2)
      expect(useDeckStore.getState().activeDeckId).toBe(id1)
    })
  })

  describe('loadDecks', () => {
    it('returns decks ordered by updatedAt descending', async () => {
      const now = Date.now()
      // Insert decks directly with different updatedAt values
      await db.decks.add({
        name: 'Oldest Deck',
        commanderId: null,
        commanderName: null,
        colorIdentity: [],
        createdAt: now - 2000,
        updatedAt: now - 2000,
      })
      await db.decks.add({
        name: 'Newest Deck',
        commanderId: null,
        commanderName: null,
        colorIdentity: [],
        createdAt: now - 1000,
        updatedAt: now - 1000,
      })

      const { loadDecks } = useDeckStore.getState()
      await loadDecks()

      const state = useDeckStore.getState()
      expect(state.decks).toHaveLength(2)
      expect(state.decks[0].name).toBe('Newest Deck')
      expect(state.decks[1].name).toBe('Oldest Deck')
    })
  })

  describe('setActiveDeck', () => {
    it('updates activeDeckId', async () => {
      const { createDeck, setActiveDeck } = useDeckStore.getState()
      const id = await createDeck('My Deck')

      setActiveDeck(null)
      expect(useDeckStore.getState().activeDeckId).toBeNull()

      setActiveDeck(id)
      expect(useDeckStore.getState().activeDeckId).toBe(id)
    })
  })
})
