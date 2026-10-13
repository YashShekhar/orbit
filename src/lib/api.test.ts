import { describe, it, expect, vi } from 'vitest';
import { api, ApiError } from './api';

describe('API transport', () => {
  it('sends JSON mutations and forwards cancellation', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"saved"}'));
    vi.stubGlobal('fetch', fetcher);
    const signal = new AbortController().signal;
    expect(await api('/api/task', { prompt: 'Review' }, 'PATCH', signal)).toEqual({ id: 'saved' });
    expect(fetcher).toHaveBeenCalledWith('/api/task', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"prompt":"Review"}',
      signal,
    });
  });
  it('preserves server errors and supplies a fallback for malformed error objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('{"error":"Missing bot"}', { status: 404 }))
        .mockResolvedValueOnce(new Response('{}', { status: 500 })),
    );
    await expect(api('/api/task')).rejects.toMatchObject({
      message: 'Missing bot',
      status: 404,
      name: 'ApiError',
    });
    await expect(api('/api/task')).rejects.toThrow(new ApiError('Something went wrong.', 500));
  });
  it('propagates aborts without replacing their identity', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(api('/api/state')).rejects.toBe(error);
  });
});
