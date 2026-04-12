import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CommanderSearch } from './CommanderSearch';
import * as scryfallClient from '../lib/scryfall-client';

function fakeCard(overrides: { id?: string; name?: string; type_line?: string; keywords?: string[]; oracle_text?: string } = {}): any {
  return { id: 'c-1', name: 'Fake Commander', type_line: 'Legendary Creature — Human', image_uris: { art_crop: 'x' }, ...overrides };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('CommanderSearch primary mode', () => {
  it('shows EDHREC default list on empty input', async () => {
    vi.spyOn(scryfallClient, 'searchCommanders').mockResolvedValue({ object: 'list', has_more: false, data: [fakeCard({ name: 'Atraxa, Praetors Voice' })] } as any);
    render(<CommanderSearch mode="primary" onSelect={() => {}} />);
    // Advance debounce timer and flush microtasks (resolved promise)
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(screen.getByText('Atraxa, Praetors Voice')).toBeInTheDocument();
  });

  it('debounces 400ms before firing searchCommanders', async () => {
    const spy = vi.spyOn(scryfallClient, 'searchCommanders').mockResolvedValue({ object: 'list', has_more: false, data: [] } as any);
    render(<CommanderSearch mode="primary" onSelect={() => {}} />);
    // Flush initial empty-query effect
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    spy.mockClear();
    const input = screen.getByRole('textbox');
    act(() => {
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'at' } });
    });
    // Only 200ms elapsed — not yet debounced
    act(() => { vi.advanceTimersByTime(200); });
    expect(spy).not.toHaveBeenCalled();
    // Advance past 400ms debounce
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(spy).toHaveBeenCalledWith('at', expect.anything());
  });

  it('calls onSelect with the clicked card', async () => {
    const card = fakeCard({ id: 'c-42', name: 'Target' });
    vi.spyOn(scryfallClient, 'searchCommanders').mockResolvedValue({ object: 'list', has_more: false, data: [card] } as any);
    const onSelect = vi.fn();
    render(<CommanderSearch mode="primary" onSelect={onSelect} />);
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(screen.getByText('Target')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Target'));
    expect(onSelect).toHaveBeenCalledWith(card);
  });

  it('shows zero-results copy when debounced query returns no cards', async () => {
    vi.spyOn(scryfallClient, 'searchCommanders').mockResolvedValue({ object: 'list', has_more: false, data: [] } as any);
    render(<CommanderSearch mode="primary" onSelect={() => {}} />);
    const input = screen.getByRole('textbox');
    act(() => {
      fireEvent.change(input, { target: { value: 'zzzz' } });
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(screen.getByText(/No commanders match your search/i)).toBeInTheDocument();
  });
});

describe('CommanderSearch partner mode', () => {
  it('drops selections that fail areCompatiblePartners', async () => {
    const primary = fakeCard({ id: 'p-1', name: 'Primary', keywords: ['Partner'], type_line: 'Legendary Creature' });
    const candidate = fakeCard({ id: 'b-1', name: 'Not a Partner', keywords: [], type_line: 'Legendary Creature' });
    vi.spyOn(scryfallClient, 'searchPartnersFor').mockResolvedValue({ object: 'list', has_more: false, data: [candidate] } as any);
    const onSelect = vi.fn();
    render(<CommanderSearch mode="partner" primaryForPartner={primary} onSelect={onSelect} />);
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(screen.getByText('Not a Partner')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Not a Partner'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('passes primaryForPartner to searchPartnersFor', async () => {
    const primary = fakeCard({ id: 'p-1', name: 'Primary', keywords: ['Partner'] });
    const spy = vi.spyOn(scryfallClient, 'searchPartnersFor').mockResolvedValue({ object: 'list', has_more: false, data: [] } as any);
    render(<CommanderSearch mode="partner" primaryForPartner={primary} onSelect={() => {}} />);
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(spy).toHaveBeenCalledWith(primary, '', expect.anything());
  });
});
