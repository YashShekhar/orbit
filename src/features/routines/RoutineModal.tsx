import { useState } from 'react';
import { Clock3 } from 'lucide-react';
import type { Agent, RoutineInput } from '../../../shared/types';
import { Modal } from '../../components/ui/Modal';

export function RoutineModal({
  agents,
  onClose,
  onSubmit,
}: {
  agents: Agent[];
  onClose: () => void;
  onSubmit: (data: RoutineInput) => Promise<void>;
}) {
  const [data, setData] = useState({
      name: '',
      agentId: agents[0].id,
      prompt: '',
      intervalMinutes: '1440',
    }),
    [busy, setBusy] = useState(false);
  const field = (name: keyof typeof data) => ({
    value: data[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setData({ ...data, [name]: e.target.value }),
  });
  return (
    <Modal
      title="Make good work a routine"
      subtitle="Your bot takes care of the repeats."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSubmit(data);
          setBusy(false);
        }}
      >
        <label>
          Routine name
          <input
            required
            maxLength={80}
            placeholder="e.g. Daily industry brief"
            {...field('name')}
          />
        </label>
        <div className="form-columns">
          <label>
            Teammate
            <select {...field('agentId')}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Repeat every
            <select {...field('intervalMinutes')}>
              <option value="1">1 minute</option>
              <option value="15">15 minutes</option>
              <option value="60">Hour</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
              <option value="10080">7 days</option>
            </select>
          </label>
        </div>
        <label>
          Assignment
          <textarea
            required
            rows={5}
            maxLength={24000}
            placeholder="Describe the recurring task and the result you expect…"
            {...field('prompt')}
          />
        </label>
        <div className="form-note">
          <Clock3 size={16} /> First run starts after one interval. Keep the server running.
        </div>
        <div className="modal-footer">
          <button type="button" className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            <Clock3 size={16} /> Create routine
          </button>
        </div>
      </form>
    </Modal>
  );
}
