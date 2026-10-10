import { isRecord } from '../../shared/errors.js';
import { body } from '../http/body.js';
import { json } from '../http/response.js';
import { endpoint, number, optionalText } from '../http/validation.js';
import { HttpError } from '../http/errors.js';
import type { Route } from './types.js';

export const settingsRoutes: Route = async ({ req, res, url, store, engine }) => {
  if (req.method !== 'POST' || !['/api/settings', '/api/models'].includes(url.pathname)) return false;
  const b = await body(req);
  const baseUrl = endpoint(b.baseUrl);
  if (url.pathname === '/api/settings') {
    const maxSteps = number(b.maxSteps ?? 16, 2, 40, 'Maximum turns');
    if (!Number.isInteger(maxSteps)) throw new HttpError(400, 'Maximum turns must be an integer.');
    const settings = { provider: optionalText(b.provider, 40, 'provider') || 'custom', baseUrl, model: optionalText(b.model, 200, 'model').trim(), maxSteps };
    // Credentials belong to a specific endpoint; never send a saved key to a new host.
    if (b.apiKey !== undefined) engine.apiKey = optionalText(b.apiKey, 8192, 'API key').trim();
    else if (baseUrl !== store.state.settings.baseUrl) engine.apiKey = '';
    store.state.settings = settings; engine.changed(); json(res, 200, { ...settings, hasKey: Boolean(engine.apiKey) });
  } else {
    const key = b.apiKey !== undefined ? optionalText(b.apiKey, 8192, 'API key').trim() : baseUrl === store.state.settings.baseUrl ? engine.apiKey : '';
    const response = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(20000), headers: key ? { Authorization: `Bearer ${key}` } : {} });
    if (!response.ok) throw new HttpError(502, `Provider returned HTTP ${response.status}. Check the endpoint and API key.`);
    const result: unknown = await response.json();
    if (!isRecord(result) || !Array.isArray(result.data)) throw new HttpError(502, 'Provider returned an invalid model list.');
    const models = result.data.filter((model: unknown): model is { id: string } => isRecord(model) && typeof model.id === 'string').map(model => model.id).sort();
    json(res, 200, { models });
  }
  return true;
};
