import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState } from '../../shared/types';
import { errorMessage } from '../../shared/errors';
import { api } from '../lib/api';
import type { Act, Notify } from '../app/types';

export function useWorkspace(notify: Notify) {
  const [state, setState] = useState<AppState | null>(null);
  const [offline, setOffline] = useState(false);
  const mounted = useRef(false);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    // A fresh response after a mutation must supersede any older polling request.
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    try {
      const next = await api<AppState>('/api/state', undefined, 'GET', controller.signal);
      if (mounted.current && !controller.signal.aborted) { setState(next); setOffline(false); }
    } catch {
      if (mounted.current && !controller.signal.aborted) setOffline(true);
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const interval = setInterval(() => { if (!active.current) void refresh(); }, 2000);
    return () => { mounted.current = false; clearInterval(interval); active.current?.abort(); };
  }, [refresh]);
  const act: Act = useCallback(async <T,>(url: string, data: unknown = {}, method = 'POST'): Promise<T | null> => {
    try { const result = await api<T>(url, data, method); await refresh(); return result; }
    catch (error) { notify(errorMessage(error), true); return null; }
  }, [notify, refresh]);
  return { state, offline, act };
}
