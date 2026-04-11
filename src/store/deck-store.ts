import { create } from 'zustand'
import { db } from '../lib/db'
import type { Deck } from '../types/deck'

interface DeckState {
  decks: Deck[]
  activeDeckId: number | null
  loading: boolean
  loadDecks: () => Promise<void>
  createDeck: (name: string) => Promise<number>
  renameDeck: (id: number, name: string) => Promise<void>
  deleteDeck: (id: number) => Promise<void>
  setActiveDeck: (id: number | null) => void
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  activeDeckId: null,
  loading: true,

  loadDecks: async () => {
    const decks = await db.decks.orderBy('updatedAt').reverse().toArray()
    set({ decks, loading: false })
  },

  createDeck: async (name: string) => {
    const now = Date.now()
    const id = await db.decks.add({
      name,
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: now,
      updatedAt: now,
    })
    const numericId = id as number
    await get().loadDecks()
    set({ activeDeckId: numericId })
    return numericId
  },

  renameDeck: async (id: number, name: string) => {
    await db.decks.update(id, { name, updatedAt: Date.now() })
    await get().loadDecks()
  },

  deleteDeck: async (id: number) => {
    await db.transaction('rw', [db.decks, db.deckCards, db.deckChanges], async () => {
      await db.deckCards.where('deckId').equals(id).delete()
      await db.deckChanges.where('deckId').equals(id).delete()
      await db.decks.delete(id)
    })
    const currentActive = get().activeDeckId
    if (currentActive === id) {
      set({ activeDeckId: null })
    }
    await get().loadDecks()
  },

  setActiveDeck: (id: number | null) => {
    set({ activeDeckId: id })
  },
}))
