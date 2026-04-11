import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DeckList } from './DeckList'
import { useDeckStore } from '../store/deck-store'
import { db } from '../lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
  useDeckStore.setState({ decks: [], activeDeckId: null, loading: true })
})

describe('DeckList', () => {
  it('renders "Loading decks..." initially when loading is true', () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: true })
    render(<DeckList />)
    expect(screen.getByText('Loading decks...')).toBeInTheDocument()
  })

  it('shows empty state message when no decks exist', async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false })
    render(<DeckList />)
    await waitFor(() => {
      expect(screen.getByText(/No decks yet/)).toBeInTheDocument()
    })
  })

  it('renders deck names after loading', async () => {
    useDeckStore.setState({
      decks: [
        {
          id: 1,
          name: 'Atraxa Superfriends',
          commanderId: null,
          commanderName: null,
          colorIdentity: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 2,
          name: 'Krenko Goblins',
          commanderId: null,
          commanderName: null,
          colorIdentity: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeDeckId: null,
      loading: false,
    })

    render(<DeckList />)

    await waitFor(() => {
      expect(screen.getByText('Atraxa Superfriends')).toBeInTheDocument()
      expect(screen.getByText('Krenko Goblins')).toBeInTheDocument()
    })
  })
})
