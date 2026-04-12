import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeckStore } from '../store/deck-store'
import type { PersistedDeck } from '../types/deck'

function relativeTime(timestamp: number): string {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSeconds < 60) return 'just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`
  return new Date(timestamp).toLocaleDateString()
}

interface DeckCardItemProps {
  deck: PersistedDeck
  isActive: boolean
  onSelect: () => void
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
}

function DeckCardItem({ deck, isActive, onSelect, onRename, onDelete }: DeckCardItemProps) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(deck.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== deck.name) {
      onRename(deck.id, trimmed)
    }
    setRenameValue(deck.name)
    setRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setRenameValue(deck.name)
      setRenaming(false)
    }
  }

  return (
    <div
      className={`rounded-lg bg-surface border border-border p-4 hover:bg-surface-hover transition-colors cursor-pointer${isActive ? ' ring-2 ring-accent' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        {renaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="font-semibold text-text-primary bg-background border border-border rounded px-2 py-0.5 flex-1 mr-2 focus:outline-none focus:ring-1 focus:ring-accent"
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <h3 className="font-semibold text-text-primary truncate">{deck.name}</h3>
        )}
        <span className="text-xs text-text-secondary shrink-0 ml-2">
          {relativeTime(deck.updatedAt)}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        {confirmDelete ? (
          <>
            <span className="text-sm text-text-secondary">Delete this deck?</span>
            <button
              onClick={e => {
                e.stopPropagation()
                onDelete(deck.id)
              }}
              className="text-sm text-danger hover:text-danger-hover"
            >
              Yes
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                setConfirmDelete(false)
              }}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e => {
                e.stopPropagation()
                setRenameValue(deck.name)
                setRenaming(true)
              }}
              className="text-sm text-accent hover:text-accent-hover"
            >
              Rename
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                setConfirmDelete(true)
              }}
              className="text-sm text-danger hover:text-danger-hover"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function DeckList() {
  const { decks, activeDeckId, loading, error, loadDecks, createDeck, renameDeck, deleteDeck, setActiveDeck } =
    useDeckStore()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  const handleCreate = async () => {
    const trimmed = newDeckName.trim()
    if (!trimmed) return
    await createDeck(trimmed)
    setNewDeckName('')
    setShowCreate(false)
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      setNewDeckName('')
      setShowCreate(false)
    }
  }

  if (loading) {
    return <p className="text-text-secondary">Loading decks...</p>
  }

  if (error) {
    return <p className="text-danger">{error}</p>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Your Decks</h2>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-background font-medium text-sm transition-colors"
          >
            New Deck
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-4 flex gap-2 items-center">
          <input
            type="text"
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            placeholder="Deck name..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-background font-medium text-sm transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setNewDeckName('')
              setShowCreate(false)
            }}
            className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover text-text-secondary text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No decks yet. Create your first deck!</p>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-background font-medium transition-colors"
            >
              New Deck
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map(deck => (
            <DeckCardItem
              key={deck.id}
              deck={deck}
              isActive={deck.id === activeDeckId}
              onSelect={() => {
                setActiveDeck(deck.id)
                navigate(`/decks/${deck.id}`)
              }}
              onRename={renameDeck}
              onDelete={deleteDeck}
            />
          ))}
        </div>
      )}
    </div>
  )
}
