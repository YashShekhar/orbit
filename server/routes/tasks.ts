import { body } from '../http/body.js';
import { json } from '../http/response.js';
import { text, boolean } from '../http/validation.js';
import { HttpError } from '../http/errors.js';
import type { Route } from './types.js';

export const taskRoutes: Route = async ({ req, res, url, store, engine, port }) => {
  if (req.method !== 'POST') return false;
  if (url.pathname === '/api/tasks') {
    const b = await body(req);
    json(
      res,
      201,
      engine.createTask(text(b.agentId, 100, 'bot ID'), text(b.prompt, 24000, 'task')),
    );
    return true;
  }
  if (url.pathname === '/api/diagnostic') {
    await body(req);
    engine.diagnosticUrl = `http://localhost:${port}/browser-check.html`;
    json(
      res,
      201,
      engine.createTask(store.state.agents[0].id, 'Check the shared workspace and agent browser', {
        diagnostic: true,
      }),
    );
    return true;
  }
  const match = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(stop|retry|approve)$/);
  if (!match) return false;
  const b = await body(req);
  const task = store.state.tasks.find((t) => t.id === match[1]);
  if (!task) throw new HttpError(404, 'Task not found.');
  if (match[2] === 'stop') {
    engine.stop(task.id);
    json(res, 200, { ok: true });
  } else if (match[2] === 'retry')
    json(res, 201, engine.createTask(task.agentId, task.prompt, { diagnostic: task.diagnostic }));
  else {
    if (!task.approval) throw new HttpError(409, 'This task has no pending approval.');
    engine.approve(task.approval.id, boolean(b.allowed));
    json(res, 200, { ok: true });
  }
  return true;
};
