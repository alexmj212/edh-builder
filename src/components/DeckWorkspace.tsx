import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDeckStore } from '../store/deck-store'
import { useCommanderStore } from '../store/commander-store'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CommanderPanel } from './CommanderPanel'

export function DeckWorkspace() {
  const { id } = useParams<{ id: string }>()
  const numericId = parseInt(id ?? '', 10)
  const { decks, loading, loadDecks } = useDeckStore()
  const loadForDeck = useCommanderStore(state => state.loadForDeck)

  useEffect(() => {
    if (decks.length === 0) {
      loadDecks()
    }
  }, [decks.length, loadDecks])

  useEffect(() => {
    if (!Number.isNaN(numericId)) {
      loadForDeck(numericId)
    }
  }, [numericId, loadForDeck])

  if (loading) {
    return <div className="text-text-secondary text-center py-16">Loading deck...</div>
  }

  const deck = Number.isNaN(numericId) ? undefined : decks.find(d => d.id === numericId)

  if (!deck) {
    return (
      <div className="text-text-secondary text-center py-16">
        <p className="mb-4">Deck not found.</p>
        <Link to="/" className="text-accent hover:text-accent-hover">← Back to decks</Link>
      </div>
    )
  }

  return (
    <div>
      <WorkspaceHeader deckName={deck.name} />
      <section
        aria-label="Commander"
        data-testid="commander-panel"
        className="mt-6"
      >
        <h2 className="text-xl font-semibold text-text-primary mb-4">Commander</h2>
        <CommanderPanel deckId={numericId} />
      </section>
      <section
        aria-label="Card Search"
        data-testid="card-search-section"
        className="mt-8"
      >
        <p className="text-text-secondary">Card search placeholder</p>
      </section>
      <section
        aria-label="Deck Cards"
        data-testid="deck-placeholder"
        className="mt-8 rounded-lg bg-surface border border-border border-dashed p-8 text-center"
      >
        <p className="text-text-secondary text-sm">Deck cards will appear here.</p>
      </section>
    </div>
  )
}
