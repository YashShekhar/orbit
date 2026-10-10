import { ChevronRight } from 'lucide-react';
import type { Agent, Task } from '../../../shared/types';
import { date } from '../../lib/format';
import { Avatar } from '../../components/ui/Avatar';
import { Status } from '../../components/ui/Status';

export function TaskRow({ task, agent, onClick }: { task: Task; agent?: Agent; onClick: () => void }) { return <button className="task-row" onClick={onClick}><Avatar agent={agent} small/><div className="task-row-main"><strong>{task.title}</strong><small>{agent?.name} <span>·</span> {date(task.createdAt)} {task.diagnostic && <span>· System check</span>}</small></div><Status status={task.status}/><ChevronRight size={16}/></button>; }
