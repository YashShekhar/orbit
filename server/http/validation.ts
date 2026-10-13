import { isRecord } from '../../shared/errors.js';
import { HttpError } from './errors.js';

export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, 'Expected a JSON object.');
  return value;
}
export function text(value: unknown, limit: number, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit)
    throw new HttpError(400, `Enter a valid ${label} (up to ${limit} characters).`);
  return value.trim();
}
export function optionalText(value: unknown, limit: number, label: string): string {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > limit)
    throw new HttpError(400, `Enter a valid ${label} (up to ${limit} characters).`);
  return value;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new HttpError(400, 'Expected a boolean value.');
  return value;
}
export function number(value: unknown, min: number, max: number, label: string): number {
  const result = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isFinite(result) || result < min || result > max)
    throw new HttpError(400, `${label} must be between ${min} and ${max}.`);
  return result;
}
export function endpoint(value: unknown): string {
  let parsed: URL;
  try {
    parsed = new URL(text(value, 2000, 'API URL'));
  } catch {
    throw new HttpError(400, 'Enter a valid API base URL.');
  }
  if (
    !['https:', 'http:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new HttpError(
      400,
      'Use a valid HTTP(S) API base URL without credentials or query parameters.',
    );
  return parsed.href.replace(/\/$/, '');
}
