import type { Card } from './scryfall';

export const BASIC_LAND_NAMES = [
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes',
] as const;

export function isBasicLand(card: Pick<Card, 'name' | 'type_line'>): boolean {
  if ((BASIC_LAND_NAMES as readonly string[]).includes(card.name)) return true;
  return /^Basic\s+(Snow\s+)?Land\b/i.test(card.type_line);
}
