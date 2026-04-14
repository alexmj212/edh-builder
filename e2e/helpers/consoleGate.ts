// e2e/helpers/consoleGate.ts
// Source: https://playwright.dev/docs/api/class-consolemessage (verified 2026-04-12)
import type { ConsoleMessage, Page } from '@playwright/test';

interface BenignRule {
  /** Any one of these substrings must appear in `msg.location()`. Use multiple to cover
   *  dev vs. prod build paths (e.g. `storage.ts` for dev source maps, `@vite/client` for
   *  Vite's dev-mode console-forwarding wrapper, hashed asset names for prod builds). */
  locationIncludes: string | string[];
  textIncludes: string;
  reason: string;
}

/** Single, named allowlist per D-14. New entries REQUIRE a reason. */
export const KNOWN_BENIGN_CONSOLE: BenignRule[] = [
  {
    // Vite's dev client (`@vite/client`) wraps console.warn to forward messages to
    // the dev server — so `msg.location()` points at `@vite/client:509`, not the
    // originating `storage.ts`. Accept either so the rule works in dev, in prod
    // builds (where `storage.ts` gets bundled into a hashed asset), and under
    // the unwrapped path if Vite's wrapping ever changes.
    locationIncludes: ['storage.ts', '@vite/client'],
    textIncludes:     'Persistent storage not granted',
    reason:           'Expected browser behavior for non-installed/incognito origins (Phase 02.1 UAT test 1)',
  },
];

function locationMatches(location: string, rule: BenignRule['locationIncludes']): boolean {
  const needles = Array.isArray(rule) ? rule : [rule];
  return needles.some(n => location.includes(n));
}

export interface CapturedMessage { type: string; text: string; location: string }

export function installConsoleGate(page: Page): CapturedMessage[] {
  const unexpected: CapturedMessage[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const location = `${msg.location().url}:${msg.location().lineNumber}`;
    const text = msg.text();
    const isBenign = KNOWN_BENIGN_CONSOLE.some(
      r => locationMatches(location, r.locationIncludes) && text.includes(r.textIncludes),
    );
    if (!isBenign) unexpected.push({ type, text, location });
  });
  return unexpected;
}
