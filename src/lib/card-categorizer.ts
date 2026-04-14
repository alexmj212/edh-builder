export type Category = 'Creatures' | 'Planeswalkers' | 'Instants' | 'Sorceries' | 'Artifacts' | 'Enchantments' | 'Lands';

export const CATEGORY_ORDER: readonly Category[] = [
  'Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands',
];

export function categorizeCard(typeLine: string): Category {
  const t = typeLine.toLowerCase();
  if (/\bland\b/.test(t))         return 'Lands';
  if (/\bcreature\b/.test(t))     return 'Creatures';
  if (/\bplaneswalker\b/.test(t)) return 'Planeswalkers';
  if (/\binstant\b/.test(t))      return 'Instants';
  if (/\bsorcery\b/.test(t))      return 'Sorceries';
  if (/\bartifact\b/.test(t))     return 'Artifacts';
  if (/\benchantment\b/.test(t))  return 'Enchantments';
  return 'Creatures';
}
