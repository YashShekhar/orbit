import type { Agent, Routine } from '../../shared/types';

export type Page = 'Overview' | 'Tasks' | 'Routines' | 'Workspace' | 'Computer' | 'Settings';
export type AppModal = { type: 'task'; agentId?: string } | { type: 'agent'; agent?: Agent } | { type: 'routine' } | { type: 'deleteRoutine'; routine: Routine };
export type SetModal = (modal: AppModal | null) => void;
export type Notify = (text: string, error?: boolean) => void;
export type Act = <T = unknown>(url: string, data?: unknown, method?: string) => Promise<T | null>;
