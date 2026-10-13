import type { Agent, AppState, Routine, Task } from '../../shared/types';
import { AgentModal } from '../features/agents/AgentModal';
import { RoutineModal } from '../features/routines/RoutineModal';
import { TaskModal } from '../features/tasks/TaskModal';
import { Modal } from '../components/ui/Modal';
import type { Act, AppModal, Notify, Page, SetModal } from './types';

interface Props {
  modal: AppModal | null;
  state: AppState;
  act: Act;
  setModal: SetModal;
  notify: Notify;
  navigate: (page: Page) => void;
  openTask: (id: string) => void;
}
export function AppDialogs({ modal, state, act, setModal, notify, navigate, openTask }: Props) {
  const close = () => setModal(null);
  switch (modal?.type) {
    case 'task':
      return (
        <TaskModal
          agents={state.agents}
          initialAgent={modal.agentId}
          onClose={close}
          configured={Boolean(
            state.settings.model || state.agents.find((a) => a.id === modal.agentId)?.model,
          )}
          onSettings={() => {
            close();
            navigate('Settings');
          }}
          onSubmit={async (data) => {
            const task = await act<Task>('/api/tasks', data);
            if (task) {
              close();
              openTask(task.id);
            }
          }}
        />
      );
    case 'agent':
      return (
        <AgentModal
          agent={modal.agent}
          onClose={close}
          onSubmit={async (data) => {
            const result = await act<Agent>(
              modal.agent ? `/api/agents/${modal.agent.id}` : '/api/agents',
              data,
              modal.agent ? 'PATCH' : 'POST',
            );
            if (result) {
              close();
              notify(modal.agent ? 'Bot updated' : 'Your new teammate is ready');
            }
          }}
        />
      );
    case 'routine':
      return (
        <RoutineModal
          agents={state.agents}
          onClose={close}
          onSubmit={async (data) => {
            if (await act<Routine>('/api/routines', data)) {
              close();
              notify('Routine created');
            }
          }}
        />
      );
    case 'deleteRoutine':
      return (
        <Modal title="Delete this routine?" onClose={close}>
          <p className="modal-copy">
            “{modal.routine.name}” will stop scheduling work. Its previous tasks will remain in your
            history.
          </p>
          <div className="modal-footer">
            <button className="button subtle" onClick={close}>
              Keep routine
            </button>
            <button
              className="button danger"
              onClick={async () => {
                if (await act(`/api/routines/${modal.routine.id}`, {}, 'DELETE')) close();
              }}
            >
              Delete routine
            </button>
          </div>
        </Modal>
      );
    default:
      return null;
  }
}
