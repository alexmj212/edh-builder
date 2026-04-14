import { describe, it } from 'vitest';
describe('DeckListView', () => {
  it.todo('renders one section per non-empty category in CATEGORY_ORDER');
  it.todo('shows category count in the header (integer only, no denominator)');
  it.todo('omits empty categories entirely');
  it.todo('renders 32x32 thumbnail with loading="lazy" per row');
  it.todo('renders Remove button with aria-label="Remove {name} from deck"');
  it.todo('remove button is focusable at all times (opacity-0 initial, opacity-100 on focus)');
  it.todo('category headers are sticky (sticky top-0)');
});
