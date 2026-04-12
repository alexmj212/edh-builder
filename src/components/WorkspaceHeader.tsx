import { Link } from 'react-router-dom'

export interface WorkspaceHeaderProps {
  deckName: string
}

export function WorkspaceHeader({ deckName }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border mb-6">
      <Link
        to="/"
        className="text-accent hover:text-accent-hover text-sm font-semibold"
      >
        ← Back to decks
      </Link>
      <h1 className="text-2xl font-semibold text-text-primary truncate ml-4">
        {deckName}
      </h1>
    </div>
  )
}
