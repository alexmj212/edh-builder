import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { ViewToggle } from './ViewToggle';

function renderToggle(mode: 'grid' | 'list', onChange = vi.fn()) {
  render(<StrictMode><ViewToggle mode={mode} onChange={onChange} /></StrictMode>);
  return { onChange };
}

describe('ViewToggle', () => {
  it('renders role=group with aria-label="Deck view"', () => {
    renderToggle('list');
    expect(screen.getByRole('group', { name: 'Deck view' })).toBeInTheDocument();
  });

  it('List button has aria-pressed=true when mode is list', () => {
    renderToggle('list');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Grid button has aria-pressed=true when mode is grid', () => {
    renderToggle('grid');
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Grid in list mode calls onChange("grid")', async () => {
    const { onChange } = renderToggle('list');
    await userEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('grid');
  });

  it('clicking List in grid mode calls onChange("list")', async () => {
    const { onChange } = renderToggle('grid');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('list');
  });

  it('active button has bg-accent text-white', () => {
    renderToggle('list');
    const listBtn = screen.getByRole('button', { name: 'List' });
    expect(listBtn.className).toMatch(/bg-accent/);
    expect(listBtn.className).toMatch(/text-white/);
  });

  it('inactive button has bg-surface text-text-secondary', () => {
    renderToggle('list');
    const gridBtn = screen.getByRole('button', { name: 'Grid' });
    expect(gridBtn.className).toMatch(/bg-surface/);
    expect(gridBtn.className).toMatch(/text-text-secondary/);
  });

  it('both buttons have focus:ring-2 focus:ring-accent', () => {
    renderToggle('list');
    expect(screen.getByRole('button', { name: 'List' }).className).toMatch(/focus:ring-2/);
    expect(screen.getByRole('button', { name: 'List' }).className).toMatch(/focus:ring-accent/);
    expect(screen.getByRole('button', { name: 'Grid' }).className).toMatch(/focus:ring-accent/);
  });

  it('Grid button has border-l border-border divider', () => {
    renderToggle('list');
    const gridBtn = screen.getByRole('button', { name: 'Grid' });
    expect(gridBtn.className).toMatch(/border-l/);
    expect(gridBtn.className).toMatch(/border-border/);
  });
});
