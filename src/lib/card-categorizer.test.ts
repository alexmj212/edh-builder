import { describe, it, expect } from 'vitest';
import { categorizeCard, CATEGORY_ORDER, type Category } from './card-categorizer';

describe('CATEGORY_ORDER', () => {
  it('lists 7 categories in fixed display order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'Creatures', 'Planeswalkers', 'Instants', 'Sorceries',
      'Artifacts', 'Enchantments', 'Lands',
    ] satisfies readonly Category[]);
  });
});

describe('categorizeCard precedence', () => {
  it('Lands wins over all other types (pure land)', () => {
    expect(categorizeCard('Basic Land — Forest')).toBe('Lands');
  });

  it('Lands wins even over Creature (creature-land / manland)', () => {
    expect(categorizeCard('Land Creature — Forest Dryad')).toBe('Lands');
  });

  it('Creature wins over Artifact (artifact-creature)', () => {
    expect(categorizeCard('Artifact Creature — Golem')).toBe('Creatures');
  });

  it('Creature wins over Enchantment (enchantment-creature / god)', () => {
    expect(categorizeCard('Enchantment Creature — God')).toBe('Creatures');
  });

  it('Pure creature returns Creatures', () => {
    expect(categorizeCard('Creature — Human Wizard')).toBe('Creatures');
  });

  it('Legendary Creature returns Creatures', () => {
    expect(categorizeCard('Legendary Creature — Human Soldier')).toBe('Creatures');
  });

  it('Planeswalker returns Planeswalkers', () => {
    expect(categorizeCard('Legendary Planeswalker — Jace')).toBe('Planeswalkers');
  });

  it('Instant returns Instants', () => {
    expect(categorizeCard('Instant')).toBe('Instants');
  });

  it('Sorcery returns Sorceries', () => {
    expect(categorizeCard('Sorcery')).toBe('Sorceries');
  });

  it('Tribal Instant returns Instants', () => {
    expect(categorizeCard('Tribal Instant — Elf')).toBe('Instants');
  });

  it('Pure artifact (no creature) returns Artifacts', () => {
    expect(categorizeCard('Artifact — Equipment')).toBe('Artifacts');
  });

  it('Pure enchantment (no creature) returns Enchantments', () => {
    expect(categorizeCard('Enchantment — Aura')).toBe('Enchantments');
  });

  it('Case-insensitive: "LAND" matches Lands', () => {
    expect(categorizeCard('BASIC LAND — FOREST')).toBe('Lands');
  });

  it('Unknown type falls back to Creatures', () => {
    expect(categorizeCard('Scheme')).toBe('Creatures');
  });
});
