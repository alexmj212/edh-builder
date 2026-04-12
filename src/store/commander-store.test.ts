import { describe, it } from 'vitest';
// NOTE: import path is forward-declared — Wave 1 implements this module.
// This file is intentionally RED/pending. Wave 1 replaces it.todo with real assertions.

describe('commander-store', () => {
  it.todo('setCommander writes commanderId, commanderName, colorIdentity to db.decks row');
  it.todo('setCommander updates primaryCommander in store state');
  it.todo('setCommander clears partnerCommander when new primary is not partner-eligible');
  it.todo('clearCommander resets both primary and partner and nulls deck row fields');
  it.todo('setPartner writes nothing to db.decks (partner is UI-only in Phase 2) but updates store state');
  it.todo('clearPartner resets partnerCommander to null');
});
