import type { AgentEngine } from './engine.js';
import { errorMessage } from '../../shared/errors.js';
import { now } from '../storage/store.js';
export function runDueRoutines(engine: AgentEngine) {
  for (const routine of engine.store.state.routines) {
    if (!routine.enabled || Date.parse(routine.nextRun) > Date.now()) continue;
    if (
      engine.store.state.tasks.some(
        (t) =>
          t.routineId === routine.id &&
          ['running', 'queued', 'awaiting_approval'].includes(t.status),
      )
    )
      continue;
    routine.nextRun = new Date(Date.now() + routine.intervalMinutes * 60000).toISOString();
    try {
      engine.createTask(routine.agentId, routine.prompt, { routineId: routine.id });
      routine.lastRun = now();
    } catch (error) {
      routine.lastError = errorMessage(error);
    }
    engine.changed();
  }
}
