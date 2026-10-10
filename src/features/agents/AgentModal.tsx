import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Agent, AgentInput } from '../../../shared/types';
import { Modal } from '../../components/ui/Modal';

export function AgentModal({ agent, onClose, onSubmit }: { agent?: Agent; onClose: () => void; onSubmit: (data: AgentInput) => Promise<void> }) {
  const [data, setData] = useState(agent || { name: '', role: '', instructions: '', memory: '', model: '', color: 'blue' }), [busy, setBusy] = useState(false);
  const field = (name: keyof typeof data) => ({ value: data[name], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setData({ ...data, [name]: e.target.value }) });
  return <Modal title={agent ? `Meet ${agent.name}` : 'Create a teammate'} subtitle="Give your bot a purpose. Its context grows with every task." onClose={onClose}><form onSubmit={async e => { e.preventDefault(); setBusy(true); await onSubmit(data); setBusy(false); }}><div className="form-columns"><label>Name<input required maxLength={40} placeholder="e.g. Scout" {...field('name')}/></label><label>Role<input required maxLength={80} placeholder="e.g. Market researcher" {...field('role')}/></label></div><label>Instructions<textarea required rows={4} maxLength={12000} placeholder="What should this bot do? How should it work?" {...field('instructions')}/></label><label>Persistent memory<textarea rows={3} maxLength={12000} placeholder="Preferences and context to remember across tasks" {...field('memory')}/></label><label>Model override <span className="optional">optional</span><input maxLength={200} placeholder="Use workspace default" {...field('model')}/><small>Must be available through the provider in Settings.</small></label><div className="modal-footer"><button type="button" className="button subtle" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}><Check size={16}/>{agent ? 'Save changes' : 'Create bot'}</button></div></form></Modal>;
}
