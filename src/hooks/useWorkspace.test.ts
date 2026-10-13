import { act, renderHook } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { useWorkspace } from './useWorkspace';

it('discards an older poll after a mutation and aborts outstanding requests on unmount', async () => {
  vi.useFakeTimers();
  let finishOld!: (response: Response) => void;
  const old = new Promise<Response>((resolve) => {
    finishOld = resolve;
  });
  const fetcher = vi
    .fn()
    .mockReturnValueOnce(old)
    .mockResolvedValueOnce(new Response('{"id":"new"}'))
    .mockResolvedValueOnce(new Response('{"tasks":["new"]}'))
    .mockReturnValue(new Promise(() => {}));
  vi.stubGlobal('fetch', fetcher);
  const { result, unmount } = renderHook(() => useWorkspace(vi.fn()));
  await act(async () => {
    expect(await result.current.act('/api/tasks', {})).toEqual({ id: 'new' });
  });
  await act(async () => {
    finishOld(new Response('{"tasks":["stale"]}'));
  });
  expect(result.current.state?.tasks).toEqual(['new']);
  expect((fetcher.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  unmount();
  expect((fetcher.mock.calls[3][1] as RequestInit).signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('reports connection loss, recovers on polling, and surfaces mutation failures', async () => {
  vi.useFakeTimers();
  const notify = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(new Response('{"tasks":[]}'))
      .mockRejectedValueOnce(new Error('Save failed')),
  );
  const { result } = renderHook(() => useWorkspace(notify));
  await act(async () => {});
  expect(result.current.offline).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(result.current.offline).toBe(false);
  await act(async () => {
    expect(await result.current.act('/api/tasks')).toBeNull();
  });
  expect(notify).toHaveBeenCalledWith('Save failed', true);
});
