import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Agent, Task } from '../../../shared/types';
import { Empty } from '../../components/ui/Empty';
import { TaskRow } from './TaskRow';
import { selectTasks, TASK_FILTERS, type TaskFilter } from './selectors';

interface Props {
  tasks: Task[];
  agents: Agent[];
  openTask: (id: string) => void;
  onAssign: () => void;
}
export function TasksPage({ tasks, agents, openTask, onAssign }: Props) {
  const [filter, setFilter] = useState<TaskFilter>('All tasks');
  const [query, setQuery] = useState('');
  const visible = selectTasks(tasks, query, filter);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE WORK, IN MOTION</div>
          <h1>Tasks</h1>
          <p>Follow every assignment from first step to finished work.</p>
        </div>
        <button className="button primary" onClick={onAssign}>
          <Plus size={17} /> Assign a task
        </button>
      </div>
      <div className="task-toolbar">
        <div className="tabs">
          {TASK_FILTERS.map((tab) => (
            <button
              className={filter === tab ? 'active' : ''}
              onClick={() => setFilter(tab)}
              key={tab}
            >
              {tab}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
          />
        </label>
      </div>
      <div className="panel task-list">
        {visible.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            agent={agents.find((a) => a.id === task.agentId)}
            onClick={() => openTask(task.id)}
          />
        ))}
        {!visible.length && (
          <Empty title="Nothing here yet">
            Create an assignment and your bot will take it from here.
          </Empty>
        )}
      </div>
    </>
  );
}
