import test from 'node:test';
import assert from 'node:assert/strict';
import { complete } from '../../server/providers/compatible.js';
import { loadConfig } from '../../server/config.js';

const settings = {
  baseUrl: 'http://provider.test/v1',
  model: 'mock',
  provider: 'custom',
  maxSteps: 2,
};
void test('provider validates malformed responses and preserves useful HTTP errors', async (t) => {
  const fetcher = t.mock.method(globalThis, 'fetch');
  const fixtures: [unknown, number, RegExp][] = [
    [{ error: { message: 'Invalid model' } }, 400, /Invalid model/],
    [{}, 503, /HTTP 503/],
    [{ choices: [] }, 200, /empty response/],
    [{ choices: [{ message: { content: null, tool_calls: [] } }] }, 200, /empty response/],
    [
      { choices: [{ message: { content: 'Hello', tool_calls: [{ id: 'invalid' }] } }] },
      200,
      /invalid tool calls/,
    ],
  ];
  for (const [body, status, error] of fixtures) {
    fetcher.mock.mockImplementation(async () => new Response(JSON.stringify(body), { status }));
    await assert.rejects(complete([], settings, new AbortController().signal, 0, ''), error);
  }
});

void test('delegated provider requests omit delegation tools and forward authentication', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer fixture-key');
    const body = JSON.parse(String(options.body)) as { tools: { function: { name: string } }[] };
    assert.ok(!body.tools.some((tool) => tool.function.name === 'delegate_task'));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Done' } }] }));
  });
  assert.equal(
    (await complete([], settings, new AbortController().signal, 1, 'fixture-key')).content,
    'Done',
  );
});

void test('runtime configuration validates ports and provider URLs', (t) => {
  const originalPort = process.env.PORT,
    originalUrl = process.env.MODEL_BASE_URL;
  t.after(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    if (originalUrl === undefined) delete process.env.MODEL_BASE_URL;
    else process.env.MODEL_BASE_URL = originalUrl;
  });
  process.env.PORT = 'invalid';
  assert.throws(() => loadConfig(), /PORT/);
  process.env.PORT = '0';
  process.env.MODEL_BASE_URL = 'file:///tmp';
  assert.throws(() => loadConfig(), /HTTP/);
  process.env.MODEL_BASE_URL = settings.baseUrl;
  assert.equal(loadConfig().port, 0);
});
