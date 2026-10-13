import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import type * as Application from '../../server/app.js';

void test('compiled application serves built assets and API, then shuts down cleanly', async (t) => {
  const root = process.cwd();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-production-'));
  // Import the emitted module, rather than silently testing TypeScript source through tsx.
  const moduleUrl = pathToFileURL(path.join(root, 'dist/server/app.js')).href;
  const { createApplication } = (await import(moduleUrl)) as typeof Application;
  const app = await createApplication({
    root,
    dataDir,
    staticDir: path.join(root, 'dist/client'),
    port: 0,
    dev: false,
  });
  t.after(async () => {
    await app.shutdown();
    assert.ok(dataDir.startsWith(path.resolve(os.tmpdir()) + path.sep + 'orbit-production-'));
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  app.startScheduler();
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Orbit/);
  const script = html.match(/src="(\/assets\/[^"]+\.js)"/);
  assert.ok(script, 'HTML must reference the built JavaScript bundle');
  const bundle = await fetch(base + script[1]);
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get('content-type') || '', /javascript/);
  assert.ok((await bundle.text()).length > 1000);
  assert.deepEqual(await (await fetch(base + '/api/health')).json(), {
    ok: true,
    name: 'Orbit',
    activeTasks: 0,
  });
  assert.equal((await fetch(base + '/api/state')).status, 200);
  await app.shutdown();
  await app.shutdown();
  assert.equal(app.server.listening, false);
  await assert.rejects(fetch(base));
});
