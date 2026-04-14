import type { Card } from './scryfall';
export function isBasicLand(_card: Pick<Card, 'name' | 'type_line'>): boolean {
  // Implementation lands in 03-02-PLAN.md.
  return false;
}
