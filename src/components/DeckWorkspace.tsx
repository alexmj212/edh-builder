import { useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDeckStore } from '../store/deck-store'
import { useCommanderStore } from '../store/commander-store'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CardSearchSection } from './CardSearchSection'
import { DeckColumn } from './DeckColumn'

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
    if (Number.isNaN(numericId)) return
    const ctrl = new AbortController()
    void loadForDeck(numericId, ctrl.signal)
    return () => { ctrl.abort() }
  }, [numericId, loadForDeck])

  const outerScrollRef = useRef<HTMLDivElement>(null)
  const handleViewToggle = useCallback(() => {
    if (outerScrollRef.current) outerScrollRef.current.scrollTop = 0
  }, [])

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
    <div data-testid="deck-workspace">
      <WorkspaceHeader deckName={deck.name} />
      <div
        data-testid="card-search-section"
        className="flex flex-col lg:flex-row gap-6 mt-6 items-start"
      >
        {/* Search column — 60% */}
        <div className="flex-[3] min-w-0">
          <CardSearchSection />
        </div>
        {/* Deck column — 40%, sticky on desktop */}
        <div ref={outerScrollRef} className="flex-[2] min-w-0 lg:sticky lg:top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <DeckColumn deckId={numericId} onViewToggle={handleViewToggle} />
        </div>
      </div>
    </div>
  )
}
