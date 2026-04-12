import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommanderPanel } from './CommanderPanel';
import { useCommanderStore } from '../store/commander-store';

function fakeCard(overrides: { id?: string; name?: string; type_line?: string; keywords?: string[]; oracle_text?: string; color_identity?: string[] } = {}): any {
  return { id: 'c-1', oracle_id: 'o-1', name: 'Fake', type_line: 'Legendary Creature — Human', image_uris: { art_crop: 'x' }, color_identity: ['W'], ...overrides };
}

beforeEach(() => {
  useCommanderStore.setState({ primaryCommander: null, partnerCommander: null, loading: false, error: null });
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
});
