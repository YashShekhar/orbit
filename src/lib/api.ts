import { isRecord } from '../../shared/errors';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The only browser HTTP transport. Keeps cancellation and errors consistent across features. */
export async function api<T>(
  url: string,
  data?: unknown,
  method = 'POST',
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    ...(data === undefined
      ? {}
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
  const body: unknown = await response.json();
  if (!response.ok)
    throw new ApiError(
      isRecord(body) && typeof body.error === 'string' ? body.error : 'Something went wrong.',
      response.status,
    );
  return body as T;
}
