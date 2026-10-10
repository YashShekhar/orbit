import type { TaskStatus } from '../../../shared/types';
import { TASK_STATUS_LABELS } from '../../../shared/task-status';

export function Status({ status }: { status: TaskStatus }) { const labels = TASK_STATUS_LABELS; return <span className={`status ${status}`}><i />{labels[status] || status}</span>; }
