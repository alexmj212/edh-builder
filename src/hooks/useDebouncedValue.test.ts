import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useDebouncedValue', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 400));
    expect(result.current).toBe('a');
  });

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 400), { initialProps: { v: 'a' } });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe('b');
  });

  it('cancels pending update when value changes again', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 400), { initialProps: { v: 'a' } });
    rerender({ v: 'b' });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ v: 'c' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('c');
  });
});
