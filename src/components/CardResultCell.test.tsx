import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardResultCell } from './CardResultCell';

function makeCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'c-1',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Deal 3 damage.',
    image_uris: { normal: 'https://img/normal.jpg' },
    keywords: [],
    color_identity: [],
    ...overrides,
  };
}

// Alias for backwards-compat with existing tests
function fakeCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeCard(overrides);
}

describe('CardResultCell', () => {
  // --- Phase 2 tests (KEEP UNTOUCHED) ---

  it('renders image with lazy loading and correct src', () => {
    render(<CardResultCell card={fakeCard() as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    const img = screen.getByRole('img', { name: 'Lightning Bolt' });
    expect(img.getAttribute('src')).toBe('https://img/normal.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders card name, mana cost, type line, oracle text in overlay', () => {
    render(<CardResultCell card={fakeCard() as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
    expect(screen.getByText('{R}')).toBeInTheDocument();
    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Deal 3 damage.')).toBeInTheDocument();
  });

  it('falls back to card_faces[0].image_uris.normal for DFC cards', () => {
    const dfc = {
      id: 'c-2',
      name: 'Delver',
      type_line: 'Creature',
      keywords: [],
      color_identity: [],
      card_faces: [{ image_uris: { normal: 'https://img/face0.jpg' } }],
    };
    render(<CardResultCell card={dfc as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Delver' }).getAttribute('src')).toBe('https://img/face0.jpg');
  });

  it('escapes HTML in card name (no XSS)', () => {
    render(<CardResultCell card={fakeCard({ name: '<script>alert(1)</script>' }) as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    // React renders as literal text — querying by the literal string finds it
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('omits mana cost paragraph when card has no mana_cost', () => {
    render(<CardResultCell card={fakeCard({ mana_cost: '' }) as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    expect(screen.queryByText('{R}')).toBeNull();
  });

  // --- Phase 3 tests (NEW) ---

  it('renders enabled (+) button with aria-label "Add {name} to deck" when not in deck', () => {
    const card = makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<CardResultCell card={card as any} isInDeck={false} isAdding={false} onAdd={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Add Sol Ring to deck' });
    expect(btn).toBeEnabled();
    expect(btn.className).toMatch(/bg-accent/);
  });

  it('calls onAdd when (+) clicked', async () => {
    const onAdd = vi.fn();
    const card = makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<CardResultCell card={card as any} isInDeck={false} isAdding={false} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Sol Ring to deck' }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('disables (+) with aria-label "Already in deck" for duplicate non-basic', () => {
    const card = makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<CardResultCell card={card as any} isInDeck={true} isAdding={false} onAdd={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Already in deck' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Already in deck');
    expect(btn.className).toMatch(/opacity-40/);
  });

  it('leaves (+) enabled for a basic land even when isInDeck=true', () => {
    const card = makeCard({ name: 'Forest', type_line: 'Basic Land — Forest' });
    render(<CardResultCell card={card as any} isInDeck={true} isAdding={false} onAdd={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Add Forest to deck' });
    expect(btn).toBeEnabled();
  });

  it('shows loading state (opacity-50, spinner, disabled) while isAdding=true', () => {
    const card = makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<CardResultCell card={card as any} isInDeck={false} isAdding={true} onAdd={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Adding Sol Ring/ });
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/opacity-50/);
  });

  it('does not call onAdd when disabled', async () => {
    const onAdd = vi.fn();
    const card = makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<CardResultCell card={card as any} isInDeck={true} isAdding={false} onAdd={onAdd} />);
    // button is disabled so userEvent click on a disabled button doesn't fire
    const btn = screen.getByRole('button', { name: 'Already in deck' });
    expect(btn).toBeDisabled();
    // Verify click does NOT call onAdd
    await userEvent.click(btn, { pointerEventsCheck: 0 });
    expect(onAdd).not.toHaveBeenCalled();
  });
});
