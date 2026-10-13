import {
  Plus,
  LayoutDashboard,
  ListTodo,
  Clock3,
  FolderOpen,
  Monitor,
  Settings2,
  ChevronRight,
  ShieldCheck,
  Orbit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agent, Task, Routine } from '../../../shared/types';
import type { SetModal, Page } from '../../app/types';
import { ACTIVE_TASK_STATUSES as running } from '../../../shared/task-status';
import { Avatar } from '../ui/Avatar';

export function Sidebar({
  agents,
  tasks,
  routines,
  page,
  mobile,
  offline,
  navigate,
  setModal,
}: {
  agents: Agent[];
  tasks: Task[];
  routines: Routine[];
  page: Page;
  mobile: boolean;
  offline: boolean;
  navigate: (page: Page) => void;
  setModal: SetModal;
}) {
  const working = tasks.filter((t) => running.includes(t.status));
  const nav: [Page, LucideIcon][] = [
    ['Overview', LayoutDashboard],
    ['Tasks', ListTodo],
    ['Routines', Clock3],
    ['Workspace', FolderOpen],
    ['Computer', Monitor],
  ];
  return (
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          navigate('Overview');
        }}
      >
        <span className="brand-mark">
          <Orbit size={25} />
        </span>
        orbit<span className="brand-tag">BETA</span>
      </a>
      <div className="workspace-switch">
        <span className="workspace-avatar">Y</span>
        <div>
          My workspace<small>Personal workspace</small>
        </div>
        <ChevronRight size={14} />
      </div>
      <span className="nav-label">WORKSPACE</span>
      <nav>
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? 'active' : ''}
            onClick={() => navigate(name)}
          >
            <Icon size={18} />
            {name}
            {name === 'Tasks' && working.length > 0 && (
              <span className="nav-count">{working.length}</span>
            )}
            {name === 'Routines' && routines.filter((r) => r.enabled).length > 0 && (
              <span className="nav-count">{routines.filter((r) => r.enabled).length}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="nav-label team-label">
        YOUR BOTS
        <button
          className="icon-button"
          aria-label="Create bot"
          onClick={() => setModal({ type: 'agent' })}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="team-nav">
        {agents.map((agent) => (
          <button key={agent.id} onClick={() => setModal({ type: 'agent', agent })}>
            <Avatar agent={agent} small />
            <span>
              {agent.name}
              <small>{agent.role}</small>
            </span>
            <i className={working.some((t) => t.agentId === agent.id) ? 'working-dot' : ''} />
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="local-status">
          <span className={offline ? 'dot red' : 'dot'} />
          <div>
            {offline ? 'Server disconnected' : 'Local workspace online'}
            <small>Runs on your computer</small>
          </div>
          <Monitor size={16} />
        </div>
        <button
          className={page === 'Settings' ? 'settings-link active' : 'settings-link'}
          onClick={() => navigate('Settings')}
        >
          <Settings2 size={18} /> Settings <span>⌘</span>
        </button>
        <div className="profile">
          <span className="profile-icon">Y</span>
          <div>
            Your workspace<small>Local account</small>
          </div>
          <ShieldCheck size={17} />
        </div>
      </div>
    </aside>
  );
}
