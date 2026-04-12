import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommanderPanel } from './CommanderPanel';
import { useCommanderStore } from '../store/commander-store';
import { db } from '../lib/db';
import * as scryfallClient from '../lib/scryfall-client';

function fakeCard(overrides: { id?: string; name?: string; type_line?: string; keywords?: string[]; oracle_text?: string; color_identity?: string[]; image_uris?: Record<string, string>; card_faces?: Array<{ image_uris?: Record<string, string> }> } = {}): any {
  return { id: 'c-1', oracle_id: 'o-1', name: 'Fake', type_line: 'Legendary Creature — Human', image_uris: { art_crop: 'art-x', normal: 'normal-x' }, color_identity: ['W'], ...overrides };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCommanderStore.setState({ primaryCommander: null, partnerCommander: null, loading: false, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CommanderPanel', () => {
  it('shows empty state when no commander selected', () => {
    render(<CommanderPanel deckId={1} />);
    expect(screen.getByText('No commander selected')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for a commander...')).toBeInTheDocument();
  });

  it('shows disabled Partner slot when no primary', () => {
    render(<CommanderPanel deckId={1} />);
    const partnerSlot = screen.getByText('Partner (optional)');
    expect(partnerSlot.closest('[aria-disabled="true"]')).not.toBeNull();
  });

  it('renders primary commander art + name when selected, with Change commander button', () => {
    useCommanderStore.setState({ primaryCommander: fakeCard({ name: 'Atraxa' }) as any });
    render(<CommanderPanel deckId={1} />);
    expect(screen.getByText('Atraxa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change commander/i })).toBeInTheDocument();
  });

  it('activates Partner slot when primary has Partner keyword', () => {
    useCommanderStore.setState({ primaryCommander: fakeCard({ name: 'Thrasios', keywords: ['Partner'] }) as any });
    render(<CommanderPanel deckId={1} />);
    // No aria-disabled when active; the empty art block for partner shows "Partner (optional)"
    const labels = screen.getAllByText('Partner (optional)');
    // At least one partner label should NOT be inside aria-disabled container
    const activeCount = labels.filter(el => el.closest('[aria-disabled="true"]') === null).length;
    expect(activeCount).toBeGreaterThan(0);
  });

  it('renders full-card normal image (not art_crop) for the primary commander', () => {
    useCommanderStore.setState({ primaryCommander: fakeCard({ name: 'Atraxa' }) as any });
    render(<CommanderPanel deckId={1} />);
    const img = screen.getByAltText('Atraxa') as HTMLImageElement;
    // Regression: must use the full-card `normal` image so users can read mana cost,
    // type, oracle text, P/T — not the cropped artwork.
    expect(img.src).toContain('normal-x');
    expect(img.src).not.toContain('art-x');
  });

  it('shows a Flip button only when the commander is double-faced', () => {
    useCommanderStore.setState({ primaryCommander: fakeCard({ name: 'Single' }) as any });
    const { rerender } = render(<CommanderPanel deckId={1} />);
    expect(screen.queryByRole('button', { name: /Flip/i })).toBeNull();

    useCommanderStore.setState({
      primaryCommander: fakeCard({
        name: 'TwoFace',
        card_faces: [
          { image_uris: { normal: 'face-front' } },
          { image_uris: { normal: 'face-back' } },
        ],
      }) as any,
    });
    rerender(<CommanderPanel deckId={1} />);
    const flip = screen.getByRole('button', { name: /Flip/i });
    expect(flip).toBeInTheDocument();
    // Initially shows face 0
    expect((screen.getByAltText('TwoFace') as HTMLImageElement).src).toContain('face-front');
    fireEvent.click(flip);
    expect((screen.getByAltText('TwoFace') as HTMLImageElement).src).toContain('face-back');
  });

  it('Change commander button calls clearCommander with deckId', () => {
    const clearCommander = vi.fn().mockResolvedValue(undefined);
    useCommanderStore.setState({
      primaryCommander: fakeCard({ name: 'Atraxa' }) as any,
      clearCommander,
    } as any);
    render(<CommanderPanel deckId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /Change commander/i }));
    expect(clearCommander).toHaveBeenCalledWith(42);
  });

  it('Remove partner button calls clearPartner with deckId and persists null partner fields to Dexie', async () => {
    const deckId = (await db.decks.add({
      name: 'Partner Panel Test',
      commanderId: 'primary-id',
      commanderName: 'Primary',
      colorIdentity: ['G', 'U'],
      partnerCommanderId: 'partner-id',
      partnerCommanderName: 'Partner Card',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    // Seed in-memory so the partner FullCard branch renders
    const primary = fakeCard({ id: 'primary-id', name: 'Primary', keywords: ['Partner'] });
    const partner = fakeCard({ id: 'partner-id', name: 'Partner Card', keywords: ['Partner'] });
    useCommanderStore.setState({
      primaryCommander: primary as any,
      partnerCommander: partner as any,
    });

    render(<CommanderPanel deckId={deckId} />);

    const removeBtn = screen.getByRole('button', { name: /Remove partner/i });
    fireEvent.click(removeBtn);

    // Allow the async clearPartner promise to settle.
    // clearPartner awaits db.decks.update, then calls set() — two microtask turns is plenty.
    await Promise.resolve();
    await Promise.resolve();

    const deck = await db.decks.get(deckId);
    expect(deck?.partnerCommanderId).toBeNull();
    expect(deck?.partnerCommanderName).toBeNull();
    expect(useCommanderStore.getState().partnerCommander).toBeNull();
  });

  it('loadForDeck rehydrates partner and CommanderPanel renders the restored partner FullCard on remount', async () => {
    const deckId = (await db.decks.add({
      name: 'Rehydrate Test',
      commanderId: 'primary-id',
      commanderName: 'Primary',
      colorIdentity: ['G', 'U'],
      partnerCommanderId: 'partner-id',
      partnerCommanderName: 'Restored Partner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as number;

    vi.spyOn(scryfallClient, 'fetchCardById').mockImplementation(async (id: string) => {
      if (id === 'primary-id') {
        return fakeCard({ id: 'primary-id', name: 'Primary', keywords: ['Partner'] }) as any;
      }
      if (id === 'partner-id') {
        return fakeCard({ id: 'partner-id', name: 'Restored Partner', keywords: ['Partner'] }) as any;
      }
      throw new Error(`Unexpected id: ${id}`);
    });

    // Simulate the DeckWorkspace mount path: loadForDeck runs before the panel renders
    await useCommanderStore.getState().loadForDeck(deckId);

    render(<CommanderPanel deckId={deckId} />);

    // Partner FullCard renders with the restored name and Remove-partner button
    expect(screen.getByText('Restored Partner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove partner/i })).toBeInTheDocument();
  });
});
