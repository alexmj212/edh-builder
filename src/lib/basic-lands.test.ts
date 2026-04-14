import { describe, it, expect } from 'vitest';
import { isBasicLand, BASIC_LAND_NAMES } from './basic-lands';

describe('BASIC_LAND_NAMES', () => {
  it('contains exactly the 12 canonical basic land names', () => {
    expect(BASIC_LAND_NAMES).toEqual([
      'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
      'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
      'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes',
    ]);
  });
});

describe('isBasicLand', () => {
  it.each(BASIC_LAND_NAMES)('returns true for %s', (name) => {
    expect(isBasicLand({ name, type_line: `Basic Land — ${name}` })).toBe(true);
  });

  it('returns true when type_line matches /^Basic Land/ even with an unknown name (alt-art token)', () => {
    expect(isBasicLand({ name: 'Some Custom Plains Token', type_line: 'Basic Land — Plains' })).toBe(true);
  });

  it('returns true for "Basic Snow Land — Snow-Covered Plains"', () => {
    expect(isBasicLand({ name: 'Snow-Covered Plains', type_line: 'Basic Snow Land — Snow-Covered Plains' })).toBe(true);
  });

  it('returns false for Command Tower (non-basic land)', () => {
    expect(isBasicLand({ name: 'Command Tower', type_line: 'Land' })).toBe(false);
  });

  it('returns false for Exotic Orchard (non-basic land)', () => {
    expect(isBasicLand({ name: 'Exotic Orchard', type_line: 'Land' })).toBe(false);
  });

  it('returns false for Dryad Arbor (creature-land — type_line does not start with Basic)', () => {
    expect(isBasicLand({ name: 'Dryad Arbor', type_line: 'Land Creature — Forest Dryad' })).toBe(false);
  });

  it('returns false for Sol Ring (artifact, not a land)', () => {
    expect(isBasicLand({ name: 'Sol Ring', type_line: 'Artifact' })).toBe(false);
  });

  it('returns false for Lightning Bolt (instant)', () => {
    expect(isBasicLand({ name: 'Lightning Bolt', type_line: 'Instant' })).toBe(false);
  });
});
