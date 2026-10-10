import { useCallback, useEffect, useState } from 'react';
import type { Notify } from '../app/types';

export function useToast() {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const notify: Notify = useCallback((text, error = false) => setToast({ text, error }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  return { toast, notify, dismiss: () => setToast(null) };
}
