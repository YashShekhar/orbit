import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './errors.js';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  staticRoot: string,
): Promise<void> {
  if (!['GET', 'HEAD'].includes(req.method || '')) throw new HttpError(405, 'Method not allowed.');
  const decoded = decodeURIComponent(url.pathname);
  if (decoded.includes('\\') || decoded.includes('\0') || decoded.includes(':'))
    throw new HttpError(400, 'Invalid path.');
  let file = path.resolve(staticRoot, '.' + decoded);
  if (!file.startsWith(staticRoot + path.sep) && file !== staticRoot)
    throw new HttpError(403, 'Invalid path.');
  if (decoded === '/') file = path.join(staticRoot, 'index.html');
  try {
    if (!(await fs.stat(file)).isFile()) throw new Error('Not a file');
  } catch {
    if (path.extname(decoded)) throw new HttpError(404, 'File not found.');
    file = path.join(staticRoot, 'index.html');
  }
  let content: Buffer;
  try {
    content = await fs.readFile(file);
  } catch {
    throw new HttpError(503, 'Build the application with npm run build first.');
  }
  res.writeHead(200, {
    'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });
  res.end(req.method === 'HEAD' ? undefined : content);
}
