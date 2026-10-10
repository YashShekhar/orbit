import { buildMessages } from './context.js';
import { executeTool } from './tool-executor.js';
import type { Agent, Task, TaskEvent, ModelMessage, ModelSettings, BrowserSnapshot } from '../../shared/types.js';
import type { Store } from '../storage/store.js';
import type { Workspace } from '../tools/workspace.js';
import type { BrowserComputer } from '../tools/browser.js';
import { errorMessage } from '../../shared/errors.js';
import { record } from '../http/validation.js';
import { uid, now } from '../storage/store.js';
import { complete } from '../providers/compatible.js';
import { runDueRoutines } from './scheduler.js';
export class AgentEngine {
  stopping = false;
  store: Store; workspace: Workspace; browser: BrowserComputer; onChange: () => void; apiKey: string; diagnosticUrl?: string;
  active = new Map<string, { controller: AbortController; agentId: string }>();
  approvals = new Map<string, (allowed: boolean) => void>();
  constructor(store: Store, workspace: Workspace, browser: BrowserComputer, onChange: () => void = () => {}) {
    this.store = store; this.workspace = workspace; this.browser = browser; this.onChange = onChange;
    this.apiKey = process.env.MODEL_API_KEY || '';
  }
  changed() { this.store.save(); this.onChange(); }
  event(task: Task, type: TaskEvent['type'], text: string, details?: unknown) { task.events.push({ id: uid(), type, text, details, at: now() }); this.changed(); }
  configured() { const s = this.store.state.settings; return Boolean(s.model && s.baseUrl); }
  createTask(agentId: string, prompt: string, options: { depth?: number; routineId?: string; diagnostic?: boolean } = {}): Task {
    const agent = this.store.state.agents.find(a => a.id === agentId);
    if (!agent) throw new Error('Bot not found.');
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('Enter a task of 1–24,000 characters.');
    if (this.store.state.tasks.filter(t => ['queued','running','awaiting_approval'].includes(t.status)).length >= 20) throw new Error('The queue is full. Finish or stop a task first.');
    const task: Task = { id: uid(), agentId, title: prompt.trim().split('\n')[0].slice(0, 85), prompt: prompt.trim(), status: 'queued', createdAt: now(), events: [], result: '', depth: options.depth || 0, routineId: options.routineId || null, diagnostic: Boolean(options.diagnostic) };
    this.store.state.tasks.unshift(task); this.changed();
    queueMicrotask(() => this.drain());
    return task;
  }
  drain() {
    if (this.stopping) return;
    for (const task of this.store.state.tasks.filter(t => t.status === 'queued').reverse()) {
      if (this.active.size >= 3) return;
      if ([...this.active.values()].some(a => a.agentId === task.agentId)) continue;
      void this.run(task);
    }
  }
  async requestApproval(task: Task, name: string, args: Record<string, unknown>, signal: AbortSignal): Promise<boolean> {
    const approval = { id: uid(), name, args, at: now(), ...(name === 'browser_action' ? { url: this.browser.pages?.get(task.id)?.url() } : {}) };
    task.approval = approval; task.status = 'awaiting_approval';
    this.event(task, 'approval', `${name === 'run_command' ? 'Command' : 'Browser action'} needs your approval`, args);
    return new Promise((resolve, reject) => {
      const abort = () => { this.approvals.delete(approval.id); delete task.approval; reject(new Error('Task stopped.')); };
      this.approvals.set(approval.id, allowed => {
        signal.removeEventListener('abort', abort); delete task.approval; task.status = 'running';
        this.approvals.delete(approval.id); this.event(task, 'info', allowed ? 'Action approved by you' : 'Action declined by you'); resolve(allowed);
      });
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  approve(id: string, allowed: boolean) { const approval = this.approvals.get(id); if (!approval) throw new Error('This approval is no longer pending.'); approval(allowed); }
  stop(id: string) {
    const task = this.store.state.tasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found.');
    if (!['queued','running','awaiting_approval'].includes(task.status)) return;
    task.status = 'cancelled'; task.finishedAt = now(); this.active.get(id)?.controller.abort();
    this.event(task, 'info', 'Task stopped by you');
    this.browser.closePage(id).catch(() => {});
  }
  async useTool(task: Task, agent: Agent, name: string, args: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    if (name === 'run_command' || name === 'browser_action') {
      if (!await this.requestApproval(task, name, args, signal)) return { denied: true, message: 'The user declined. Do not retry the same action.' };
      signal.throwIfAborted();
    }
    this.event(task, 'tool', name.replaceAll('_', ' '), args);
    const result = await executeTool(this, task, agent, name, args, signal);
    this.event(task, 'result', `${name.replaceAll('_', ' ')} finished`, typeof result === 'string' ? result.slice(0, 18000) : result);
    return result;
  }
  completion(messages: ModelMessage[], settings: ModelSettings, signal: AbortSignal, depth: number): Promise<ModelMessage> { return complete(messages, settings, signal, depth, this.apiKey); }
  async run(task: Task) {
    const controller = new AbortController();
    this.active.set(task.id, { controller, agentId: task.agentId });
    const agent = this.store.state.agents.find(a => a.id === task.agentId);
    task.status = 'running'; task.startedAt = now(); this.changed();
    try {
      if (!agent) throw new Error('Bot not found.');
      if (task.diagnostic) {
        this.event(task, 'info', 'Running a built-in system check. No AI model is used.');
        await this.useTool(task, agent, 'write_file', { path: 'system-check.md', content: `# Orbit system check\n\nCreated: ${now()}\n\nShared workspace write/read verified.\n` }, controller.signal);
        await this.useTool(task, agent, 'read_file', { path: 'system-check.md' }, controller.signal);
        const page = await this.useTool(task, agent, 'browse_page', { url: this.diagnosticUrl || 'https://example.com' }, controller.signal) as BrowserSnapshot;
        task.result = `## Your workspace is ready\n\n- Created and read **system-check.md** in the shared workspace.\n- Opened **${page.title}** in the agent browser.\n- Saved this task and its activity log.\n\nThis was a built-in system check, not an AI-generated task. Connect a model in **Settings** to start assigning work.`;
      } else {
        const settings = { ...this.store.state.settings, model: agent.model || this.store.state.settings.model };
        if (!settings.model) throw new Error('Connect a model in Settings first. Enter a provider URL and a tool-capable model ID.');
        const messages = buildMessages(agent, task, settings, this.store.state);
        this.event(task, 'info', `${agent.name} started with ${settings.model}`);
        let finished = false;
        for (let step = 0; step < settings.maxSteps; step++) {
          controller.signal.throwIfAborted();
          task.step = step + 1; this.changed();
          const message = await this.completion(messages, settings, controller.signal, task.depth);
          messages.push({ role: 'assistant', content: message.content || null, ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}) });
          if (message.content) this.event(task, 'message', message.content);
          if (!message.tool_calls?.length) { task.result = message.content || ''; finished = true; break; }
          if (message.tool_calls.length > 12) throw new Error('Model requested too many tools in one turn.');
          for (const call of message.tool_calls) {
            controller.signal.throwIfAborted();
            let result;
            try { result = await this.useTool(task, agent, call.function.name, record(JSON.parse(call.function.arguments || '{}')), controller.signal); }
            catch (error) { if (controller.signal.aborted) throw error; result = { error: errorMessage(error) }; this.event(task, 'error', errorMessage(error)); }
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 24000) });
          }
        }
        if (!finished) throw new Error('Step limit reached. Review the activity and assign a smaller follow-up task.');
      }
      controller.signal.throwIfAborted();
      task.status = 'completed'; this.event(task, 'complete', 'Task completed');
    } catch (error) {
      task.status = controller.signal.aborted ? 'cancelled' : 'failed';
      if (!controller.signal.aborted) this.event(task, 'error', errorMessage(error));
    } finally {
      task.finishedAt = now(); delete task.approval; this.active.delete(task.id); this.changed(); this.drain();
      if (this.browser.pages) {
        for (const id of this.browser.pages.keys()) {
          if (!this.active.has(id) && id !== this.browser.latest?.taskId) this.browser.closePage(id).catch(() => {});
        }
      }
    }
  }
  tick() { runDueRoutines(this); }
}
