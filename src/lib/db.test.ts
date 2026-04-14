import { describe, it, expect, beforeEach } from 'vitest'
import type { Card } from './scryfall'
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

describe('Dexie v2 migration', () => {
  let db: EDHBuilderDB

  beforeEach(async () => {
    db = new EDHBuilderDB()
    await db.delete()
    db = new EDHBuilderDB()
    await db.open()
  })

  it('preserves v1 decks after v2 schema applied', async () => {
    const id = await db.decks.add({
      name: 'Legacy Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck).toBeDefined()
    expect(deck!.name).toBe('Legacy Deck')
  })

  it('cards store accepts put and get by oracle_id', async () => {
    const cachedAt = Date.now()
    await db.cards.put({
      oracle_id: 'test-oracle-1',
      cardJson: {} as Card,
      cachedAt,
    })
    const card = await db.cards.get('test-oracle-1')
    expect(card).toBeDefined()
    expect(card!.cachedAt).toBe(cachedAt)
  })

  it('cards store supports where(cachedAt) range queries for TTL eviction', async () => {
    await db.cards.put({
      oracle_id: 'old-card',
      cardJson: {} as Card,
      cachedAt: 1000,
    })
    await db.cards.put({
      oracle_id: 'new-card',
      cardJson: {} as Card,
      cachedAt: 2000,
    })
    const staleCards = await db.cards.where('cachedAt').below(1500).toArray()
    expect(staleCards).toHaveLength(1)
    expect(staleCards[0].oracle_id).toBe('old-card')
  })
})

describe('Dexie v3 migration', () => {
  let db: EDHBuilderDB

  beforeEach(async () => {
    db = new EDHBuilderDB()
    await db.delete()
    db = new EDHBuilderDB()
    await db.open()
  })

  it('reads v2-shaped deck rows (no partner fields) cleanly under v3', async () => {
    const id = await db.decks.add({
      name: 'Legacy v2 Deck',
      commanderId: 'cmdr-1',
      commanderName: 'Atraxa',
      colorIdentity: ['W', 'U', 'B', 'G'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck).toBeDefined()
    expect(deck!.commanderName).toBe('Atraxa')
    expect(deck!.partnerCommanderId).toBeUndefined()
    expect(deck!.partnerCommanderName).toBeUndefined()
  })

  it('round-trips partnerCommanderId and partnerCommanderName when set', async () => {
    const id = await db.decks.add({
      name: 'Partner Deck',
      commanderId: 'primary-id',
      commanderName: 'Thrasios',
      colorIdentity: ['G', 'U'],
      partnerCommanderId: 'partner-id',
      partnerCommanderName: 'Tymna the Weaver',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck?.partnerCommanderId).toBe('partner-id')
    expect(deck?.partnerCommanderName).toBe('Tymna the Weaver')
  })

  it('supports explicit null for partner fields (auto-clear path)', async () => {
    const id = await db.decks.add({
      name: 'Cleared Partner Deck',
      commanderId: 'primary-id',
      commanderName: 'Primary',
      colorIdentity: ['R'],
      partnerCommanderId: 'will-be-cleared',
      partnerCommanderName: 'Will Be Cleared',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await db.decks.update(id, {
      partnerCommanderId: null,
      partnerCommanderName: null,
    })
    const deck = await db.decks.get(id)
    expect(deck?.partnerCommanderId).toBeNull()
    expect(deck?.partnerCommanderName).toBeNull()
  })
})

describe('Dexie v4 additive migration', () => {
  let db: EDHBuilderDB

  beforeEach(async () => {
    db = new EDHBuilderDB()
    await db.delete()
    db = new EDHBuilderDB()
    await db.open()
  })

  it('exposes schema version >= 4', () => {
    expect(db.verno).toBeGreaterThanOrEqual(4)
  })

  it('round-trips Deck.viewMode', async () => {
    const id = await db.decks.add({
      name: 'View Mode Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      viewMode: 'grid',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck?.viewMode).toBe('grid')
  })

  it('round-trips DeckCard.originalReleaseDate', async () => {
    const deckId = await db.decks.add({
      name: 'Test Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const cardId = await db.deckCards.add({
      deckId: deckId as number,
      scryfallId: 'sol-ring-id',
      cardName: 'Sol Ring',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
      originalReleaseDate: '1993-12-31',
    })
    const card = await db.deckCards.get(cardId)
    expect(card?.originalReleaseDate).toBe('1993-12-31')
  })

  it('reads legacy rows without viewMode as undefined', async () => {
    const id = await db.decks.add({
      name: 'Legacy Deck No ViewMode',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const deck = await db.decks.get(id)
    expect(deck?.viewMode).toBeUndefined()
  })

  it('persists originalReleaseDate: null', async () => {
    const deckId = await db.decks.add({
      name: 'Test Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const cardId = await db.deckCards.add({
      deckId: deckId as number,
      scryfallId: 'force-of-will-id',
      cardName: 'Force of Will',
      quantity: 1,
      isCommander: false,
      addedAt: Date.now(),
      originalReleaseDate: null,
    })
    const card = await db.deckCards.get(cardId)
    expect(card?.originalReleaseDate).toBeNull()
  })
})
