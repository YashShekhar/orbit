import { json } from '../http/response.js';
import { text } from '../http/validation.js';
import { HttpError } from '../http/errors.js';
import type { Route } from './types.js';

export const workspaceRoutes: Route = async ({ req, res, url, workspace, browser }) => {
  if (req.method !== 'GET') return false;
  if (url.pathname === '/api/files')
    json(res, 200, await workspace.list(url.searchParams.get('path') || '.'));
  else if (url.pathname === '/api/file')
    json(res, 200, {
      content: await workspace.read(text(url.searchParams.get('path'), 2000, 'file path')),
    });
  else if (url.pathname === '/api/screenshot') {
    const taskId = url.searchParams.get('taskId') || browser.latest?.taskId;
    if (!taskId || !browser.pages.has(taskId))
      throw new HttpError(
        404,
        'No browser page yet. Assign a browsing task or run the system check.',
      );
    const screenshot = await browser.screenshot(taskId);
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
    res.end(screenshot);
  } else return false;
  return true;
};
