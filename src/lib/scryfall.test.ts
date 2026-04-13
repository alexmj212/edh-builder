import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Shared mock stubs for 'scryfall-api'.
// We use a module-level factory so individual tests can reconfigure page / byId
// behavior via these hoisted refs. The mocks are typed as callable functions
// (`(...args: unknown[]) => unknown`) rather than vi.Mock's broad
// `Mock<Procedure | Constructable>` union, which vitest 4 no longer makes
// structurally callable without a `new` signature (TS2348).
type AnyFn = (...args: unknown[]) => unknown;
type PageStub = {
  next: ReturnType<typeof vi.fn>;
  hasMore: boolean;
  count: number;
};
const searchSpyRef: { current: ReturnType<typeof vi.fn<AnyFn>> } = {
  current: vi.fn<AnyFn>(),
};
const byIdSpyRef: { current: ReturnType<typeof vi.fn<AnyFn>> } = {
  current: vi.fn<AnyFn>(),
};

vi.mock('scryfall-api', () => {
  return {
    Cards: {
      search: (...args: unknown[]) => searchSpyRef.current(...args),
      byId: (...args: unknown[]) => byIdSpyRef.current(...args),
    },
    // MagicPageResult is a type export in TS — at runtime we only need its
    // shape via pageStubRef, so nothing to export here.
    MagicPageResult: class {},
    ScryfallError: class ScryfallError extends Error {},
  };
});

// Import AFTER vi.mock so the wrapper pulls the stubbed module.
import {
  abortable,
  searchCards,
  fetchNextPage,
  fetchCardById,
  searchCommanders,
  searchPartnersFor,
  getImageUri,
  type Card,
} from './scryfall';

function fakeCard(overrides: Partial<Record<string, unknown>> = {}): Card {
  return {
    id: 'c-1',
    oracle_id: 'o-1',
    name: 'Fake',
    keywords: [],
    oracle_text: '',
    type_line: 'Legendary Creature',
    ...overrides,
  } as unknown as Card;
}

function makePageStub(data: Card[], hasMore = false, count = data.length): PageStub {
  const stub: PageStub = {
    next: vi.fn().mockResolvedValue(data),
    hasMore,
    count,
  };
  return stub;
}

beforeEach(() => {
  searchSpyRef.current = vi.fn();
  byIdSpyRef.current = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('abortable', () => {
  it('passes through when no signal provided', async () => {
    await expect(abortable(Promise.resolve(42))).resolves.toBe(42);
  });

  it('rejects immediately if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      abortable(new Promise(() => {}), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects with AbortError when signal aborts mid-flight', async () => {
    const controller = new AbortController();
    // A promise that never settles on its own.
    const pending = new Promise<number>(() => {});
    const p = abortable(pending, controller.signal);
    // Attach noop catch so Node does not flag as unhandled.
    p.catch(() => {});
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('resolves with the underlying value when not aborted', async () => {
    const controller = new AbortController();
    await expect(abortable(Promise.resolve('ok'), controller.signal)).resolves.toBe('ok');
  });
});

describe('fetchCardById', () => {
  it('returns the card when Cards.byId resolves', async () => {
    const card = fakeCard({ id: 'got-it', name: 'Got It' });
    byIdSpyRef.current.mockResolvedValue(card);
    await expect(fetchCardById('got-it')).resolves.toBe(card);
    expect(byIdSpyRef.current).toHaveBeenCalledWith('got-it');
  });

  it('throws "Card not found" when Cards.byId resolves undefined', async () => {
    byIdSpyRef.current.mockResolvedValue(undefined);
    await expect(fetchCardById('nonexistent-id')).rejects.toThrow(
      'Card not found: nonexistent-id',
    );
  });
});

describe('searchCards / fetchNextPage', () => {
  it('searchCards returns { data, hasMore, totalCards, _page } shape', async () => {
    const card = fakeCard({ id: 'r1', name: 'Result' });
    const page = makePageStub([card], true, 42);
    searchSpyRef.current.mockReturnValue(page);

    const result = await searchCards('test query');

    expect(searchSpyRef.current).toHaveBeenCalledWith('test query', undefined);
    expect(result.data).toEqual([card]);
    expect(result.hasMore).toBe(true);
    expect(result.totalCards).toBe(42);
    expect(result._page).toBe(page);
  });

  it('searchCards rejects when API returns cards missing the required id field (Zod boundary)', async () => {
    // D-05 Zod validation boundary: malformed responses (missing id or name)
    // MUST be rejected at the wrapper, not propagated to callers.
    const malformed = [{ name: 'No ID' }] as unknown as Card[];
    const page = makePageStub(malformed, false, 1);
    searchSpyRef.current.mockReturnValue(page);

    await expect(searchCards('test')).rejects.toThrow();
  });

  it('searchCards rejects when API returns cards missing the required name field (Zod boundary)', async () => {
    const malformed = [{ id: 'x-1' }] as unknown as Card[];
    const page = makePageStub(malformed, false, 1);
    searchSpyRef.current.mockReturnValue(page);

    await expect(searchCards('test')).rejects.toThrow();
  });

  it('fetchNextPage advances via the opaque page handle', async () => {
    const card1 = fakeCard({ id: 'r1', name: 'One' });
    const card2 = fakeCard({ id: 'r2', name: 'Two' });

    const page = makePageStub([card1], true, 10);
    searchSpyRef.current.mockReturnValue(page);
    const first = await searchCards('q');

    // Second call to page.next() resolves with the next batch.
    page.next.mockResolvedValueOnce([card2]);
    page.hasMore = false;
    const second = await fetchNextPage(first);

    expect(second.data).toEqual([card2]);
    expect(second.hasMore).toBe(false);
    expect(second._page).toBe(page);
  });
});

describe('searchCommanders / searchPartnersFor', () => {
  it('searchCommanders passes order=edhrec option and the composed query', async () => {
    const page = makePageStub([], false, 0);
    searchSpyRef.current.mockReturnValue(page);

    await searchCommanders('atraxa');

    expect(searchSpyRef.current).toHaveBeenCalledOnce();
    const [q, opts] = searchSpyRef.current.mock.calls[0] as [string, { order?: string }];
    expect(q).toContain('(t:legendary t:creature or o:"can be your commander")');
    expect(q).toContain('f:commander');
    expect(q).toContain('name:atraxa');
    expect(opts?.order).toBe('edhrec');
  });

  it('searchPartnersFor returns empty result for "none" primary WITHOUT calling Cards.search at all', async () => {
    // 'none' primary = no partner kind. Wrapper shortcut: synthesize an inert
    // MagicPageResult-shaped handle without invoking Cards.search. The returned
    // SearchResult.data MUST be empty and hasMore MUST be false, and no call
    // to Cards.search (real or stubbed) is made.
    const primary = fakeCard({ keywords: [], oracle_text: '' });
    const result = await searchPartnersFor(primary, '');

    expect(result.data).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.totalCards).toBe(0);
    // Cards.search was NEVER invoked for the 'none' case.
    expect(searchSpyRef.current).not.toHaveBeenCalled();
    // The synthesized _page handle is inert: .next() resolves to [] with no I/O.
    await expect(result._page.next()).resolves.toEqual([]);
  });

  it('searchPartnersFor with generic primary passes the partner query to Cards.search', async () => {
    const page = makePageStub([], false, 0);
    searchSpyRef.current.mockReturnValue(page);

    const primary = fakeCard({ keywords: ['Partner'], oracle_text: 'Partner' });
    await searchPartnersFor(primary, '');

    const [q, opts] = searchSpyRef.current.mock.calls[0] as [string, { order?: string }];
    expect(q).toContain('(o:"Partner") -o:"Partner with" f:commander');
    expect(opts?.order).toBe('edhrec');
  });
});

describe('getImageUri', () => {
  it('returns image_uris.normal for single-faced cards', () => {
    const c = {
      image_uris: { normal: 'https://example.com/normal.jpg' },
    } as unknown as Card;
    expect(getImageUri(c, 'normal')).toBe('https://example.com/normal.jpg');
  });

  it('falls back to card_faces[0].image_uris.normal for DFC', () => {
    const c = {
      card_faces: [
        { image_uris: { normal: 'https://example.com/face0.jpg' } },
        { image_uris: { normal: 'https://example.com/face1.jpg' } },
      ],
    } as unknown as Card;
    expect(getImageUri(c, 'normal')).toBe('https://example.com/face0.jpg');
  });

  it('returns placeholder for cards with neither image source', () => {
    const c = {} as unknown as Card;
    expect(getImageUri(c, 'normal')).toBe('/placeholder-card.jpg');
  });
});
