import { describe, it } from 'vitest';
describe('categorizeCard', () => {
  it.todo('returns Lands for pure land (Forest)');
  it.todo('returns Lands for creature-land (Land Creature — Forest Dryad) — Land wins');
  it.todo('returns Creatures for creature (Creature — Human Wizard)');
  it.todo('returns Creatures for artifact-creature (Artifact Creature — Golem) — Creature beats Artifact');
  it.todo('returns Creatures for enchantment-creature (Enchantment Creature — God) — Creature beats Enchantment');
  it.todo('returns Planeswalkers for planeswalker (Legendary Planeswalker — Jace)');
  it.todo('returns Instants for instant');
  it.todo('returns Sorceries for sorcery');
  it.todo('returns Artifacts for pure artifact (Artifact — Equipment)');
  it.todo('returns Enchantments for pure enchantment (Enchantment — Aura)');
});
describe('CATEGORY_ORDER', () => {
  it.todo('lists 7 categories in the fixed display order: Creatures, Planeswalkers, Instants, Sorceries, Artifacts, Enchantments, Lands');
});
