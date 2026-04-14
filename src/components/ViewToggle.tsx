export interface ViewToggleProps {
  mode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  const activeClass = 'bg-accent text-white px-2 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset';
  const inactiveClass = 'bg-surface text-text-secondary hover:bg-surface-hover transition-colors px-2 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset';

  return (
    <div role="group" aria-label="Deck view" className="flex rounded-lg border border-border overflow-hidden text-sm">
      <button
        type="button"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={mode === 'list' ? activeClass : inactiveClass}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
        className={`border-l border-border ${mode === 'grid' ? activeClass : inactiveClass}`}
      >
        Grid
      </button>
    </div>
  );
}
