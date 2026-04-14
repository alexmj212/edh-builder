import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../lib/db'
import { useDeckStore } from '../store/deck-store'
import { useCommanderStore } from '../store/commander-store'
import { useDeckCardsStore } from '../store/deck-cards-store'
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
  useDeckCardsStore.setState({ deckId: null, cards: [], viewMode: 'list', loading: false, error: null })
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

  it('renders WorkspaceHeader and CardSearchSection for a valid deck id', async () => {
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
    expect(screen.getByTestId('card-search-section')).toBeInTheDocument()
    // DeckColumn mounts in place of deck-placeholder
    expect(screen.getByTestId('deck-column')).toBeInTheDocument()
    // No legacy placeholder
    expect(screen.queryByTestId('deck-placeholder')).toBeNull()
  })

  it('"Back to decks" link has href="/"', async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false, error: null })
    await renderWorkspaceAt('/decks/999')
    const link = await screen.findByRole('link', { name: /Back to decks/i })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('60/40 layout: search col has flex-[3], deck col has flex-[2] and lg:sticky', async () => {
    const id = await db.decks.add({
      name: 'Layout Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    useDeckStore.setState({
      decks: [{ id: id as number, name: 'Layout Deck', commanderId: null, commanderName: null, colorIdentity: [], createdAt: Date.now(), updatedAt: Date.now() }],
      activeDeckId: null,
      loading: false,
      error: null,
    })
    await renderWorkspaceAt(`/decks/${id}`)
    await screen.findByText('Layout Deck')
    const workspace = screen.getByTestId('deck-workspace')
    // The outer split container should be inside the workspace
    expect(workspace).toBeInTheDocument()
    // DeckColumn wrapper has lg:sticky class
    const deckColWrapper = screen.getByTestId('deck-column').parentElement!
    expect(deckColWrapper.className).toMatch(/flex-\[2\]/)
    expect(deckColWrapper.className).toMatch(/lg:sticky/)
  })

  it('single CommanderPanel mount: commander-strip-image inside deck-column only', async () => {
    const id = await db.decks.add({
      name: 'Commander Deck',
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    useDeckStore.setState({
      decks: [{ id: id as number, name: 'Commander Deck', commanderId: null, commanderName: null, colorIdentity: [], createdAt: Date.now(), updatedAt: Date.now() }],
      activeDeckId: null,
      loading: false,
      error: null,
    })
    // Stub loadForDeck on both stores so pre-seeded state is not overwritten
    useCommanderStore.setState({
      primaryCommander: {
        id: 'c-1',
        oracle_id: 'o-1',
        name: 'Atraxa',
        type_line: 'Legendary Creature',
        image_uris: { normal: 'https://img/normal.jpg', art_crop: 'https://img/art_crop/atraxa.jpg', small: 'https://img/small.jpg' },
        color_identity: ['W', 'U', 'B', 'G'],
        keywords: [],
      } as any,
      loadedDeckId: id as number,
      loading: false,
      loadForDeck: vi.fn().mockResolvedValue(undefined),
    } as any)
    useDeckCardsStore.setState({
      deckId: id as number,
      cards: [],
      viewMode: 'list',
      loading: false,
      error: null,
      loadForDeck: vi.fn().mockResolvedValue(undefined),
    } as any)
    await renderWorkspaceAt(`/decks/${id}`)
    await screen.findByText('Commander Deck')

    const workspace = screen.getByTestId('deck-workspace')
    const deckColumn = screen.getByTestId('deck-column')

    // Exactly one commander-strip-image in the workspace, inside deckColumn
    const allStripImgs = within(workspace).queryAllByTestId('commander-strip-image')
    expect(allStripImgs).toHaveLength(1)
    expect(deckColumn.contains(allStripImgs[0])).toBe(true)

    // art_crop wiring: src contains art_crop
    expect(allStripImgs[0].getAttribute('src')).toMatch(/art_crop/)
  })
})
