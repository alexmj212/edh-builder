// scripts/scryfall-probe.mjs
// One-shot live probe of api.scryfall.com via scryfall-api.
// Verifies D-07 (Card field parity), D-08 (abort wrapper viable),
// D-09 (100ms throttle shared across calls), D-10 (partner query). NOT run in CI.
//
// Identifies as User-Agent: edh-builder/02.3-migration-probe
// (Scryfall politeness — see .planning/research/SCRYFALL_API.md).
//
// NOTE: scryfall-api v4.0.5 exposes no User-Agent configuration hook,
// so library-mediated calls go out with Node's default UA. We issue ONE
// bare fetch() ping here to identify ourselves as the probing tool.
// This gap is documented in 02.3-01-SUMMARY.md under Known Gaps.
//
// Usage: node scripts/scryfall-probe.mjs
import { Cards } from 'scryfall-api';

const UA = 'edh-builder/02.3-migration-probe';
const out = {
  user_agent_ping: null,
  d07_card_fields: null,
  d08_abort_demo: null,
  d09_throttle_spacing: null,
  d10_partner_query: null,
};

// UA identification ping (scryfall-api has no UA hook — use bare fetch).
try {
  const resp = await fetch('https://api.scryfall.com/cards/random', {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  out.user_agent_ping = { ok: resp.ok, status: resp.status, ua_sent: UA };
} catch (e) {
  out.user_agent_ping = { ok: false, error: String(e), ua_sent: UA };
}

// D-07 — Commander search returns cards with all fields we read
const page = Cards.search(
  '(t:legendary t:creature or o:"can be your commander") f:commander',
  { order: 'edhrec' },
);
const first = await page.next();
const sample = first[0];
const requiredFields = [
  'id',
  'oracle_id',
  'name',
  'color_identity',
  'keywords',
  'oracle_text',
  'type_line',
  'image_uris',
  'legalities',
  'layout',
];
out.d07_card_fields = {
  count: page.count,
  hasMore: page.hasMore,
  sampleName: sample?.name,
  presentFields: requiredFields.filter((f) => sample && f in sample),
  missingFields: requiredFields.filter((f) => !sample || !(f in sample)),
};

// D-09 — Fire two sequential Cards.byId calls, measure gap.
// Library throttle should space them >=100ms apart even when called back-to-back.
const t0 = Date.now();
await Cards.byId(sample.id);
const t1 = Date.now();
await Cards.byId(sample.id);
const t2 = Date.now();
out.d09_throttle_spacing = { gap1_ms: t1 - t0, gap2_ms: t2 - t1, expected_min_ms: 100 };

// D-08 — Demonstrate abort wrapper approach (no native signal support).
const slowPromise = Cards.byId(sample.id);
const ac = new AbortController();
ac.abort();
const abortable = (p, signal) => {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
      once: true,
    });
    p.then(resolve, reject);
  });
};
try {
  await abortable(slowPromise, ac.signal);
  out.d08_abort_demo = { rejected: false };
} catch (e) {
  out.d08_abort_demo = { rejected: true, errorName: e?.name ?? String(e) };
}

// D-10 — Partner query (named variant) still returns results
const partnerPage = Cards.search('!"Tymna the Weaver"');
const partnerHits = await partnerPage.next();
out.d10_partner_query = { hitCount: partnerHits.length, firstName: partnerHits[0]?.name };

console.log(JSON.stringify(out, null, 2));
