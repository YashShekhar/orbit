import type { Agent, Task } from '../../shared/types.js';
import type { AgentEngine } from './engine.js';
import { text, optionalText } from '../http/validation.js';
import { parseBrowserAction } from '../tools/browser.js';
import { executeCommand } from '../tools/command.js';
export async function executeTool(engine: AgentEngine, task: Task, agent: Agent, name: string, args: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
    let result;
    switch (name) {
      case 'list_files': result = await engine.workspace.list(args.path === undefined ? '.' : text(args.path, 2000, 'directory')); break;
      case 'read_file': result = await engine.workspace.read(text(args.path, 2000, 'file path')); break;
      case 'write_file': result = await engine.workspace.write(text(args.path, 2000, 'file path'), optionalText(args.content, 256000, 'file contents')); break;
      case 'browse_page': result = await engine.browser.navigate(task.id, text(args.url, 8000, 'URL')); break;
      case 'browser_action': result = await engine.browser.act(task.id, parseBrowserAction(args)); break;
      case 'run_command': result = await executeCommand(text(args.command, 12000, 'command'), engine.workspace.root, signal); break;
      case 'remember':
        if (typeof args.memory !== 'string' || args.memory.length > 12000) throw new Error('Memory limit is 12,000 characters.');
        agent.memory = args.memory; result = 'Memory saved.'; break;
      case 'delegate_task': {
        if (task.depth || args.agentId === task.agentId) throw new Error('Only top-level tasks can delegate to another bot.');
        if (task.events.filter(e => e.type === 'tool' && e.text === 'delegate task').length > 3) throw new Error('Delegation limit reached.');
        const delegated = engine.createTask(text(args.agentId, 100, 'bot ID'), text(args.prompt, 24000, 'prompt'), { depth: 1 }); result = { taskId: delegated.id, status: delegated.status }; break;
      }
      case 'task_status': { const found = engine.store.state.tasks.find(t => t.id === args.taskId); result = found ? { status: found.status, result: found.result } : { error: 'Task not found.' }; break; }
      default: throw new Error(`Unknown tool: ${name}`);
    }

 return result;
}
