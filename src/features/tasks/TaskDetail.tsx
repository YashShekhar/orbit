import { useState } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Square,
  Check,
  Circle,
  CircleCheck,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Orbit,
  Sparkles,
  RefreshCw,
  Copy,
  LoaderCircle,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent, Task, TaskEvent } from '../../../shared/types';
import type { Act, Notify } from '../../app/types';
import { ACTIVE_TASK_STATUSES as running } from '../../../shared/task-status';
import { time, date } from '../../lib/format';
import { Avatar } from '../../components/ui/Avatar';
import { Status } from '../../components/ui/Status';
import { Empty } from '../../components/ui/Empty';

export function TaskDetail({
  task,
  agent,
  onBack,
  act,
  notify,
  openTask,
  onFollowup,
}: {
  task: Task;
  agent?: Agent;
  onBack: () => void;
  act: Act;
  notify: Notify;
  openTask: (id: string) => void;
  onFollowup: () => void;
}) {
  const [tab, setTab] = useState('Result');
  const icons: Record<TaskEvent['type'], LucideIcon> = {
    tool: Terminal,
    result: Check,
    error: AlertCircle,
    approval: ShieldCheck,
    message: Sparkles,
    info: Circle,
    complete: CircleCheck,
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(task.result);
      notify('Result copied');
    } catch {
      notify('Clipboard is unavailable', true);
    }
  }
  return (
    <>
      <button className="text-button back" onClick={onBack}>
        <ChevronLeft size={16} /> All tasks
      </button>
      <div className="task-detail-heading">
        <div>
          <div className="task-owner">
            <Avatar agent={agent} small />
            {agent?.name}
            <ChevronRight size={14} />
            <span>{agent?.role}</span>
          </div>
          <h1>{task.title}</h1>
          <div className="task-meta">
            <Status status={task.status} />
            <span>{date(task.createdAt)}</span>
            {task.step && <span>Turn {task.step}</span>}
          </div>
        </div>
        <div className="heading-actions">
          {running.includes(task.status) ? (
            <button className="button subtle" onClick={() => act(`/api/tasks/${task.id}/stop`)}>
              <Square size={14} /> Stop task
            </button>
          ) : (
            <>
              <button
                className="button subtle"
                onClick={async () => {
                  const result = await act<Task>(`/api/tasks/${task.id}/retry`);
                  if (result) openTask(result.id);
                }}
              >
                <RefreshCw size={15} /> Run again
              </button>
              <button className="button primary" onClick={onFollowup}>
                <Plus size={15} /> Follow up
              </button>
            </>
          )}
        </div>
      </div>
      {task.approval && (
        <div className="approval-box">
          <div className="approval-title">
            <ShieldCheck size={21} />
            <div>
              <h3>Your approval is needed</h3>
              <p>
                {task.approval.name === 'run_command'
                  ? 'This command runs on your computer, outside a sandbox.'
                  : 'This action interacts with a website in the shared browser.'}
              </p>
            </div>
          </div>
          <p>{String(task.approval.args.reason || '')}</p>
          <pre>
            {task.approval.name === 'run_command'
              ? String(task.approval.args.command || '')
              : JSON.stringify(task.approval.args, null, 2)}
          </pre>
          <div className="approval-buttons">
            <button
              className="button subtle"
              onClick={() => act(`/api/tasks/${task.id}/approve`, { allowed: false })}
            >
              Decline
            </button>
            <button
              className="button primary"
              onClick={() => act(`/api/tasks/${task.id}/approve`, { allowed: true })}
            >
              <Check size={16} /> Approve action
            </button>
          </div>
        </div>
      )}
      <div className="task-detail-grid">
        <section className="panel result-panel">
          <div className="panel-heading">
            <div className="tabs">
              <button className={tab === 'Result' ? 'active' : ''} onClick={() => setTab('Result')}>
                Result
              </button>
              <button
                className={tab === 'Assignment' ? 'active' : ''}
                onClick={() => setTab('Assignment')}
              >
                Assignment
              </button>
            </div>
            {task.result && (
              <button className="icon-button" aria-label="Copy result" onClick={copy}>
                <Copy size={16} />
              </button>
            )}
          </div>
          {tab === 'Assignment' ? (
            <div className="markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{task.prompt}</Markdown>
            </div>
          ) : task.result ? (
            <div className="markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{task.result}</Markdown>
            </div>
          ) : (
            <Empty
              icon={task.status === 'failed' ? AlertCircle : Orbit}
              title={
                task.status === 'failed'
                  ? 'This task needs attention'
                  : task.status === 'cancelled'
                    ? 'Task stopped'
                    : task.status === 'interrupted'
                      ? 'Task interrupted'
                      : task.status === 'awaiting_approval'
                        ? 'Waiting for your go-ahead'
                        : task.status === 'queued'
                          ? 'Your task is in the queue'
                          : 'Your teammate is on it'
              }
            >
              {task.status === 'failed'
                ? task.events.filter((e) => e.type === 'error').at(-1)?.text
                : running.includes(task.status)
                  ? 'Follow the activity log as the work happens.'
                  : 'You can run the assignment again when you’re ready.'}
            </Empty>
          )}
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <h2>
              <Activity size={17} /> Activity log
            </h2>
            <span className="mini-label">{task.events.length} EVENTS</span>
          </div>
          <div className="activity-feed">
            {task.events.map((event) => {
              const Icon = icons[event.type] || Circle;
              return (
                <div className={`event ${event.type}`} key={event.id}>
                  <span className="event-icon">
                    <Icon size={14} />
                  </span>
                  <div>
                    <span className="event-time">{time(event.at)}</span>
                    {event.type === 'message' ? (
                      <details>
                        <summary>Agent update</summary>
                        <div className="markdown">
                          <Markdown>{event.text}</Markdown>
                        </div>
                      </details>
                    ) : (
                      <strong>{event.text}</strong>
                    )}
                    {event.details !== undefined && (
                      <details>
                        <summary>
                          {event.type === 'result' ? 'View result' : 'View details'}
                        </summary>
                        <pre>
                          {typeof event.details === 'string'
                            ? event.details
                            : JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
            {task.status === 'running' && (
              <div className="live-event">
                <LoaderCircle className="spin" size={15} /> Working on the next step…
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
