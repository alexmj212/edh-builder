# Frontend Stack: EDH Builder

**Project:** EDH Commander Deck Builder (browser SPA, no backend)
**Researched:** 2026-04-11
**Overall confidence:** HIGH (all major decisions verified against current docs and npm registry)

---

## 1. Framework: React 19

**Recommendation: React with TypeScript**

**Rationale:**
React 19.2.5 is the current stable release. With 44.7% developer usage (Stack Overflow 2025 survey) and 78%+ adoption among frontend developers, its ecosystem advantage over Vue and Svelte is still significant for a project like this — not because the alternatives are bad, but because the marginal costs matter:

- **Component libraries:** shadcn/ui, Radix UI, Headless UI, and dozens of accessible card/grid components are React-first or React-only. Svelte's ecosystem has fewer production-ready UI primitives.
- **Scryfall integration:** The `@scryfall/api-types` package (officially maintained by the Scryfall GitHub org) is TypeScript-first and works with any framework, but most community examples and hooks are written for React.
- **Image lazy-loading:** `react-lazy-load-image-component` and React's `Suspense`-based patterns are well-documented for card grids specifically.
- **State management:** Zustand (see below) is React-specific and an excellent fit for deck state.

Vue 3 is a perfectly valid alternative — its Composition API is ergonomic and its reactivity model handles search/filter state cleanly. However, the tooling advantage React has for card-image-heavy UIs (virtual list libraries, image component ecosystems) tips the balance. Svelte's smaller ecosystem and lower adoption make it harder to justify for a project that will benefit from established patterns.

**Verdict:** React 19. Not because the others are bad — because React's ecosystem depth directly reduces implementation work for this project's specific UI shape.

**Versions:**
- `react`: 19.2.5
- `react-dom`: 19.2.5

---

## 2. Build Tool: Vite 8

**Recommendation: Vite 8 with the `@tailwindcss/vite` plugin**

Vite is the unambiguous choice in 2026. Create React App is deprecated. Webpack is enterprise-legacy. Vite 8 (current stable: 8.0.8) now ships with Rolldown (Rust-based bundler) as the production bundler, which reduces large build times dramatically. For a local SPA that never exceeds a few thousand source lines, the build speed is irrelevant — what matters is:

- Sub-300ms dev server cold start
- Near-instant HMR on component saves
- First-party `@tailwindcss/vite` plugin with zero extra PostCSS config
- First-party `@vitejs/plugin-react` for React Fast Refresh
- Zero config TypeScript — Vite handles `.tsx` files natively

**No alternatives worth considering here.** Turbopack is Next.js-only. esbuild standalone lacks a dev server. Bun's bundler is maturing but Vite's ecosystem is larger.

**Configuration sketch:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Versions:**
- `vite`: 8.0.8
- `@vitejs/plugin-react`: latest (follows Vite)
- `@tailwindcss/vite`: bundled with Tailwind v4

---

## 3. Styling: Tailwind CSS v4

**Recommendation: Tailwind CSS v4.2 (utility-first, dark mode via `class` strategy)**

Tailwind v4.2.2 (released February 2026) is the current stable version. The v4 rewrite changes configuration from `tailwind.config.js` to a CSS `@theme` block — no JS config file is needed. Key benefits for this project:

**Why Tailwind for an EDH app specifically:**
- **Card grid layouts** are a string of utility classes: `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3` — no context switching to a CSS file
- **Dark mode** (high priority for MTG players) is handled with `dark:` variants and the `class` strategy, letting a toggle button flip between themes by adding/removing a class on `<html>`
- **Responsive breakpoints** are built in and composable inline
- **No runtime overhead** — all CSS is extracted at build time, zero JS shipped for styles
- **Arbitrary values** in v4 mean card aspect ratios, custom MTG card sizes, and specific mana symbol sizing work without touching config: `aspect-[2.5/3.5]`, `w-[63px]`

**CSS Modules comparison:** CSS Modules provide better scoping for truly complex components, but they require a file-per-component discipline and more context switching. For a single-developer local tool, Tailwind's co-location wins on velocity.

**styled-components / CSS-in-JS:** Ruled out. Adds runtime overhead, a separate syntax, and slower build times. No advantage over Tailwind here.

**Dark mode setup:**
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-background: oklch(0.15 0.01 250);
  --color-surface: oklch(0.20 0.01 250);
  /* MTG-themed dark palette */
}
```

```typescript
// Toggle implementation: add/remove 'dark' class on document.documentElement
```

**Versions:**
- `tailwindcss`: 4.2.2

---

## 4. State Management: Zustand

**Recommendation: Zustand 5 — one store, three slices**

The deck builder's state breaks into three clear domains:

| Domain | Contents | Frequency of change |
|--------|----------|---------------------|
| Deck state | All decks, active deck ID, cards per deck | Low (user actions) |
| Search state | Query string, filters, results, loading flag | High (debounced typing) |
| UI state | View mode (grid/list), selected card, modals | Medium |

**Why not React Context:** Context's all-or-nothing re-render behavior makes it unsuitable for search state — every keystroke re-renders every consumer. For a card grid displaying 40+ cards, this is visible jank.

**Why not Jotai:** Jotai's atomic model excels when state pieces are highly independent and composable. The deck builder's state is relationally coupled (the active deck affects both the validation display and the card grid), which plays better as a slice-based store.

**Why not Redux:** Redux is enterprise tooling for enterprise problems. This app has 3 state domains. The boilerplate cost is not justified.

**Zustand's actual API for this project:**
```typescript
interface DeckStore {
  decks: Record<string, Deck>
  activeDeckId: string | null
  addCard: (deckId: string, card: ScryfallCard.Any) => void
  removeCard: (deckId: string, cardId: string) => void
  setCommander: (deckId: string, card: ScryfallCard.Any) => void
}
```

Zustand 5 (current: 5.0.12) integrates cleanly with `immer` for immutable deck mutations and has a `persist` middleware that wraps IndexedDB or localStorage — directly solving the "persist decks in the browser" requirement.

**Zustand + persist middleware** eliminates the need for separate storage boilerplate: one `persist()` wrapper handles serialization and hydration of the entire deck store on load.

**Versions:**
- `zustand`: 5.0.12

---

## 5. TypeScript: Yes, Strict Mode

**Recommendation: TypeScript with strict mode and Zod for runtime validation of Scryfall API responses**

TypeScript's value is especially high for this project because:

**Card data shape is complex.** Scryfall cards have different shapes depending on their layout: double-faced cards have `card_faces`, split cards have different image URIs, token cards have different legality rules. The official `@scryfall/api-types` library (published by `github.com/scryfall`) provides discriminated union types over the `layout` field. Using `ScryfallCard.Any` and narrowing by layout catches bugs the moment you write them.

**Deck validation logic is rule-heavy.** Enforcing 100-card count, singleton, color identity matching, and banned list checks involves comparing sets of strings and counts. TypeScript lets you define `ColorIdentity`, `CardLegality`, and `DeckValidationResult` types that make the validation functions self-documenting and refactor-safe.

**The IDE feedback loop accelerates development.** For a solo developer building a local tool, autocomplete on `card.oracle_text`, `card.color_identity`, and `card.legality['commander']` is faster than consulting Scryfall docs on every access.

**Zod for runtime safety:** `@scryfall/api-types` is at `1.0.0-alpha.4` — it provides TypeScript types but does not validate at runtime. Add Zod schemas for the Scryfall search response envelope to guard against unexpected API shape changes or network errors returning partial data.

```typescript
// zod schema for the search response wrapper
const ScryfallListSchema = z.object({
  object: z.literal('list'),
  total_cards: z.number(),
  has_more: z.boolean(),
  data: z.array(z.unknown()), // narrows further after layout check
})
```

**Versions:**
- `typescript`: latest (5.x, bundled with Vite)
- `@scryfall/api-types`: 1.0.0-alpha.4 (official, from scryfall GitHub org)
- `zod`: 4.3.6

---

## 6. Image Handling: Native Lazy Loading + Intersection Observer Fallback

**Recommendation: `loading="lazy"` on `<img>` tags with explicit dimensions and a `react-lazy-load-image-component` wrapper for grid performance**

Scryfall serves card images as JPEGs from their CDN at several sizes (`small`, `normal`, `large`, `png`). A full deck view shows up to 99 card images simultaneously. Without lazy loading, this fires 99 simultaneous HTTP requests on component mount.

**Strategy:**

1. **Use `normal` size images (488×680px) for grid view** — enough detail to read card art, small enough to load fast. Use `small` (146×204px) for compact list view.

2. **Native `loading="lazy"`** is supported in all modern browsers and requires zero JavaScript. Pair with explicit `width` and `height` to prevent layout shift (CLS):
   ```tsx
   <img
     src={card.image_uris.normal}
     width={488}
     height={680}
     loading="lazy"
     decoding="async"
     alt={card.name}
     className="rounded aspect-[488/680] w-full object-cover"
   />
   ```

3. **`react-lazy-load-image-component`** (v1.6.3) adds a blur-up placeholder effect — show a low-quality blurred placeholder while the full image loads. For a card browsing app where users are visually scanning, this is a meaningful UX improvement over a blank box. The library wraps Intersection Observer and handles edge cases (scroll containers, SSR, reflow).

4. **Set `rootMargin: "200px"`** on the Intersection Observer to preload images 200px before they enter the viewport, eliminating visible loading on normal scroll speed.

5. **Virtual scrolling is not needed at MVP scale.** A 99-card deck grid does not require `react-virtual` or `@tanstack/virtual`. The card grid is bounded at 100 items max. Only the search results panel (potentially hundreds of results) needs pagination — Scryfall's API returns paginated results natively (175 cards per page), so let the API do the work.

**Placeholder approach:** Render a gray card-shaped skeleton (`aspect-[488/680] bg-surface-200 animate-pulse rounded`) while the image URL is being fetched, then swap in the `<img>` tag.

**Versions:**
- `react-lazy-load-image-component`: 1.6.3

---

## 7. Testing: Vitest + React Testing Library

**Recommendation: Vitest 4 + React Testing Library. No E2E testing at MVP.**

**Vitest** (v4.1.4) is the natural fit because it shares Vite's config, transformer, and module resolution — zero additional setup. It's Jest-compatible (same API), so all existing `@testing-library/react` knowledge transfers. In watch mode, changed-file-only re-runs complete in under 300ms.

**What to test and what to skip for a local tool:**

| Layer | Test? | Rationale |
|-------|-------|-----------|
| Deck validation logic | YES — unit tests | Pure functions, high business value, easy to test |
| Color identity matching | YES — unit tests | Complex rule: all card colors must be subset of commander colors |
| Banned list check | YES — unit tests | Data-driven, regression-prone |
| Zustand store actions | YES — unit tests | `addCard`, `removeCard` with edge cases |
| React components | SELECTIVE — integration | Test the validation display component, not every card `<img>` |
| Scryfall API calls | MOCK — unit tests | Use `vi.mock` to avoid network in CI |
| E2E (Playwright/Cypress) | NO at MVP | Local tool, one developer; ROI is low |

**The validation logic is the highest-value test target.** A bug where a blue card slips into a mono-red deck, or the count displays 101 instead of 100, is a core product failure. Pure functions are trivially testable.

**Setup:**
```typescript
// vitest.config.ts — or inline in vite.config.ts
/// <reference types="vitest" />
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Versions:**
- `vitest`: 4.1.4
- `@testing-library/react`: latest (v16.x)
- `@testing-library/user-event`: latest
- `jsdom`: bundled with Vitest

---

## Recommended Install Commands

```bash
# Scaffold
npm create vite@latest edh-builder -- --template react-ts
cd edh-builder

# Tailwind v4 (Vite plugin — no postcss.config.js needed)
npm install tailwindcss @tailwindcss/vite

# State
npm install zustand

# Scryfall types + runtime validation
npm install @scryfall/api-types zod

# Image lazy loading
npm install react-lazy-load-image-component
npm install -D @types/react-lazy-load-image-component

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

---

## Alternatives Considered

| Decision | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | React 19 | Vue 3 | Smaller card-grid/image component ecosystem |
| Framework | React 19 | Svelte 5 | Smaller ecosystem; less community precedent for card-game UIs |
| Build tool | Vite 8 | Webpack 5 | Legacy; slower dev experience; no reason to choose it for new SPAs |
| Styling | Tailwind v4 | CSS Modules | More context switching; no dark mode toggling built in |
| Styling | Tailwind v4 | styled-components | Runtime overhead; JS-in-CSS complexity not justified |
| State | Zustand 5 | Jotai | Better for independent atoms; deck state is relational |
| State | Zustand 5 | Redux Toolkit | Overkill; boilerplate cost unjustified for 3 state slices |
| State | Zustand 5 | React Context | Re-render behavior unsuitable for high-frequency search state |
| Testing | Vitest | Jest | Jest needs extra transform config; Vitest zero-config with Vite |
| Testing | Unit only | Playwright E2E | ROI too low for a solo local tool at MVP |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| React recommendation | HIGH | npm version confirmed, Stack Overflow 2025 survey data |
| Vite recommendation | HIGH | npm version 8.0.8 confirmed, Rolldown integration verified |
| Tailwind v4 features | HIGH | Official tailwindcss.com blog post read directly |
| Zustand recommendation | HIGH | npm version 5.0.12 confirmed, persist middleware documented |
| @scryfall/api-types | MEDIUM | Official Scryfall GitHub org, but at alpha version (1.0.0-alpha.4) — API may shift |
| Vitest | HIGH | npm version 4.1.4 confirmed, Jest-compatible API verified |
| Image lazy loading | HIGH | Native browser support confirmed, react-lazy-load-image-component v1.6.3 confirmed |
| Zod | HIGH | npm version 4.3.6, runtime validation pattern is standard practice |

---

## Key Risks

**`@scryfall/api-types` is in alpha.** Version `1.0.0-alpha.4` means the TypeScript shapes may change. Mitigate by: wrapping all Scryfall response parsing behind a thin adapter layer (`src/lib/scryfall.ts`) so type changes are contained to one file. Do not spread raw `ScryfallCard.Any` types throughout component files.

**Tailwind v4's CSS-first config is a paradigm shift.** The `tailwind.config.js` approach from v3 is gone. Developers familiar with v3 may instinctively reach for the old pattern. Use `@theme` in `index.css` for custom colors and spacing, not a config file.

**Zustand's `persist` middleware and IndexedDB:** The default `persist` middleware uses `localStorage`. For decks with full card image URLs stored, this can hit the 5MB localStorage limit. Configure the middleware to use a custom storage backend (`idb-keyval` wrapping IndexedDB) from the start, not as a retrofit.

---

## Sources

- [Tailwind CSS v4.0 Official Release](https://tailwindcss.com/blog/tailwindcss-v4) — official
- [Tailwind CSS v4.2 — InfoQ](https://www.infoq.com/news/2026/04/tailwind-css-4-2-webpack/) — MEDIUM
- [React vs Vue vs Svelte 2026 — DEV Community](https://dev.to/_d7eb1c1703182e3ce1782/react-vs-vue-vs-svelte-choosing-the-right-frontend-framework-in-2026-24fk) — MEDIUM
- [Stack Overflow Developer Survey 2025 — TSH.io analysis](https://tsh.io/blog/javascript-frameworks-frontend-development) — MEDIUM
- [Scryfall api-types — GitHub (scryfall org)](https://github.com/scryfall/api-types) — HIGH (official)
- [Scryfall api-types — npm](https://www.npmjs.com/package/@scryfall/api-types) — HIGH
- [State Management in 2025 — DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — LOW
- [React State Management 2026 — PkgPulse](https://www.pkgpulse.com/blog/react-state-management-2026) — LOW
- [Vitest vs Jest 2026 — tech-insider.org](https://tech-insider.org/vitest-vs-jest-2026/) — LOW
- [Vitest in 2026 — DEV Community](https://dev.to/ottoaria/vitest-in-2026-the-testing-framework-that-makes-you-actually-want-to-write-tests-kap) — LOW
- [React Lazy Loading Images — Cloudinary](https://cloudinary.com/guides/web-performance/react-lazy-loading-images) — MEDIUM
- [Vite vs Webpack 2026 — DEV Community](https://dev.to/_d7eb1c1703182e3ce1782/vite-vs-webpack-build-tool-comparison-for-modern-web-development-2026-3793) — LOW
