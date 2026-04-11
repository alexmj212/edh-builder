import { describe, it, expect, beforeEach } from 'vitest'
import { EDHBuilderDB } from './db'

describe('EDHBuilderDB', () => {
  let db: EDHBuilderDB

  beforeEach(async () => {
    db = new EDHBuilderDB()
    // Use a unique name per test to avoid conflicts
    await db.delete()
    db = new EDHBuilderDB()
  })

  it('has decks table', () => {
    expect(db.decks).toBeDefined()
  })

  it('has deckCards table', () => {
    expect(db.deckCards).toBeDefined()
  })

  it('has deckChanges table', () => {
    expect(db.deckChanges).toBeDefined()
  })

  it('can add and retrieve a deck', async () => {
    const id = await db.decks.add({
      name: 'Test Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck).toBeDefined()
    expect(deck!.name).toBe('Test Deck')
  })

  it('can add a deckCard linked to a deck', async () => {
    const deckId = await db.decks.add({
      name: 'Test Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await db.deckCards.add({
      deckId: deckId as number,
      scryfallId: 'abc-123',
      cardName: 'Sol Ring',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
    })
    const cards = await db.deckCards.where('deckId').equals(deckId).toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0].cardName).toBe('Sol Ring')
  })

  it('can add a deckChange entry', async () => {
    const changeId = await db.deckChanges.add({
      deckId: 1,
      type: 'add',
      cardName: 'Sol Ring',
      scryfallId: 'abc-123',
      timestamp: Date.now(),
    })
    const change = await db.deckChanges.get(changeId)
    expect(change).toBeDefined()
    expect(change!.type).toBe('add')
  })
})
