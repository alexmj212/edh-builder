import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardResultCell } from './CardResultCell';

function fakeCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'c-1',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Deal 3 damage.',
    image_uris: { normal: 'https://img/normal.jpg' },
    ...overrides,
  };
}

describe('CardResultCell', () => {
  it('renders image with lazy loading and correct src', () => {
    render(<CardResultCell card={fakeCard() as any} />);
    const img = screen.getByRole('img', { name: 'Lightning Bolt' });
    expect(img.getAttribute('src')).toBe('https://img/normal.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders card name, mana cost, type line, oracle text in overlay', () => {
    render(<CardResultCell card={fakeCard() as any} />);
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
    expect(screen.getByText('{R}')).toBeInTheDocument();
    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Deal 3 damage.')).toBeInTheDocument();
  });

  it('renders disabled Add stub with Phase 3 tooltip', () => {
    render(<CardResultCell card={fakeCard() as any} />);
    const btn = screen.getByRole('button', { name: /Add to deck/i });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('title')).toBe('Add to deck — coming in Phase 3');
  });

  it('falls back to card_faces[0].image_uris.normal for DFC cards', () => {
    const dfc = {
      id: 'c-2',
      name: 'Delver',
      card_faces: [{ image_uris: { normal: 'https://img/face0.jpg' } }],
    };
    render(<CardResultCell card={dfc as any} />);
    expect(screen.getByRole('img', { name: 'Delver' }).getAttribute('src')).toBe('https://img/face0.jpg');
  });

  it('escapes HTML in card name (no XSS)', () => {
    render(<CardResultCell card={fakeCard({ name: '<script>alert(1)</script>' }) as any} />);
    // React renders as literal text — querying by the literal string finds it
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('omits mana cost paragraph when card has no mana_cost', () => {
    render(<CardResultCell card={fakeCard({ mana_cost: '' }) as any} />);
    expect(screen.queryByText('{R}')).toBeNull();
  });
});
