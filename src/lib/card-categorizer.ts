export type Category = 'Creatures' | 'Planeswalkers' | 'Instants' | 'Sorceries' | 'Artifacts' | 'Enchantments' | 'Lands';
export const CATEGORY_ORDER: readonly Category[] = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands'];
export function categorizeCard(_typeLine: string): Category {
  // Implementation lands in 03-02-PLAN.md.
  return 'Creatures';
}
