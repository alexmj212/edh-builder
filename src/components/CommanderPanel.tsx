import { useState } from 'react';
import type { Card } from '../lib/scryfall';
import { getImageUri } from '../lib/scryfall';
import { useCommanderStore } from '../store/commander-store';
import { detectPartnerType } from '../lib/partner-detection';
import { CommanderSearch } from './CommanderSearch';

export interface CommanderPanelProps {
  deckId: number;
  variant?: 'normal' | 'art_crop';
}

/** Returns the `normal` (full-card) image for a given face index, with fallbacks. */
function fullCardImageFor(card: Card, faceIndex: number): string {
  const face = card.card_faces?.[faceIndex];
  return face?.image_uris?.normal ?? card.image_uris?.normal ?? '/placeholder-card.jpg';
}

/** Returns the `art_crop` image for a given face index, with fallbacks. */
function artCropImageFor(card: Card, faceIndex: number): string {
  const face = card.card_faces?.[faceIndex];
  return face?.image_uris?.art_crop ?? card.image_uris?.art_crop ?? getImageUri(card, 'art_crop');
}

function isDoubleFaced(card: Card): boolean {
  // A card is "double-faced" for our purposes if it has 2+ faces, each with their own image_uris
  return !!(card.card_faces && card.card_faces.length >= 2 && card.card_faces[0]?.image_uris && card.card_faces[1]?.image_uris);
}

function EmptyArt({ label }: { label: string }) {
  return (
    <div className="w-full max-w-[240px] mx-auto aspect-[63/88] rounded bg-surface-hover flex items-center justify-center">
      <p className="text-text-secondary text-sm">{label}</p>
    </div>
  );
}

interface FullCardProps {
  card: Card;
  actionLabel: string;
  onAction: () => void;
  variant?: 'normal' | 'art_crop';
}

function FullCard({ card, actionLabel, onAction, variant = 'normal' }: FullCardProps) {
  const [faceIndex, setFaceIndex] = useState(0);
  const dfc = isDoubleFaced(card);

  const imgSrc = variant === 'art_crop'
    ? artCropImageFor(card, faceIndex)
    : fullCardImageFor(card, faceIndex);

  const imgClassName = variant === 'art_crop'
    ? 'w-full aspect-[626/457] object-cover rounded-lg shadow-md'
    : 'w-full max-w-[240px] aspect-[63/88] object-contain rounded-lg shadow-md';

  return (
    <div className="flex flex-col items-center">
      <img
        src={imgSrc}
        alt={card.name}
        loading="lazy"
        data-testid={variant === 'art_crop' ? 'commander-strip-image' : undefined}
        className={imgClassName}
      />
      <p className="text-sm font-semibold text-text-primary mt-2 text-center">{card.name}</p>
      <p className="text-xs text-text-secondary text-center">{card.type_line}</p>
      <div className="mt-2 flex items-center gap-2">
        {dfc && (
          <button
            type="button"
            onClick={() => setFaceIndex(i => (i === 0 ? 1 : 0))}
            className="text-sm text-text-secondary hover:text-text-primary"
            aria-label="Flip card to other face"
          >
            Flip
          </button>
        )}
        <button
          type="button"
          onClick={onAction}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function CommanderPanel({ deckId, variant = 'normal' }: CommanderPanelProps) {
  const { primaryCommander, partnerCommander, loading, loadedDeckId, setCommander, clearCommander, setPartner, clearPartner } = useCommanderStore();

  // Gate on "is the store authoritative for THIS deck?" rather than just
  // "is a fetch in flight right now?" — the latter misses the window
  // between DeckWorkspace's first render and its loadForDeck effect on
  // client-side navigation (deck-store already loaded, so no upstream
  // "Loading deck..." placeholder gives loadForDeck a chance to flip
  // `loading` before CommanderPanel renders).
  const isHydratedForDeck = loadedDeckId === deckId && !loading;

  const primaryPartnerKind = primaryCommander ? detectPartnerType(primaryCommander).kind : 'none';
  const partnerSlotActive = !!primaryCommander && primaryPartnerKind !== 'none';

  return (
    <div className="rounded-lg bg-surface border border-border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary slot */}
        <div>
          {!isHydratedForDeck ? (
            // Skeleton whenever the store isn't hydrated for this deck
            // (initial mount, in-flight loadForDeck, or a /decks/A→/decks/B
            // navigation mid-transition). This is what prevents the
            // empty-fragment EDHREC browse from firing on deck open.
            <EmptyArt label="Loading commander…" />
          ) : !primaryCommander ? (
            <>
              <EmptyArt label="No commander selected" />
              <div className="mt-2">
                <CommanderSearch
                  mode="primary"
                  onSelect={card => { void setCommander(deckId, card); }}
                />
              </div>
            </>
          ) : (
            <FullCard
              card={primaryCommander}
              variant={variant}
              actionLabel="Change commander"
              onAction={() => { void clearCommander(deckId); }}
            />
          )}
        </div>

        {/* Partner slot */}
        <div>
          {!isHydratedForDeck ? (
            <EmptyArt label="Loading partner…" />
          ) : !partnerSlotActive ? (
            <div
              aria-disabled="true"
              className="opacity-50 cursor-not-allowed border-dashed border border-border bg-surface rounded-lg h-40 sm:h-48 flex items-center justify-center"
            >
              <p className="text-text-secondary text-sm text-center">Partner (optional)</p>
            </div>
          ) : !partnerCommander ? (
            <>
              <EmptyArt label="Partner (optional)" />
              <div className="mt-2">
                <CommanderSearch
                  mode="partner"
                  primaryForPartner={primaryCommander!}
                  onSelect={card => { void setPartner(deckId, card); }}
                />
              </div>
            </>
          ) : (
            <FullCard
              card={partnerCommander}
              variant={variant}
              actionLabel="Remove partner"
              onAction={() => { void clearPartner(deckId); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
