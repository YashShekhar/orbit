import type { StoredState } from '../../shared/types.js';
import { isRecord } from '../../shared/errors.js';
import { initialState } from './defaults.js';
export interface Store { state: StoredState; save: () => void; root: string }
function readState(raw: string): StoredState {
 const value: unknown = JSON.parse(raw);
 if (!isRecord(value) || !Array.isArray(value.agents) || !value.agents.length || !Array.isArray(value.tasks) || !Array.isArray(value.routines) || !isRecord(value.settings)) throw new Error('Saved workspace is invalid. Restore data/state.json from a backup.');
 return value as unknown as StoredState;
}
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export function createStore(root: string): Store {
  fs.mkdirSync(root, { recursive: true });
  const filename = path.join(root, 'state.json');

  const state: StoredState = fs.existsSync(filename) ? readState(fs.readFileSync(filename, 'utf8')) : initialState();
  const save = () => {
    fs.writeFileSync(filename + '.tmp', JSON.stringify(state, null, 2));
    fs.renameSync(filename + '.tmp', filename);
  };
  for (const task of state.tasks) {
    if (['running', 'queued', 'awaiting_approval'].includes(task.status)) {
      task.status = 'interrupted'; task.finishedAt = now();
      delete task.approval;
      task.events.push({ id: uid(), type: 'error', text: 'The server restarted. Run this task again to continue.', at: now() });
    }
  }
  save();
  return { state, save, root };
}
