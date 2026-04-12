import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorIdentityChip } from './ColorIdentityChip';

describe('ColorIdentityChip', () => {
  it('renders placeholder copy when colorIdentity is null', () => {
    render(<ColorIdentityChip colorIdentity={null} />);
    expect(screen.getByText(/Filtered to: Pick a commander first/i)).toBeInTheDocument();
  });

  it('renders single C pip for empty colorless identity', () => {
    render(<ColorIdentityChip colorIdentity={[]} />);
    expect(screen.getByLabelText('Colorless')).toBeInTheDocument();
  });

  it('renders WUG pips for green-white-blue commander', () => {
    render(<ColorIdentityChip colorIdentity={['G', 'W', 'U']} />);
    expect(screen.getByLabelText('White')).toBeInTheDocument();
    expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    expect(screen.getByLabelText('Green')).toBeInTheDocument();
    expect(screen.queryByLabelText('Red')).toBeNull();
    expect(screen.queryByLabelText('Black')).toBeNull();
  });

  it('shows Color identity label when commander selected', () => {
    render(<ColorIdentityChip colorIdentity={['R']} />);
    expect(screen.getByText(/Color identity:/i)).toBeInTheDocument();
  });
});
