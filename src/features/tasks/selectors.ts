import type { Task } from '../../../shared/types';
import { isActiveTask } from '../../../shared/task-status';

export const TASK_FILTERS = ['All tasks', 'In progress', 'Needs approval', 'Completed'] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];
export function selectTasks(tasks: Task[], query: string, filter: TaskFilter): Task[] {
  const search = query.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(search) &&
      (filter === 'All tasks' ||
        (filter === 'In progress' && isActiveTask(task.status)) ||
        (filter === 'Needs approval' && task.status === 'awaiting_approval') ||
        (filter === 'Completed' && task.status === 'completed')),
  );
}
