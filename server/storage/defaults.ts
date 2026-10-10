import { randomUUID as uid } from 'node:crypto';
import type { StoredState } from '../../shared/types.js';
export function initialState(): StoredState {
  return {
    agents: [
      { id: uid(), name: 'Atlas', role: 'Research analyst', color: 'green', initials: 'AT', instructions: 'You are Atlas, a thorough research analyst. Browse sources, compare evidence, cite URLs, and write useful research briefs to the shared workspace.', memory: '', model: '' },
      { id: uid(), name: 'Nova', role: 'Engineering partner', color: 'purple', initials: 'NO', instructions: 'You are Nova, a careful engineering partner. Inspect workspace files, implement solutions, and validate your work. Request a command only when necessary. Explain concrete results.', memory: '', model: '' },
      { id: uid(), name: 'Sage', role: 'Operations assistant', color: 'orange', initials: 'SA', instructions: 'You are Sage, an organized operations assistant. Turn messy information into clear plans, documents, and useful workspace artifacts. Remember user preferences.', memory: '', model: '' }
    ],
    tasks: [], routines: [],
    settings: { provider: 'ollama', baseUrl: 'http://localhost:11434/v1', model: '', maxSteps: 16 }
  };
}
