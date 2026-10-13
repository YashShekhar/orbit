import type { TaskStatus } from './types.js';

export const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = [
  'queued',
  'running',
  'awaiting_approval',
];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  awaiting_approval: 'Needs approval',
  running: 'Working',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Stopped',
  interrupted: 'Interrupted',
  queued: 'Queued',
};
export function isActiveTask(status: TaskStatus): boolean {
  return ACTIVE_TASK_STATUSES.includes(status);
}
