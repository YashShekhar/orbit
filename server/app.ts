import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { ViteDevServer } from 'vite';
import { createStore } from './storage/store.js';
import { Workspace } from './tools/workspace.js';
import { BrowserComputer } from './tools/browser.js';
import { AgentEngine } from './agent/engine.js';
import { routeApi } from './routes/index.js';
import { guardLocalRequest } from './http/security.js';
import { serveStatic } from './http/static-files.js';
import { HttpError } from './http/errors.js';
import { json } from './http/response.js';
import { errorMessage } from '../shared/errors.js';
import type { ServerConfig } from './config.js';

/** Composition root. Importing this module never starts a server or scheduler. */
export async function createApplication(config: ServerConfig) {
  const store = createStore(config.dataDir);
  const workspace = new Workspace(path.join(store.root, 'workspace'));
  await fs.mkdir(workspace.root, { recursive: true });
  const browser = new BrowserComputer(store.root);
  const engine = new AgentEngine(store, workspace, browser);
  if (process.env.MODEL_BASE_URL) store.state.settings.baseUrl = process.env.MODEL_BASE_URL;
  if (process.env.MODEL_ID) store.state.settings.model = process.env.MODEL_ID;
  const services = { store, workspace, browser, engine };
  const vite: ViteDevServer | null = config.dev ? await (await import('vite')).createServer({ root: config.root, server: { middlewareMode: true }, appType: 'spa' }) : null;
  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        const address = server.address();
        const port = address && typeof address !== 'string' ? address.port : config.port;
        const url = guardLocalRequest(req, res, port);
        if (url.pathname.startsWith('/api/')) await routeApi({ ...services, req, res, url, port });
        else if (vite) vite.middlewares(req, res);
        else await serveStatic(req, res, url, config.staticDir);
      } catch (error) {
        if (res.headersSent) return res.end();
        const message = errorMessage(error);
        json(res, error instanceof HttpError ? error.status : 400, { error: message === 'fetch failed' ? 'Cannot reach the provider. Check that the server is running and the base URL is correct.' : message });
      }
    })();
  });
  let interval: ReturnType<typeof setInterval> | undefined;
  let stopping: Promise<void> | undefined;
  function startScheduler() { interval ??= setInterval(() => engine.tick(), 10000); }
  async function shutdown(): Promise<void> {
    if (stopping) return stopping;
    stopping = (async () => {
      clearInterval(interval);
      // Disable draining before cancelling so queued tasks cannot restart during shutdown.
      engine.stopping = true;
      for (const task of store.state.tasks) if (['queued', 'running', 'awaiting_approval'].includes(task.status)) engine.stop(task.id);
      await browser.close();
      await vite?.close();
      server.closeAllConnections();
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    })();
    return stopping;
  }
  return { ...services, server, startScheduler, shutdown };
}
