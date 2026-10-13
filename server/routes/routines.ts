import type { Routine } from '../../shared/types.js';
import { now, uid } from '../storage/store.js';
import { body } from '../http/body.js';
import { json } from '../http/response.js';
import { text, number, boolean } from '../http/validation.js';
import { HttpError } from '../http/errors.js';
import type { Route } from './types.js';

export const routineRoutes: Route = async ({ req, res, url, store, engine }) => {
  if (req.method === 'POST' && url.pathname === '/api/routines') {
    const b = await body(req);
    const minutes = number(b.intervalMinutes, 1, 525600, 'Interval');
    const agentId = text(b.agentId, 100, 'bot ID');
    if (!store.state.agents.some((a) => a.id === agentId))
      throw new HttpError(404, 'Bot not found.');
    const routine: Routine = {
      id: uid(),
      name: text(b.name, 80, 'routine name'),
      agentId,
      prompt: text(b.prompt, 24000, 'task'),
      intervalMinutes: minutes,
      enabled: true,
      nextRun: new Date(Date.now() + minutes * 60000).toISOString(),
      createdAt: now(),
    };
    store.state.routines.push(routine);
    engine.changed();
    json(res, 201, routine);
    return true;
  }
  const match = url.pathname.match(/^\/api\/routines\/([^/]+)$/);
  if (!match || !['PATCH', 'DELETE'].includes(req.method || '')) return false;
  const b = await body(req);
  const routine = store.state.routines.find((r) => r.id === match[1]);
  if (!routine) throw new HttpError(404, 'Routine not found.');
  if (req.method === 'PATCH') {
    routine.enabled = boolean(b.enabled);
    if (routine.enabled)
      routine.nextRun = new Date(Date.now() + routine.intervalMinutes * 60000).toISOString();
    engine.changed();
    json(res, 200, routine);
  } else {
    store.state.routines = store.state.routines.filter((r) => r.id !== routine.id);
    engine.changed();
    json(res, 200, { ok: true });
  }
  return true;
};
