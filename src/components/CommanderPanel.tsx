import type { ScryfallCard } from '@scryfall/api-types';
import { useCommanderStore } from '../store/commander-store';
import { getImageUri } from '../lib/scryfall-client';
import { detectPartnerType } from '../lib/partner-detection';
import { CommanderSearch } from './CommanderSearch';

export interface CommanderPanelProps { deckId: number }

function nameOf(c: ScryfallCard.Any): string {
  return (c as unknown as { name: string }).name;
}
function typeLineOf(c: ScryfallCard.Any): string {
  return (c as unknown as { type_line?: string }).type_line ?? '';
}

function EmptyArt({ label }: { label: string }) {
  return (
    <div className="h-40 sm:h-48 rounded bg-surface-hover flex items-center justify-center">
      <p className="text-text-secondary text-sm">{label}</p>
    </div>
  );
}

export function CommanderPanel({ deckId }: CommanderPanelProps) {
  const { primaryCommander, partnerCommander, setCommander, clearCommander, setPartner, clearPartner } = useCommanderStore();

  const primaryPartnerKind = primaryCommander ? detectPartnerType(primaryCommander).kind : 'none';
  const partnerSlotActive = !!primaryCommander && primaryPartnerKind !== 'none';

  return (
    <div className="rounded-lg bg-surface border border-border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary slot */}
        <div>
          {!primaryCommander ? (
            <>
              <EmptyArt label="No commander selected" />
              <div className="mt-3">
                <CommanderSearch
                  mode="primary"
                  onSelect={card => { void setCommander(deckId, card); }}
                />
              </div>
            </>
          ) : (
            <div>
              <img
                src={getImageUri(primaryCommander, 'art_crop')}
                alt={nameOf(primaryCommander)}
                className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
              />
              <p className="text-sm font-semibold text-text-primary mt-2">{nameOf(primaryCommander)}</p>
              <p className="text-xs text-text-secondary">{typeLineOf(primaryCommander)}</p>
              <button
                onClick={() => { void clearCommander(deckId); }}
                className="text-sm text-text-secondary hover:text-text-primary mt-2"
              >
                Change commander
              </button>
            </div>
          )}
        </div>

        {/* Partner slot */}
        <div>
          {!partnerSlotActive ? (
            <div
              aria-disabled="true"
              className="opacity-50 cursor-not-allowed border-dashed border border-border bg-surface rounded-lg h-40 sm:h-48 flex items-center justify-center"
            >
              <p className="text-text-secondary text-sm text-center">Partner (optional)</p>
            </div>
          ) : !partnerCommander ? (
            <>
              <EmptyArt label="Partner (optional)" />
              <div className="mt-3">
                <CommanderSearch
                  mode="partner"
                  primaryForPartner={primaryCommander}
                  onSelect={card => setPartner(card)}
                />
              </div>
            </>
          ) : (
            <div>
              <img
                src={getImageUri(partnerCommander, 'art_crop')}
                alt={nameOf(partnerCommander)}
                className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
              />
              <p className="text-sm font-semibold text-text-primary mt-2">{nameOf(partnerCommander)}</p>
              <p className="text-xs text-text-secondary">{typeLineOf(partnerCommander)}</p>
              <button
                onClick={() => clearPartner()}
                className="text-sm text-text-secondary hover:text-text-primary mt-2"
              >
                Remove partner
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
