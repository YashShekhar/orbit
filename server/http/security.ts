import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './errors.js';

export function guardLocalRequest(req: IncomingMessage, res: ServerResponse, port: number): URL {
  const hosts = [`localhost:${port}`, `127.0.0.1:${port}`];
  if (!hosts.includes(req.headers.host || '')) throw new HttpError(403, 'Local access only.');
  if (req.headers.origin && !hosts.map(host => `http://${host}`).includes(req.headers.origin)) throw new HttpError(403, 'Cross-origin requests are not allowed.');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return new URL(req.url || '/', `http://${req.headers.host}`);
}
