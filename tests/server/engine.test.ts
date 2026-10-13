import type { AddressInfo } from 'node:net';
import test, { type TestContext } from 'node:test';
import type { ToolCall, ModelMessage } from '../../shared/types.js';
import { BrowserComputer } from '../../server/tools/browser.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createStore } from '../../server/storage/store.js';
import { Workspace } from '../../server/tools/workspace.js';
import { AgentEngine } from '../../server/agent/engine.js';

async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-test-'));
  const store = createStore(dir),
    workspace = new Workspace(path.join(dir, 'workspace'));
  await fs.mkdir(workspace.root, { recursive: true });
  const engine = new AgentEngine(store, workspace, new BrowserComputer(dir));
  engine.apiKey = '';
  t.after(async () => {
    await engine.shutdown();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'orbit-test-'));
    await fs.rm(dir, { recursive: true, force: true });
  });
  return { dir, store, workspace, engine, agent: store.state.agents[0] };
}
async function until(fn: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for task state');
    await new Promise((r) => setTimeout(r, 20));
  }
}
function call(name: string, args: Record<string, unknown>, id = 'call_1'): ToolCall {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}
function assistant(content: string | null, calls?: ToolCall[]): ModelMessage {
  return { role: 'assistant', content, ...(calls ? { tool_calls: calls } : {}) };
}

void test('shutdown cancels active and queued tasks and waits for persistence', async (t) => {
  const { engine, store, agent, dir } = await fixture(t);
  store.state.settings.model = 'mock';
  engine.completion = async (_messages, _settings, signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    });
  const first = engine.createTask(agent.id, 'Active');
  const second = engine.createTask(agent.id, 'Queued');
  await until(() => first.status === 'running');
  await engine.shutdown();
  assert.equal(engine.active.size, 0);
  assert.equal(first.status, 'cancelled');
  assert.equal(second.status, 'cancelled');
  assert.ok(createStore(dir).state.tasks.every((task) => task.status === 'cancelled'));
  assert.throws(() => engine.createTask(agent.id, 'Too late'), /shutting down/);
});

void test('tool errors reach the model and unbounded tool loops stop at the configured limit', async (t) => {
  const { engine, store, agent } = await fixture(t);
  store.state.settings.model = 'mock';
  store.state.settings.maxSteps = 2;
  let count = 0;
  engine.completion = async (messages) => {
    if (++count === 2) assert.match(messages.at(-1)?.content || '', /Unknown tool/);
    return assistant(null, [call('not_a_tool', {})]);
  };
  const task = engine.createTask(agent.id, 'Exercise tool failure');
  await until(() => task.status === 'failed');
  assert.equal(count, 2);
  assert.match(task.events.at(-1)?.text || '', /Step limit/);
});

void test('workspace writes and reads files but rejects traversal and symlinks', async (t) => {
  const { workspace, dir } = await fixture(t);
  await workspace.write('reports/brief.md', '# Actual output');
  assert.equal(await workspace.read('reports/brief.md'), '# Actual output');
  assert.equal((await workspace.list('reports'))[0].name, 'brief.md');
  await assert.rejects(() => workspace.read('../../state.json'), /outside/);
  await assert.rejects(() => workspace.write('C:/temp/test', 'x'), /relative/);
  await assert.rejects(() => workspace.write('large.txt', 'a'.repeat(256001)), /250 KB/);
  const outside = path.join(dir, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(
    outside,
    path.join(workspace.root, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(() => workspace.write('linked/leak.txt', 'blocked'), /Symbolic links/);
});

void test('agent loop calls a compatible provider, writes an artifact, remembers context and persists a result', async (t) => {
  const { store, workspace, engine, agent, dir } = await fixture(t);
  let calls = 0;
  const provider = http.createServer((req, res) => {
    void (async () => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw) as {
        model: string;
        tools: { function: { name: string } }[];
        messages: ModelMessage[];
      };
      assert.equal(req.url, '/v1/chat/completions');
      assert.equal(body.model, 'test-model');
      assert.ok(body.tools.some((t) => t.function.name === 'browse_page'));
      calls++;
      if (calls === 2) assert.equal(body.messages.filter((m) => m.role === 'tool').length, 2);
      const message =
        calls === 1
          ? assistant('Creating the requested brief.', [
              call('write_file', { path: 'brief.md', content: '# Verified artifact' }),
              call('remember', { memory: 'Prefers concise briefs.' }, 'call_2'),
            ])
          : assistant('Saved brief.md.');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message }] }));
    })().catch((error) => res.destroy(error as Error));
  });
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => provider.close(() => resolve())));
  store.state.settings = {
    provider: 'custom',
    baseUrl: `http://127.0.0.1:${(provider.address() as AddressInfo).port}/v1`,
    model: 'test-model',
    maxSteps: 4,
  };
  const task = engine.createTask(agent.id, 'Create a brief and remember my preference.');
  await until(() => task.status === 'completed' || task.status === 'failed');
  assert.equal(task.status, 'completed');
  assert.equal(calls, 2);
  assert.equal(await workspace.read('brief.md'), '# Verified artifact');
  assert.equal(agent.memory, 'Prefers concise briefs.');
  assert.equal(createStore(dir).state.tasks[0].result, 'Saved brief.md.');
});

void test('shell tool does not execute until approved and can be declined', async (t) => {
  const { engine, store, agent, workspace } = await fixture(t);
  store.state.settings.model = 'mock';
  let count = 0;
  engine.completion = async () =>
    ++count === 1
      ? assistant(null, [
          call('run_command', {
            command:
              process.platform === 'win32'
                ? 'Set-Content -LiteralPath proof.txt -Value approved'
                : 'printf approved > proof.txt',
            reason: 'Write proof of approval.',
          }),
        ])
      : assistant('Done');
  const task = engine.createTask(agent.id, 'Test approval');
  await until(() => task.status === 'awaiting_approval');
  await assert.rejects(() => workspace.read('proof.txt'), /ENOENT/);
  assert.ok(task.approval);
  engine.approve(task.approval.id, false);
  await until(() => task.status === 'completed');
  await assert.rejects(() => workspace.read('proof.txt'), /ENOENT/);
  count = 0;
  const approved = engine.createTask(agent.id, 'Approve a harmless command');
  await until(() => approved.status === 'awaiting_approval');
  assert.ok(approved.approval);
  engine.approve(approved.approval.id, true);
  await until(() => approved.status === 'completed', 15000);
  assert.match(await workspace.read('proof.txt'), /approved/);
});

void test('cancelling pending approval prevents execution and releases the bot queue', async (t) => {
  const { engine, store, agent } = await fixture(t);
  store.state.settings.model = 'mock';
  let count = 0;
  engine.completion = async () =>
    ++count === 1
      ? assistant(null, [
          call('run_command', { command: 'echo cancelled', reason: 'Check cancellation.' }),
        ])
      : assistant('Second task finished');
  const first = engine.createTask(agent.id, 'First');
  const second = engine.createTask(agent.id, 'Second');
  await until(() => first.status === 'awaiting_approval');
  assert.equal(second.status, 'queued');
  engine.stop(first.id);
  await until(() => second.status === 'completed');
  assert.equal(first.status, 'cancelled');
  assert.equal(engine.approvals.size, 0);
});

void test('routines coalesce missed runs, skip active jobs and persist pause state', async (t) => {
  const { engine, store, agent } = await fixture(t);
  store.state.routines.push({
    id: 'routine',
    name: 'Review',
    agentId: agent.id,
    prompt: 'Review files',
    enabled: true,
    intervalMinutes: 60,
    nextRun: new Date(0).toISOString(),
    createdAt: new Date().toISOString(),
  });
  engine.drain = () => {};
  engine.tick();
  engine.tick();
  assert.equal(store.state.tasks.length, 1);
  assert.equal(store.state.tasks[0].routineId, 'routine');
  store.state.routines[0].nextRun = new Date(0).toISOString();
  engine.tick();
  assert.equal(store.state.tasks.length, 1);
  store.state.tasks[0].status = 'completed';
  store.state.routines[0].enabled = false;
  engine.tick();
  assert.equal(store.state.tasks.length, 1);
});

void test('restart marks unfinished tasks interrupted instead of silently re-running actions', async (t) => {
  const { store, dir } = await fixture(t);
  {
    const task = {
      id: 'pending',
      agentId: store.state.agents[0].id,
      title: 'Pending',
      prompt: 'Pending',
      status: 'awaiting_approval' as const,
      events: [],
      result: '',
      depth: 0,
      routineId: null,
      diagnostic: false,
      createdAt: new Date().toISOString(),
    };
    store.state.tasks.push(task);
  }
  store.save();
  const restored = createStore(dir);
  assert.equal(restored.state.tasks[0].status, 'interrupted');
});
