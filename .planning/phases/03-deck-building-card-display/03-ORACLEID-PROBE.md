# Oracle-ID Prints Lookup — Live Probe Result

**Probed:** 2026-04-14
**Card used:** Sol Ring
**Oracle ID:** 6ad8011d-3471-4369-9d68-b264cc027487

> Note: The plan listed oracle_id `1e14d5f3-d09e-4f2f-ba4d-bf9eab5048e5` which returned errors. The correct Sol Ring oracle_id (verified via `/cards/named?exact=Sol%20Ring`) is `6ad8011d-3471-4369-9d68-b264cc027487`. Both candidates were tested with the correct id.

## Operator Verdict

**Chosen operator for Phase 3:** `oracleid:`

Both `oracleid:` and `oracle_id:` return identical results. Prefer `oracleid:` per scryfall-api example patterns (as shown in the `prints_search_uri` field on every Card object).

## Raw probe output

### Candidate A: q=oracleid:<id>
- total_cards: 127
- first_printing_date: 1993-08-05
- first_set: Limited Edition Alpha

### Candidate B: q=oracle_id:<id>
- total_cards: 127
- first_printing_date: 1993-08-05
- first_set: Limited Edition Alpha

### Fallback: prints_search_uri on card
- prints_search_uri: `https://api.scryfall.com/cards/search?order=released&q=oracleid%3A6ad8011d-3471-4369-9d68-b264cc027487&unique=prints`
- extracted q= param: `oracleid:6ad8011d-3471-4369-9d68-b264cc027487`

The `prints_search_uri` itself uses `oracleid:` — confirming it as the canonical Scryfall operator.

## Contract for Plan 03

The `resolveOriginalReleaseDate(card: Card)` function in `src/store/deck-cards-store.ts` MUST use:

```
oracleid:<card.oracle_id>
```

with `unique: 'prints'`, `order: 'released'`, `dir: 'asc'` parameters. Take `results[0].released_at` and convert to ISO string (`YYYY-MM-DD`).

The `oracle_id` field on every `Card` object (from the scryfall-api library) is the correct identifier to use — NOT the printing-specific `id` (`scryfallId`).
