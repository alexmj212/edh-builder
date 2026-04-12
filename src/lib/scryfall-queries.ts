// src/lib/scryfall-queries.ts
// Pure query-string builders for the Scryfall /cards/search endpoint.
// Zero dependency on 'scryfall-api' — these compose strings the wrapper passes to Cards.search.
import type { Card } from './scryfall';
import { detectPartnerType } from './partner-detection';

export function encodeFragment(v: string): string {
  const cleaned = v.replace(/"/g, '').trim();
  if (!cleaned) return '';
  return /[\s"()]/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

export function buildSearchQuery(params: {
  name?: string;
  type?: string;
  oracleText?: string;
  colorIdentity: string[];
}): string {
  const parts: string[] = [];
  if (params.name) {
    const f = encodeFragment(params.name);
    if (f) parts.push(`name:${f}`);
  }
  if (params.type) {
    const f = encodeFragment(params.type);
    if (f) parts.push(`t:${f}`);
  }
  if (params.oracleText) {
    const f = encodeFragment(params.oracleText);
    if (f) parts.push(`o:${f}`);
  }
  const identity = params.colorIdentity.join('').toLowerCase() || 'c';
  parts.push(`id<=${identity}`);
  parts.push('f:commander');
  return parts.join(' ');
}

export function buildCommanderSearchQuery(params: { nameFragment?: string }): string {
  const parts: string[] = [
    '(t:legendary t:creature or o:"can be your commander")',
    'f:commander',
  ];
  if (params.nameFragment) {
    const f = encodeFragment(params.nameFragment);
    if (f) parts.push(`name:${f}`);
  }
  return parts.join(' ');
}

export function buildPartnerQuery(primary: Card, fragment: string): string | null {
  const kind = detectPartnerType(primary);
  let qBase: string;
  switch (kind.kind) {
    case 'generic':
      qBase = '(o:"Partner") -o:"Partner with" f:commander';
      break;
    case 'friendsForever':
      qBase = 'o:"Friends forever" f:commander';
      break;
    case 'chooseBackground':
      qBase = 't:Background f:commander';
      break;
    case 'named':
      qBase = `!"${kind.partnerName.replace(/"/g, '')}"`;
      break;
    default:
      return null;
  }
  const frag = fragment.trim();
  if (!frag) return qBase;
  const f = encodeFragment(frag);
  return f ? `${qBase} name:${f}` : qBase;
}
