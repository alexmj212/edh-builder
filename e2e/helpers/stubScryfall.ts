// e2e/helpers/stubScryfall.ts
// Source: https://playwright.dev/docs/test-fixtures (verified 2026-04-12)
import { test as base, type Route } from '@playwright/test';
import type { ScryfallCard } from '@scryfall/api-types';

import thrasios       from '../fixtures/cards/thrasios.json'            with { type: 'json' };
import tymna          from '../fixtures/cards/tymna.json'               with { type: 'json' };
import atraxa         from '../fixtures/cards/atraxa.json'              with { type: 'json' };
import thrasiosSearch from '../fixtures/searches/thrasios-search.json'  with { type: 'json' };
import tymnaSearch    from '../fixtures/searches/tymna-search.json'     with { type: 'json' };
import atraxaSearch   from '../fixtures/searches/atraxa-search.json'    with { type: 'json' };

// Compile-time shape checks (D-08) — tsc errors if fixture drifts from required fields.
//
// NOTE: TypeScript widens JSON module imports (string literals become `string`), so
// `satisfies ScryfallCard.Any` cannot work directly against the discriminated union —
// ScryfallCard.Any narrows on `layout` which must be a specific literal.
// We check against a minimal structural type instead; the intent is identical to
// `satisfies ScryfallCard.Any` — required fields must be present and typed correctly.
interface FixtureCardShape {
  object: string; id: string; oracle_id: string; name: string;
  layout: string; image_uris: { normal: string; art_crop: string };
  color_identity: string[]; legalities: { commander: string };
}
interface FixtureListShape { object: string; total_cards: number; has_more: boolean; data: FixtureCardShape[] }
const _thrasios   = thrasios       satisfies FixtureCardShape; // satisfies ScryfallCard.Any (shape-checked above)
const _tymna      = tymna          satisfies FixtureCardShape; // satisfies ScryfallCard.Any (shape-checked above)
const _atraxa     = atraxa         satisfies FixtureCardShape; // satisfies ScryfallCard.Any (shape-checked above)
const _thrasiosLs = thrasiosSearch satisfies FixtureListShape; // satisfies ScryfallList.Cards (shape-checked above)
const _tymnaLs    = tymnaSearch    satisfies FixtureListShape; // satisfies ScryfallList.Cards (shape-checked above)
const _atraxaLs   = atraxaSearch   satisfies FixtureListShape; // satisfies ScryfallList.Cards (shape-checked above)
void _thrasios; void _tymna; void _atraxa; void _thrasiosLs; void _tymnaLs; void _atraxaLs;

const CARDS_BY_ID: Record<string, ScryfallCard.Any> = {
  [thrasios.id]: thrasios as unknown as ScryfallCard.Any,
  [tymna.id]:    tymna    as unknown as ScryfallCard.Any,
  [atraxa.id]:   atraxa   as unknown as ScryfallCard.Any,
};

interface StubFixtures { scryfallStub: void }

export const test = base.extend<StubFixtures>({
  scryfallStub: [async ({ page }, use) => {
    await page.route(/https:\/\/api\.scryfall\.com\/.*/i, async (route: Route) => {
      const url = new URL(route.request().url());

      const idMatch = url.pathname.match(/^\/cards\/([0-9a-f-]{36})$/i);
      if (idMatch && CARDS_BY_ID[idMatch[1]]) {
        return route.fulfill({ json: CARDS_BY_ID[idMatch[1]], status: 200 });
      }

      if (url.pathname === '/cards/search') {
        const q = url.searchParams.get('q') ?? '';
        if (/thrasios/i.test(q)) return route.fulfill({ json: thrasiosSearch, status: 200 });
        if (/tymna/i.test(q))    return route.fulfill({ json: tymnaSearch,    status: 200 });
        if (/atraxa/i.test(q))   return route.fulfill({ json: atraxaSearch,   status: 200 });
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
          .filter((c): c is ScryfallCard.Any => c !== null);
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
