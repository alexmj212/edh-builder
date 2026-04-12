import type { Card } from './scryfall';

export type PartnerType =
  | { kind: 'none' }
  | { kind: 'generic' }
  | { kind: 'named'; partnerName: string }
  | { kind: 'friendsForever' }
  | { kind: 'chooseBackground' };

function keywordsOf(card: Card): string[] {
  return card.keywords;
}

function oracleTextOf(card: Card): string {
  if (typeof card.oracle_text === 'string') return card.oracle_text;
  if (card.card_faces && card.card_faces.length > 0) {
    return card.card_faces.map(f => f.oracle_text ?? '').join('\n');
  }
  return '';
}

function typeLineOf(card: Card): string {
  return card.type_line;
}

export function detectPartnerType(card: Card): PartnerType {
  const keywords = keywordsOf(card).map(k => k.toLowerCase());
  const oracle = oracleTextOf(card);

  if (keywords.includes('friends forever') || /friends forever/i.test(oracle)) {
    return { kind: 'friendsForever' };
  }
  const namedMatch = oracle.match(/Partner with ([^\n(]+)/i);
  if (namedMatch) {
    return { kind: 'named', partnerName: namedMatch[1].trim() };
  }
  if (keywords.includes('choose a background') || /choose a background/i.test(oracle)) {
    return { kind: 'chooseBackground' };
  }
  if (keywords.includes('partner') || /\bpartner\b/i.test(oracle)) {
    return { kind: 'generic' };
  }
  return { kind: 'none' };
}

export function isValidBackground(card: Card): boolean {
  const typeLine = typeLineOf(card);
  return /Legendary/i.test(typeLine) && /Background/i.test(typeLine);
}

export function areCompatiblePartners(primary: Card, secondary: Card): boolean {
  const primaryType = detectPartnerType(primary);
  const secondaryType = detectPartnerType(secondary);
  switch (primaryType.kind) {
    case 'generic':
      return secondaryType.kind === 'generic';
    case 'named':
      return secondary.name === primaryType.partnerName;
    case 'friendsForever':
      return secondaryType.kind === 'friendsForever';
    case 'chooseBackground':
      return isValidBackground(secondary);
    case 'none':
    default:
      return false;
  }
}
