import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApplication } from '../../server/app.js';
import type { Agent, AppState, Routine, Task } from '../../shared/types.js';

async function fixture(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-api-'));
  const staticDir = path.join(root, 'public');
  await fs.mkdir(path.join(staticDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(staticDir, 'index.html'), '<html>Orbit test</html>');
  await fs.writeFile(path.join(staticDir, 'assets', 'app.js'), 'export {};');
  const app = await createApplication({
    root,
    staticDir,
    dataDir: path.join(root, 'data'),
    port: 0,
    dev: false,
  });
  app.engine.drain = () => {};
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  t.after(async () => {
    await app.shutdown();
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep + 'orbit-api-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  function request(route: string, body?: unknown, method = 'POST') {
    return fetch(
      url + route,
      body === undefined
        ? undefined
        : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
  }
  async function json<T>(route: string, body?: unknown, method = 'POST'): Promise<T> {
    const response = await request(route, body, method);
    assert.ok(response.ok, await response.clone().text());
    return response.json() as Promise<T>;
  }
  return { ...app, root, url, request, json };
}

void test('HTTP boundary rejects foreign origins, malformed bodies and oversized UTF-8 input', async (t) => {
  const { url, request } = await fixture(t);
  assert.equal(
    (await fetch(url + '/api/state', { headers: { Origin: 'https://foreign.example' } })).status,
    403,
  );
  const foreignHostStatus = await new Promise<number | undefined>((resolve, reject) => {
    http
      .get(url + '/api/state', { headers: { Host: 'foreign.example' } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      })
      .on('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  const health = await request('/api/health');
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(url + '/api/tasks', { method: 'POST', body: '{}' })).status, 415);
  for (const body of ['{', '[]', 'null']) {
    assert.equal(
      (
        await fetch(url + '/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
      ).status,
      400,
    );
  }
  assert.equal((await request('/api/tasks', { prompt: 'é'.repeat(260000) })).status, 413);
  assert.equal((await request('/api/missing')).status, 404);
});

void test('API maintains agents, task lifecycle and routines with validated state', async (t) => {
  const { json, request, store } = await fixture(t);
  const input = {
    name: 'Test bot',
    role: 'Reviewer',
    instructions: 'Review files',
    memory: '',
    model: '',
  };
  const agent = await json<Agent>('/api/agents', input);
  assert.equal(
    (await json<Agent>(`/api/agents/${agent.id}`, { ...input, name: 'Updated' }, 'PATCH')).name,
    'Updated',
  );
  assert.equal((await request('/api/agents/missing', input, 'PATCH')).status, 404);
  assert.equal((await request('/api/agents', { ...input, memory: 42 })).status, 400);
  const task = await json<Task>('/api/tasks', { agentId: agent.id, prompt: 'Review documents' });
  assert.equal(task.status, 'queued');
  assert.equal((await request(`/api/tasks/${task.id}/approve`, { allowed: true })).status, 409);
  await json(`/api/tasks/${task.id}/stop`, {});
  assert.equal(store.state.tasks[0].status, 'cancelled');
  const retry = await json<Task>(`/api/tasks/${task.id}/retry`, {});
  assert.notEqual(retry.id, task.id);
  assert.equal((await request('/api/tasks/missing/stop', {})).status, 404);
  const routineInput = { name: 'Review', agentId: agent.id, prompt: 'Review', intervalMinutes: 60 };
  const routine = await json<Routine>('/api/routines', routineInput);
  assert.equal(
    (await request(`/api/routines/${routine.id}`, { enabled: 'false' }, 'PATCH')).status,
    400,
  );
  assert.equal(
    (await json<Routine>(`/api/routines/${routine.id}`, { enabled: false }, 'PATCH')).enabled,
    false,
  );
  assert.equal(
    (await json<Routine>(`/api/routines/${routine.id}`, { enabled: true }, 'PATCH')).enabled,
    true,
  );
  await json(`/api/routines/${routine.id}`, {}, 'DELETE');
  assert.equal(store.state.routines.length, 0);
  assert.equal(
    (await request('/api/routines', { ...routineInput, intervalMinutes: 0 })).status,
    400,
  );
  assert.equal(
    (await request('/api/routines', { ...routineInput, agentId: 'missing' })).status,
    404,
  );
  assert.equal((await request('/api/routines/missing', {}, 'DELETE')).status, 404);
});

void test('provider credentials stay in memory and are never forwarded to a different endpoint', async (t) => {
  const { json, request, engine, root } = await fixture(t);
  const received: (string | undefined)[] = [];
  const provider = http.createServer((req, res) => {
    received.push(req.headers.authorization);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: [{ id: 'z-model' }, { id: 99 }, { id: 'a-model' }] }));
  });
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => provider.close(() => resolve())));
  const baseUrl = `http://127.0.0.1:${(provider.address() as AddressInfo).port}/v1`;
  await json('/api/settings', { baseUrl, model: 'mock', apiKey: 'test-only-secret' });
  const state = await json<AppState>('/api/state');
  assert.equal(state.settings.hasKey, true);
  assert.ok(!JSON.stringify(state).includes('test-only-secret'));
  assert.ok(
    !(await fs.readFile(path.join(root, 'data/state.json'), 'utf8')).includes('test-only-secret'),
  );
  assert.deepEqual(await json('/api/models', { baseUrl }), { models: ['a-model', 'z-model'] });
  await json('/api/models', { baseUrl: baseUrl + '/other' });
  assert.deepEqual(received, ['Bearer test-only-secret', undefined]);
  await json('/api/settings', { baseUrl: baseUrl + '/other', model: 'mock' });
  assert.equal(engine.apiKey, '');
  assert.equal((await request('/api/settings', { baseUrl, maxSteps: 2.5 })).status, 400);
  for (const invalid of [
    'file:///tmp',
    'https://user:pass@example.com',
    'https://example.com?key=x',
  ]) {
    assert.equal((await request('/api/settings', { baseUrl: invalid })).status, 400);
  }
});

void test('workspace and static delivery preserve file boundaries and HTTP behavior', async (t) => {
  const { json, request, workspace, url } = await fixture(t);
  await workspace.write('report.md', '# Report');
  assert.deepEqual(await json('/api/file?path=report.md'), { content: '# Report' });
  assert.equal((await request('/api/file?path=../../state.json')).status, 400);
  assert.equal((await request('/api/screenshot')).status, 404);
  assert.match(await (await request('/tasks')).text(), /Orbit test/);
  assert.equal((await request('/missing.js')).status, 404);
  assert.equal((await request('/', {})).status, 405);
  const asset = await request('/assets/app.js');
  assert.match(asset.headers.get('cache-control') || '', /immutable/);
  const head = await fetch(url + '/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await request('/%5Csecret')).status, 400);
});
