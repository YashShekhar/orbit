import { AlertCircle, CircleCheck, X } from 'lucide-react';

export function Toast({
  text,
  error,
  onDismiss,
}: {
  text: string;
  error: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className={`toast ${error ? 'error' : ''}`} role="status">
      {error ? <AlertCircle size={18} /> : <CircleCheck size={18} />}
      <span>{text}</span>
      <button className="icon-button" aria-label="Dismiss notification" onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
