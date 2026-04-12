import { describe, it } from 'vitest';
// NOTE: import path is forward-declared — Wave 1 implements this module.
// This file is intentionally RED/pending. Wave 1 replaces it.todo with real assertions.

describe('partner-detection', () => {
  it.todo('detects generic Partner from keywords[]');
  it.todo('detects Partner with <Name> from oracle_text with correct name capture');
  it.todo('detects Friends Forever from keywords[]');
  it.todo('detects Choose a Background from keywords[]');
  it.todo('returns kind: none for non-partner commanders like Atraxa');
  it.todo('areCompatiblePartners: generic + generic = true');
  it.todo('areCompatiblePartners: generic + friendsForever = false');
  it.todo('areCompatiblePartners: named + matching secondary name = true');
  it.todo('areCompatiblePartners: named + non-matching secondary name = false');
  it.todo('areCompatiblePartners: chooseBackground + Background-type secondary = true');
  it.todo('areCompatiblePartners: chooseBackground + non-Background secondary = false');
});
