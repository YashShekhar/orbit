import { it, expect } from 'vitest';
import type { Task, TaskStatus } from '../../../shared/types';
import { selectTasks } from './selectors';

it('combines normalized text search with task lifecycle filters', () => {
  const statuses: TaskStatus[] = [
    'queued',
    'running',
    'awaiting_approval',
    'completed',
    'failed',
    'cancelled',
    'interrupted',
  ];
  const tasks: Task[] = statuses.map((status, i) => ({
    id: String(i),
    agentId: 'bot',
    title: i === 0 ? 'Write report' : 'Review report',
    prompt: 'Review',
    status,
    createdAt: '',
    events: [],
    result: '',
    depth: 0,
    routineId: null,
    diagnostic: false,
  }));
  expect(selectTasks(tasks, ' REVIEW ', 'All tasks')).toHaveLength(6);
  expect(selectTasks(tasks, '', 'In progress').map((t) => t.status)).toEqual(statuses.slice(0, 3));
  expect(selectTasks(tasks, '', 'Needs approval').map((t) => t.status)).toEqual([
    'awaiting_approval',
  ]);
  expect(selectTasks(tasks, 'review', 'Completed').map((t) => t.status)).toEqual(['completed']);
  expect(selectTasks(tasks, 'write', 'Completed')).toEqual([]);
});
