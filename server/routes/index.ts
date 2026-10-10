import { now } from '../storage/store.js';
import { json } from '../http/response.js';
import { HttpError } from '../http/errors.js';
import { agentRoutes } from './agents.js';
import { taskRoutes } from './tasks.js';
import { routineRoutes } from './routines.js';
import { settingsRoutes } from './settings.js';
import { workspaceRoutes } from './workspace.js';
import type { RouteContext } from './types.js';

const routes = [agentRoutes, taskRoutes, routineRoutes, settingsRoutes, workspaceRoutes];
export async function routeApi(context: RouteContext): Promise<void> {
  const { req, res, url, store, engine, browser, workspace } = context;
  if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, { ...store.state, settings: { ...store.state.settings, hasKey: Boolean(engine.apiKey) }, computer: { running: Boolean(browser.context), latest: browser.latest, workspace: workspace.root }, serverTime: now() });
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, name: 'Orbit', activeTasks: engine.active.size });
  for (const route of routes) if (await route(context)) return;
  throw new HttpError(404, 'Route not found.');
}
