/** Shared, serializable contracts. This module must never import server or UI code. */
export type TaskStatus = 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  initials: string;
  instructions: string;
  memory: string;
  model: string;
}
export type AgentInput = Pick<Agent, 'name' | 'role' | 'instructions'> & Partial<Pick<Agent, 'memory' | 'model' | 'color'>>;
export interface TaskEvent {
  id: string;
  type: 'tool' | 'result' | 'error' | 'approval' | 'message' | 'info' | 'complete';
  text: string;
  details?: unknown;
  at: string;
}
export interface Approval {
  id: string;
  name: string;
  args: Record<string, unknown>;
  at: string;
  url?: string;
}
export interface Task {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  createdAt: string;
  events: TaskEvent[];
  result: string;
  depth: number;
  routineId: string | null;
  diagnostic: boolean;
  startedAt?: string;
  finishedAt?: string;
  step?: number;
  approval?: Approval;
}
export interface Routine {
  id: string;
  name: string;
  agentId: string;
  prompt: string;
  intervalMinutes: number;
  enabled: boolean;
  nextRun: string;
  createdAt: string;
  lastRun?: string;
  lastError?: string;
}
export type RoutineInput = Pick<Routine, 'name' | 'agentId' | 'prompt'> & { intervalMinutes: string | number };
export interface ModelSettings {
  provider: string;
  baseUrl: string;
  model: string;
  maxSteps: number;
}
export interface PublicSettings extends ModelSettings { hasKey: boolean }
export type SettingsInput = ModelSettings & { apiKey?: string };
export interface BrowserLocation { taskId: string; url: string; title: string; at: string }
export interface BrowserElement { index: number; tag: string; text: string; href: string | null; type: string | null }
export interface BrowserSnapshot extends BrowserLocation { text: string; elements: BrowserElement[] }
export interface BrowserAction { action: 'click' | 'fill' | 'select'; index: number; value?: string }
export interface ComputerState { running: boolean; latest: BrowserLocation | null; workspace: string }
export interface StoredState { agents: Agent[]; tasks: Task[]; routines: Routine[]; settings: ModelSettings }
export interface AppState extends Omit<StoredState, 'settings'> { settings: PublicSettings; computer: ComputerState; serverTime: string }
export interface WorkspaceFile { name: string; path: string; directory: boolean; size: number; modified: string }
export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export interface ModelMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
