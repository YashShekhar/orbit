import type { ModelMessage, ModelSettings, ToolCall } from '../../shared/types.js';
import { isRecord } from '../../shared/errors.js';
import { toolDefinitions } from '../agent/tool-definitions.js';
export async function complete(
  messages: ModelMessage[],
  settings: ModelSettings,
  signal: AbortSignal,
  depth: number,
  apiKey: string,
): Promise<ModelMessage> {
  const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      tools: toolDefinitions.filter((t) => !depth || t.function.name !== 'delegate_task'),
      stream: false,
    }),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    const message =
      isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
        ? body.error.message
        : `HTTP ${response.status}`;
    throw new Error(`Model request failed: ${String(message).slice(0, 600)}`);
  }
  const data: unknown = await response.json();
  const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
  const first: unknown = choices[0];
  const message = isRecord(first) ? first.message : undefined;
  if (
    !isRecord(message) ||
    (typeof message.content !== 'string' && !Array.isArray(message.tool_calls))
  )
    throw new Error(
      'The model returned an empty response. Check that it supports chat completions and tool calling.',
    );
  if (
    message.tool_calls !== undefined &&
    (!Array.isArray(message.tool_calls) ||
      !message.tool_calls.every(
        (call: unknown) =>
          isRecord(call) &&
          typeof call.id === 'string' &&
          isRecord(call.function) &&
          typeof call.function.name === 'string' &&
          typeof call.function.arguments === 'string',
      ))
  )
    throw new Error('The model returned invalid tool calls.');
  if (!message.content && (!Array.isArray(message.tool_calls) || !message.tool_calls.length))
    throw new Error('The model returned an empty response.');
  return {
    role: 'assistant',
    content: typeof message.content === 'string' ? message.content : null,
    ...(message.tool_calls ? { tool_calls: message.tool_calls as ToolCall[] } : {}),
  };
}
