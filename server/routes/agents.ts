import type { Agent } from '../../shared/types.js';
import { uid } from '../storage/store.js';
import { body } from '../http/body.js';
import { json } from '../http/response.js';
import { optionalText, text } from '../http/validation.js';
import { HttpError } from '../http/errors.js';
import type { Route } from './types.js';

export const agentRoutes: Route = async ({ req, res, url, store, engine }) => {
  const match = url.pathname.match(/^\/api\/agents\/([^/]+)$/);
  if (!(req.method === 'POST' && url.pathname === '/api/agents') && !(req.method === 'PATCH' && match)) return false;
  const b = await body(req);
  const name = text(b.name, 40, 'name');
  const fields = { name, role: text(b.role, 80, 'role'), instructions: text(b.instructions, 12000, 'instructions'), memory: optionalText(b.memory, 12000, 'memory'), model: optionalText(b.model, 200, 'model'), initials: name.slice(0, 2).toUpperCase() };
  if (match) {
    const agent = store.state.agents.find(a => a.id === match[1]);
    if (!agent) throw new HttpError(404, 'Bot not found.');
    Object.assign(agent, fields); engine.changed(); json(res, 200, agent);
  } else {
    const color = optionalText(b.color, 20, 'color');
    const agent: Agent = { id: uid(), ...fields, color: ['green', 'purple', 'orange', 'blue'].includes(color) ? color : 'blue' };
    store.state.agents.push(agent); engine.changed(); json(res, 201, agent);
  }
  return true;
};
