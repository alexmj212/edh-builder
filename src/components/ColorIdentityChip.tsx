export interface ColorIdentityChipProps {
  colorIdentity: string[] | null;
}

const PIP_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;
const PIP_CLASS: Record<string, string> = {
  W: 'bg-white text-gray-800',
  U: 'bg-blue-600 text-white',
  B: 'bg-gray-800 border border-gray-600 text-white',
  R: 'bg-red-600 text-white',
  G: 'bg-green-600 text-white',
  C: 'bg-gray-500 text-white',
};
const PIP_ARIA: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
};

function Pip({ letter }: { letter: string }) {
  return (
    <span
      aria-label={PIP_ARIA[letter]}
      className={`w-5 h-5 rounded-sm text-xs font-semibold flex items-center justify-center ${PIP_CLASS[letter]}`}
    >
      {letter}
    </span>
  );
}

export function ColorIdentityChip({ colorIdentity }: ColorIdentityChipProps) {
  if (colorIdentity === null) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-text-secondary text-sm italic">
          Filtered to: Pick a commander first
        </span>
      </div>
    );
  }

  const pips = colorIdentity.length === 0
    ? ['C']
    : PIP_ORDER.filter(letter => colorIdentity.includes(letter));

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-text-secondary">Color identity:</span>
      <div className="flex items-center gap-1">
        {pips.map(letter => <Pip key={letter} letter={letter} />)}
      </div>
    </div>
  );
}
