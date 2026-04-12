import { describe, it, expect } from 'vitest';
import type { ScryfallCard } from '@scryfall/api-types';
import {
  detectPartnerType,
  areCompatiblePartners,
} from './partner-detection';

function card(overrides: Partial<{
  name: string;
  oracle_text: string;
  type_line: string;
  keywords: string[];
}>): ScryfallCard.Any {
  return { ...overrides } as unknown as ScryfallCard.Any;
}

describe('partner-detection', () => {
  it('detects generic Partner from keywords[]', () => {
    const result = detectPartnerType(card({ keywords: ['Partner'] }));
    expect(result).toEqual({ kind: 'generic' });
  });

  it('detects Partner with <Name> from oracle_text with correct name capture', () => {
    const result = detectPartnerType(card({ oracle_text: 'Partner with Virtus the Veiled (reminder)' }));
    expect(result).toEqual({ kind: 'named', partnerName: 'Virtus the Veiled' });
  });

  it('detects Friends Forever from keywords[]', () => {
    const result = detectPartnerType(card({ keywords: ['Friends Forever'] }));
    expect(result).toEqual({ kind: 'friendsForever' });
  });

  it('detects Choose a Background from keywords[]', () => {
    const result = detectPartnerType(card({ keywords: ['Choose a Background'] }));
    expect(result).toEqual({ kind: 'chooseBackground' });
  });

  it('returns kind: none for non-partner commanders like Atraxa', () => {
    const result = detectPartnerType(card({ keywords: ['Flying', 'Vigilance'], oracle_text: 'When Atraxa enters...' }));
    expect(result).toEqual({ kind: 'none' });
  });

  it('detects generic Partner from oracle_text only (no keywords)', () => {
    const result = detectPartnerType(card({ oracle_text: 'Partner\nFlying' }));
    expect(result).toEqual({ kind: 'generic' });
  });

  it('areCompatiblePartners: generic + generic = true', () => {
    const primary = card({ keywords: ['Partner'] });
    const secondary = card({ keywords: ['Partner'] });
    expect(areCompatiblePartners(primary, secondary)).toBe(true);
  });

  it('areCompatiblePartners: generic + friendsForever = false', () => {
    const primary = card({ keywords: ['Partner'] });
    const secondary = card({ keywords: ['Friends Forever'] });
    expect(areCompatiblePartners(primary, secondary)).toBe(false);
  });

  it('areCompatiblePartners: named + matching secondary name = true', () => {
    const primary = card({ oracle_text: 'Partner with Sidar Kondo of Jamuraa' });
    const secondary = card({ name: 'Sidar Kondo of Jamuraa' });
    expect(areCompatiblePartners(primary, secondary)).toBe(true);
  });

  it('areCompatiblePartners: named + non-matching secondary name = false', () => {
    const primary = card({ oracle_text: 'Partner with Sidar Kondo of Jamuraa' });
    const secondary = card({ name: 'Tana, the Bloodsower' });
    expect(areCompatiblePartners(primary, secondary)).toBe(false);
  });

  it('areCompatiblePartners: chooseBackground + Background-type secondary = true', () => {
    const primary = card({ keywords: ['Choose a Background'] });
    const secondary = card({ type_line: 'Legendary Enchantment — Background' });
    expect(areCompatiblePartners(primary, secondary)).toBe(true);
  });

  it('areCompatiblePartners: chooseBackground + non-Background secondary = false', () => {
    const primary = card({ keywords: ['Choose a Background'] });
    const secondary = card({ type_line: 'Legendary Creature — Human Wizard' });
    expect(areCompatiblePartners(primary, secondary)).toBe(false);
  });
});
