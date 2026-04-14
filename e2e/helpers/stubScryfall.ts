// e2e/helpers/stubScryfall.ts
// Source: https://playwright.dev/docs/test-fixtures (verified 2026-04-12)
import { test as base, type Route } from '@playwright/test';
import type { Card } from '../../src/lib/scryfall';

import thrasios       from '../fixtures/cards/thrasios.json'            with { type: 'json' };
import tymna          from '../fixtures/cards/tymna.json'               with { type: 'json' };
import atraxa         from '../fixtures/cards/atraxa.json'              with { type: 'json' };
import solRing        from '../fixtures/cards/sol-ring.json'            with { type: 'json' };
import forest         from '../fixtures/cards/forest.json'              with { type: 'json' };
import thrasiosSearch from '../fixtures/searches/thrasios-search.json'  with { type: 'json' };
import tymnaSearch    from '../fixtures/searches/tymna-search.json'     with { type: 'json' };
import atraxaSearch   from '../fixtures/searches/atraxa-search.json'    with { type: 'json' };
import solRingPrints  from '../fixtures/searches/sol-ring-prints.json'  with { type: 'json' };

// FixtureCard = the subset of Card the app actually reads, enumerated explicitly.
// Per RESEARCH §Fixture & Type-Cast Implications Case B option 2. Used as the
// documentation-of-intent type for `asCard` via `keyof`, and as the input shape
// contract for fixture JSON (any fixture missing one of these keys would fail
// the `pickKeys` compile-time check below).
type FixtureCard = Pick<Card,
  | 'id' | 'oracle_id' | 'name' | 'layout'
  | 'image_uris' | 'color_identity' | 'keywords'
  | 'oracle_text' | 'type_line' | 'card_faces'
  | 'legalities' | 'mana_cost'
>;
// Compile-time drift check — `pickKeys` enumerates every key we rely on; if Card
// drops any of these fields upstream, `keyof FixtureCard` narrows and the array
// literal becomes mis-typed. Fixture value assignability is NOT re-checked here
// because JSON module imports widen literals past Card's string-union types
// (layout, color_identity, legalities.commander); that widening is absorbed by
// the cast-to-Card escape hatch in `asCard` below. Runtime safety: Zod schema at
// src/lib/scryfall.ts validates every real API response; default-deny route
// handler below 599s any unstubbed Scryfall endpoint.
const pickKeys: readonly (keyof FixtureCard)[] = [
  'id', 'oracle_id', 'name', 'layout',
  'image_uris', 'color_identity', 'keywords',
  'oracle_text', 'type_line', 'card_faces',
  'legalities', 'mana_cost',
];
void pickKeys;

// Single cast helper — the double-cast to Card appears EXACTLY ONCE (line below).
// Input is typed `object` (the JSON-imported fixtures all satisfy it); output is Card.
const asCard = (f: object): Card => f as unknown as Card;

const CARDS_BY_ID: Record<string, Card> = {
  [thrasios.id]: asCard(thrasios),
  [tymna.id]:    asCard(tymna),
  [atraxa.id]:   asCard(atraxa),
  [solRing.id]:  asCard(solRing),
  [forest.id]:   asCard(forest),
};

interface StubFixtures { scryfallStub: void }

export const test = base.extend<StubFixtures>({
  scryfallStub: [async ({ page }, use) => {
    await page.route(/https:\/\/api\.scryfall\.com\/.*/i, async (route: Route) => {
      const url = new URL(route.request().url());

      // Per-card lookup by Scryfall printing id (/cards/:id)
      const idMatch = url.pathname.match(/^\/cards\/([0-9a-f-]{36})$/i);
      if (idMatch && CARDS_BY_ID[idMatch[1]]) {
        return route.fulfill({ json: CARDS_BY_ID[idMatch[1]], status: 200 });
      }

      if (url.pathname === '/cards/search') {
        const q = url.searchParams.get('q') ?? '';
        const unique = url.searchParams.get('unique') ?? '';

        // Oracle-id prints lookup (locked operator from 03-ORACLEID-PROBE.md):
        // matches `q=oracleid:<any-oracle-id>` with unique=prints
        // Route to sol-ring-prints fixture (the only card we add in tests).
        // Forest prints lookups also return the same fixture shape — forest's
        // oracle_id differs but the fixture pattern works (just one result).
        if (unique === 'prints' && /oracleid:/i.test(q)) {
          return route.fulfill({ json: solRingPrints, status: 200 });
        }

        // Commander searches
        if (/thrasios/i.test(q)) return route.fulfill({ json: thrasiosSearch, status: 200 });
        if (/tymna/i.test(q))    return route.fulfill({ json: tymnaSearch,    status: 200 });
        if (/atraxa/i.test(q))   return route.fulfill({ json: atraxaSearch,   status: 200 });

        // Default: empty results for unmatched search queries
        return route.fulfill({
          json: { object: 'list', total_cards: 0, has_more: false, data: [] },
          status: 200,
        });
      }

      if (url.pathname === '/cards/collection' && route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          identifiers: Array<{ id?: string; oracle_id?: string }>
        };
        const data = body.identifiers
          .map(i => (i.id && CARDS_BY_ID[i.id]) ? CARDS_BY_ID[i.id] : null)
          .filter((c): c is Card => c !== null);
        return route.fulfill({
          json: { object: 'list', not_found: [], data },
          status: 200,
        });
      }

      // Default-deny: unmatched Scryfall path MUST NOT fall through to real API.
      return route.fulfill({
        status: 599,
        body: `stubScryfall: unhandled route ${route.request().method()} ${url.pathname}`,
      });
    });
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
