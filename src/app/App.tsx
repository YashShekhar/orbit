import { useState } from 'react';
import { AlertCircle, Orbit } from 'lucide-react';
import type { Task } from '../../shared/types';
import { useToast } from '../hooks/useToast';
import { useWorkspace } from '../hooks/useWorkspace';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { Toast } from '../components/ui/Toast';
import { OverviewPage } from '../features/overview/OverviewPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { TaskDetail } from '../features/tasks/TaskDetail';
import { RoutinesPage } from '../features/routines/RoutinesPage';
import { WorkspaceView } from '../features/workspace/WorkspacePage';
import { ComputerView } from '../features/computer/ComputerPage';
import { SettingsView } from '../features/settings/SettingsPage';
import { AppDialogs } from './AppDialogs';
import type { AppModal, Page } from './types';

export function App() {
  const { toast, notify, dismiss } = useToast();
  const { state, offline, act } = useWorkspace(notify);
  const [page, setPage] = useState<Page>('Overview');
  const [modal, setModal] = useState<AppModal | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const navigate = (next: Page) => {
    setPage(next);
    setSelected(null);
    setMobile(false);
  };
  const openTask = (id: string) => {
    setSelected(id);
    setPage('Tasks');
  };
  const diagnostic = async () => {
    const result = await act<Task>('/api/diagnostic');
    if (result) openTask(result.id);
  };
  if (!state)
    return (
      <div className="loading">
        <Orbit size={44} />
        <h2>Opening your workspace</h2>
        <p>
          {offline
            ? 'Cannot reach the server. Start it with npm start, then refresh.'
            : 'Your team will be right here.'}
        </p>
      </div>
    );
  const { agents, tasks, routines, settings, computer } = state;
  const task = tasks.find((t) => t.id === selected);
  return (
    <div className="app">
      {mobile && (
        <button
          type="button"
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <Sidebar
        agents={agents}
        tasks={tasks}
        routines={routines}
        page={page}
        mobile={mobile}
        offline={offline}
        navigate={navigate}
        setModal={setModal}
      />
      <main className="main">
        <Topbar page={page} offline={offline} navigate={navigate} setMobile={setMobile} />
        {offline && (
          <div className="offline-banner" role="status">
            <AlertCircle size={16} /> Connection lost. Your latest saved data is shown.
            Reconnecting…
          </div>
        )}
        <div className="content">
          {page === 'Overview' && (
            <OverviewPage
              agents={agents}
              tasks={tasks}
              routines={routines}
              settings={settings}
              navigate={navigate}
              setModal={setModal}
              openTask={openTask}
            />
          )}
          {page === 'Tasks' &&
            (task ? (
              <TaskDetail
                task={task}
                agent={agents.find((a) => a.id === task.agentId)}
                onBack={() => setSelected(null)}
                act={act}
                notify={notify}
                openTask={openTask}
                onFollowup={() => setModal({ type: 'task', agentId: task.agentId })}
              />
            ) : (
              <TasksPage
                tasks={tasks}
                agents={agents}
                openTask={openTask}
                onAssign={() => setModal({ type: 'task' })}
              />
            ))}
          {page === 'Routines' && (
            <RoutinesPage
              agents={agents}
              routines={routines}
              act={act}
              openTask={openTask}
              setModal={setModal}
            />
          )}
          {page === 'Workspace' && <WorkspaceView notify={notify} />}
          {page === 'Computer' && <ComputerView computer={computer} diagnostic={diagnostic} />}
          {page === 'Settings' && <SettingsView settings={settings} act={act} notify={notify} />}
        </div>
      </main>
      {toast && <Toast {...toast} onDismiss={dismiss} />}
      <AppDialogs
        modal={modal}
        state={state}
        act={act}
        setModal={setModal}
        notify={notify}
        navigate={navigate}
        openTask={openTask}
      />
    </div>
  );
}
