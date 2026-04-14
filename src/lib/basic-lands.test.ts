import { describe, it } from 'vitest';
describe('isBasicLand', () => {
  it.todo('returns true for each of the 12 basic land names (Plains, Island, Swamp, Mountain, Forest, Wastes + Snow-Covered variants)');
  it.todo('returns true when type_line matches /^Basic\\s+(Snow\\s+)?Land\\b/i');
  it.todo('returns false for non-basic lands (Command Tower, Exotic Orchard)');
  it.todo('returns false for creature-lands (Dryad Arbor)');
  it.todo('returns false for non-land cards (Sol Ring, Lightning Bolt)');
});
