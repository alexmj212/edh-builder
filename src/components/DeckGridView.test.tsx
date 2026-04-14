import { describe, it } from 'vitest';
describe('DeckGridView', () => {
  it.todo('renders grid grid-cols-3 gap-2 with one cell per card');
  it.todo('each cell uses aspect-[146/204] container (no layout shift)');
  it.todo('skeleton div (bg-surface animate-pulse) is shown before img.onLoad fires');
  it.todo('skeleton is removed after img.onLoad');
  it.todo('img has loading="lazy" decoding="async"');
  it.todo('uses getImageUri(card, "small") for src');
  it.todo('remove button is always visible in grid view (no opacity-0 hover reveal)');
});
