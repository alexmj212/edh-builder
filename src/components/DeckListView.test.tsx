import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { DeckListView } from './DeckListView';
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

describe('DeckListView', () => {
  it('renders one section per non-empty category in CATEGORY_ORDER', () => {
    const cards = [
      makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Llanowar Elves' }),
      makeDeckCard({ id: 2, scryfallId: 'b', cardName: 'Lightning Bolt' }),
      makeDeckCard({ id: 3, scryfallId: 'c', cardName: 'Forest' }),
    ];
    const lookup = (id: string) => ({
      a: makeCard({ name: 'Llanowar Elves', type_line: 'Creature — Elf Druid' }),
      b: makeCard({ name: 'Lightning Bolt', type_line: 'Instant' }),
      c: makeCard({ name: 'Forest', type_line: 'Basic Land — Forest' }),
    } as Record<string, Card>)[id];
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    const sections = screen.getAllByRole('region');
    expect(sections).toHaveLength(3);
    // Order: Creatures, Instants, Lands
    expect(sections[0]).toHaveAccessibleName(/Creatures/);
    expect(sections[1]).toHaveAccessibleName(/Instants/);
    expect(sections[2]).toHaveAccessibleName(/Lands/);
  });

  it('omits empty categories entirely', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Lightning Bolt' })];
    const lookup = (_id: string) => makeCard({ name: 'Lightning Bolt', type_line: 'Instant' });
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    expect(screen.queryByText(/Creatures/)).toBeNull();
    expect(screen.queryByText(/Planeswalkers/)).toBeNull();
    expect(screen.queryByText(/Lands/)).toBeNull();
    expect(screen.getByText('Instants')).toBeInTheDocument();
  });

  it('shows integer count in category header', () => {
    const cards = [
      makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Forest' }),
      makeDeckCard({ id: 2, scryfallId: 'b', cardName: 'Plains' }),
    ];
    const lookup = (id: string) => makeCard({ name: id === 'a' ? 'Forest' : 'Plains', type_line: 'Basic Land' });
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    const landsSection = screen.getByRole('region', { name: /Lands/ });
    expect(within(landsSection).getByText('2')).toBeInTheDocument();
  });

  it('renders 32x32 thumbnail with loading="lazy"', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Forest' })];
    const lookup = (_id: string) => makeCard({ name: 'Forest', type_line: 'Basic Land — Forest' });
    const { container } = render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    const img = container.querySelector('img[loading="lazy"]');
    expect(img).not.toBeNull();
    expect(img?.className).toMatch(/w-8/);
    expect(img?.className).toMatch(/h-8/);
  });

  it('remove button has aria-label "Remove {name} from deck"', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    expect(screen.getByRole('button', { name: 'Remove Sol Ring from deck' })).toBeInTheDocument();
  });

  it('remove button is focusable at all times (opacity-0 default, opacity-100 on focus)', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    const btn = screen.getByRole('button', { name: 'Remove Sol Ring from deck' });
    expect(btn.className).toMatch(/opacity-0/);
    expect(btn.className).toMatch(/focus:opacity-100/);
    expect(btn.className).toMatch(/group-hover:opacity-100/);
  });

  it('calls onRemove with deckCardId when remove clicked', async () => {
    const onRemove = vi.fn();
    const cards = [makeDeckCard({ id: 42, scryfallId: 'a', cardName: 'Sol Ring' })];
    const lookup = (_id: string) => makeCard({ name: 'Sol Ring', type_line: 'Artifact' });
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={onRemove} /></StrictMode>);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Sol Ring from deck' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('category headers are sticky (sticky top-0)', () => {
    const cards = [makeDeckCard({ id: 1, scryfallId: 'a', cardName: 'Forest' })];
    const lookup = (_id: string) => makeCard({ name: 'Forest', type_line: 'Basic Land' });
    const { container } = render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    const header = container.querySelector('section > div');
    expect(header?.className).toMatch(/sticky/);
    expect(header?.className).toMatch(/top-0/);
  });

  it('skips rows whose scryfallId has no lookup result (defensive)', () => {
    const cards = [
      makeDeckCard({ id: 1, scryfallId: 'known', cardName: 'Sol Ring' }),
      makeDeckCard({ id: 2, scryfallId: 'missing', cardName: 'Ghost Card' }),
    ];
    const lookup = (id: string) => id === 'known' ? makeCard({ name: 'Sol Ring', type_line: 'Artifact' }) : undefined;
    render(<StrictMode><DeckListView cards={cards} cardLookup={lookup} onRemove={vi.fn()} /></StrictMode>);
    expect(screen.getByText('Sol Ring')).toBeInTheDocument();
    expect(screen.queryByText('Ghost Card')).toBeNull();
  });
});
