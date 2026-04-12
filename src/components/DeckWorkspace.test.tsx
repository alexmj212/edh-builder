import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../lib/db'
import { useDeckStore } from '../store/deck-store'
import { useCommanderStore } from '../store/commander-store'
import { DeckWorkspace } from './DeckWorkspace'

async function renderWorkspaceAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/decks/:id" element={<DeckWorkspace />} />
        <Route path="/" element={<p>Home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  useDeckStore.setState({ decks: [], activeDeckId: null, loading: false, error: null })
  useCommanderStore.setState({ primaryCommander: null, partnerCommander: null, loading: false, error: null })
  vi.restoreAllMocks()
})

describe('DeckWorkspace', () => {
  it('renders "Deck not found" when URL id has no matching deck (after loading=false)', async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false, error: null })
    await renderWorkspaceAt('/decks/999')
    expect(await screen.findByText(/Deck not found/i)).toBeInTheDocument()
    expect(screen.getByText(/Back to decks/i)).toBeInTheDocument()
  })

  it('shows loading state while useDeckStore loading=true', async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: true, error: null })
    await renderWorkspaceAt('/decks/1')
    expect(screen.getByText(/Loading deck/i)).toBeInTheDocument()
  })

  it('renders WorkspaceHeader, CommanderPanel, CardSearchSection stubs for a valid deck id', async () => {
    const id = await db.decks.add({
      name: 'Test Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    useDeckStore.setState({
      decks: [{ id: id as number, name: 'Test Deck', commanderId: null, commanderName: null, colorIdentity: [], createdAt: Date.now(), updatedAt: Date.now() }],
      activeDeckId: null,
      loading: false,
      error: null,
    })
    await renderWorkspaceAt(`/decks/${id}`)
    expect(await screen.findByText('Test Deck')).toBeInTheDocument()
    expect(screen.getByTestId('commander-panel')).toBeInTheDocument()
    expect(screen.getByTestId('card-search-section')).toBeInTheDocument()
    expect(screen.getByTestId('deck-placeholder')).toBeInTheDocument()
  })

  it('"Back to decks" link has href="/"', async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false, error: null })
    await renderWorkspaceAt('/decks/999')
    const link = await screen.findByRole('link', { name: /Back to decks/i })
    expect(link.getAttribute('href')).toBe('/')
  })
})
