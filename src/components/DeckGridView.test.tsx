import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { DeckGridView } from './DeckGridView';
import type { DeckCard } from '../types/deck';
import type { Card } from '../lib/scryfall';

function makeDeckCard(overrides: Partial<DeckCard>): DeckCard {
  return { id: 1, deckId: 1, scryfallId: 's1', cardName: 'Name', quantity: 1, isCommander: false, addedAt: 0, ...overrides };
}
function makeCard(overrides: Partial<Card> & { type_line: string; name: string }): Card {
  return {
    id: 'sid', oracle_id: 'oid', name: overrides.name, type_line: overrides.type_line,
    mana_cost: '', cmc: 0, colors: [], color_identity: [], keywords: [],
    image_uris: { small: 'https://example.com/s.jpg', normal: '', art_crop: '' },
    ...overrides as Partial<Card>,
  } as Card;
}

describe('DeckGridView', () => {
  it('outer container uses grid grid-cols-3 gap-2', () => {
    const { container } = render(
      <StrictMode><DeckGridView cards={[]} cardLookup={() => undefined} onRemove={vi.fn()} /></StrictMode>
    );
    const grid = container.firstElementChild;
    expect(grid?.className).toMatch(/grid/);
    expect(grid?.className).toMatch(/grid-cols-3/);
    expect(grid?.className).toMatch(/gap-2/);
  });

  it('each cell uses aspect-[146/204]', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    const { container } = render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    // The cell container should have the aspect ratio class
    const cell = container.querySelector('[class*="aspect-"]');
    expect(cell).not.toBeNull();
    expect(cell?.className).toMatch(/aspect-\[146\/204\]/);
  });

  it('renders skeleton div before img.onLoad', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    const { container } = render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('skeleton is removed after img.onLoad fires', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    const { container } = render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.load(img!);
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('img has loading="lazy" and decoding="async"', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    const { container } = render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('calls getImageUri(card, "small") for src — img src matches small URL', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    const { container } = render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/s.jpg');
  });

  it('remove button is always visible (no opacity-0)', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    const btn = screen.getByRole('button', { name: 'Remove Sol Ring from deck' });
    expect(btn.className).not.toMatch(/opacity-0/);
  });

  it('remove button has aria-label "Remove {name} from deck"', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    expect(screen.getByRole('button', { name: 'Remove Sol Ring from deck' })).toBeInTheDocument();
  });

  it('clicking remove button calls onRemove(deckCardId)', async () => {
    const onRemove = vi.fn();
    const cards = [makeDeckCard({ id: 77, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={onRemove} /></StrictMode>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove Sol Ring from deck' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(77);
  });

  it('skips cards whose scryfallId has no lookup result', () => {
    const cards = [
      makeDeckCard({ id: 1, scryfallId: 'known', cardName: 'Sol Ring' }),
      makeDeckCard({ id: 2, scryfallId: 'missing', cardName: 'Ghost Card' }),
    ];
    const lookup = (id: string) => id === 'known' ? makeCard({ name: 'Sol Ring', type_line: 'Artifact' }) : undefined;
    render(
      <StrictMode><DeckGridView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>
    );
    expect(screen.getByRole('button', { name: 'Remove Sol Ring from deck' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Ghost Card from deck' })).toBeNull();
  });
});
