// e2e/helpers/consoleGate.ts
// Source: https://playwright.dev/docs/api/class-consolemessage (verified 2026-04-12)
import type { ConsoleMessage, Page } from '@playwright/test';

interface BenignRule {
  locationIncludes: string;
  textIncludes: string;
  reason: string;
}

/** Single, named allowlist per D-14. New entries REQUIRE a reason. */
export const KNOWN_BENIGN_CONSOLE: BenignRule[] = [
  {
    locationIncludes: 'storage.ts',
    textIncludes:     'Persistent storage not granted',
    reason:           'Expected browser behavior for non-installed/incognito origins (Phase 02.1 UAT test 1)',
  },
];

export interface CapturedMessage { type: string; text: string; location: string }

export function installConsoleGate(page: Page): CapturedMessage[] {
  const unexpected: CapturedMessage[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const location = `${msg.location().url}:${msg.location().lineNumber}`;
    const text = msg.text();
    const isBenign = KNOWN_BENIGN_CONSOLE.some(
      r => location.includes(r.locationIncludes) && text.includes(r.textIncludes),
    );
    if (!isBenign) unexpected.push({ type, text, location });
  });
  return unexpected;
}
