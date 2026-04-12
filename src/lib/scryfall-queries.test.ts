import { describe, it, expect } from 'vitest';
import {
  encodeFragment,
  buildSearchQuery,
  buildCommanderSearchQuery,
  buildPartnerQuery,
} from './scryfall-queries';
import type { Card } from './scryfall';

function fakeCard(overrides: {
  id?: string;
  name?: string;
  oracle_id?: string;
  keywords?: string[];
  oracle_text?: string;
  type_line?: string;
} = {}): Card {
  return {
    id: 'c-1',
    oracle_id: 'o-1',
    name: 'Fake Commander',
    keywords: [],
    oracle_text: '',
    type_line: 'Legendary Creature — Human',
    ...overrides,
  } as unknown as Card;
}

describe('encodeFragment', () => {
  it('returns bare fragment when no whitespace/quotes/parens', () => {
    expect(encodeFragment('bolt')).toBe('bolt');
  });

  it('wraps multi-word fragment in quotes', () => {
    expect(encodeFragment('deals damage')).toBe('"deals damage"');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(encodeFragment('  ')).toBe('');
  });

  it('strips inner quotes then wraps', () => {
    expect(encodeFragment('has "quotes"')).toBe('"has quotes"');
  });
});

describe('buildSearchQuery', () => {
  it('buildSearchQuery composes name:, t:, o:, id<=, f:commander', () => {
    const result = buildSearchQuery({
      name: 'bolt',
      type: 'instant',
      oracleText: 'deals damage',
      colorIdentity: ['W', 'U'],
    });
    expect(result).toContain('name:bolt');
    expect(result).toContain('t:instant');
    expect(result).toContain('o:"deals damage"');
    expect(result).toContain('id<=wu');
    expect(result).toContain('f:commander');
    // Regression: Scryfall has NO `n:` shorthand — silently drops the filter.
    // Must use `name:`. See https://scryfall.com/docs/syntax#name
    expect(result).not.toMatch(/(^|\s)n:/);
  });

  it('buildSearchQuery uses "c" for empty colorIdentity', () => {
    const result = buildSearchQuery({ colorIdentity: [] });
    expect(result).toContain('id<=c');
    expect(result).toContain('f:commander');
  });

  it('buildSearchQuery omits name/type/oracleText when not provided', () => {
    const result = buildSearchQuery({ colorIdentity: ['R'] });
    expect(result).not.toContain('name:');
    expect(result).not.toContain('t:');
    expect(result).not.toContain('o:');
    expect(result).toContain('id<=r');
  });
});

describe('buildCommanderSearchQuery', () => {
  it('emits base prefix + f:commander + name: when nameFragment supplied', () => {
    const result = buildCommanderSearchQuery({ nameFragment: 'atraxa' });
    expect(result).toBe(
      '(t:legendary t:creature or o:"can be your commander") f:commander name:atraxa',
    );
  });

  it('emits only base prefix + f:commander when no nameFragment', () => {
    const result = buildCommanderSearchQuery({});
    expect(result).toBe('(t:legendary t:creature or o:"can be your commander") f:commander');
  });

  it('wraps multi-word fragment in quotes', () => {
    const result = buildCommanderSearchQuery({ nameFragment: 'atraxa voice' });
    expect(result).toContain('name:"atraxa voice"');
  });
});

describe('buildPartnerQuery', () => {
  it('buildPartnerQuery emits (o:"Partner") -o:"Partner with" f:commander for generic', () => {
    const primary = fakeCard({ keywords: ['Partner'], oracle_text: 'Partner' });
    expect(buildPartnerQuery(primary, '')).toBe('(o:"Partner") -o:"Partner with" f:commander');
  });

  it('emits o:"Friends forever" f:commander for friendsForever', () => {
    const primary = fakeCard({ keywords: ['Friends forever'], oracle_text: 'Friends forever' });
    expect(buildPartnerQuery(primary, '')).toBe('o:"Friends forever" f:commander');
  });

  it('emits t:Background f:commander for chooseBackground', () => {
    const primary = fakeCard({
      keywords: ['Choose a Background'],
      oracle_text: 'Choose a Background',
    });
    expect(buildPartnerQuery(primary, '')).toBe('t:Background f:commander');
  });

  it('buildPartnerQuery emits !"Name" for named variant', () => {
    const primary = fakeCard({ oracle_text: 'Partner with Virtus the Veiled' });
    expect(buildPartnerQuery(primary, '')).toBe('!"Virtus the Veiled"');
  });

  it('buildPartnerQuery returns null for \'none\' kind', () => {
    const primary = fakeCard({ keywords: [], oracle_text: '' });
    expect(buildPartnerQuery(primary, '')).toBeNull();
  });

  it('appends name:fragment when fragment is provided for generic', () => {
    const primary = fakeCard({ keywords: ['Partner'], oracle_text: 'Partner' });
    const q = buildPartnerQuery(primary, 'atra');
    expect(q).toBe('(o:"Partner") -o:"Partner with" f:commander name:atra');
  });

  it('appends quoted name:"frag with space" for multi-word fragment', () => {
    const primary = fakeCard({ keywords: ['Partner'], oracle_text: 'Partner' });
    const q = buildPartnerQuery(primary, 'atra voice');
    expect(q).toBe('(o:"Partner") -o:"Partner with" f:commander name:"atra voice"');
  });

  it('strips quotes from named partner name', () => {
    const primary = fakeCard({ oracle_text: 'Partner with "Tymna the Weaver"' });
    const q = buildPartnerQuery(primary, '');
    // Inner quotes stripped
    expect(q).toBe('!"Tymna the Weaver"');
  });
});
