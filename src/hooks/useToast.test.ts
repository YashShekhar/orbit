import { act, renderHook } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { useToast } from './useToast';

it('restarts dismissal for a new notification and cleans up its timer', async () => {
  vi.useFakeTimers();
  const { result, unmount } = renderHook(useToast);
  await act(() => result.current.notify('Saved'));
  await act(() => vi.advanceTimersByTime(5000));
  await act(() => result.current.notify('Failed', true));
  await act(() => vi.advanceTimersByTime(500));
  expect(result.current.toast).toEqual({ text: 'Failed', error: true });
  await act(() => vi.advanceTimersByTime(5000));
  expect(result.current.toast).toBeNull();
  await act(() => result.current.notify('Again'));
  await act(() => result.current.dismiss());
  expect(result.current.toast).toBeNull();
  await act(() => result.current.notify('Last'));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
