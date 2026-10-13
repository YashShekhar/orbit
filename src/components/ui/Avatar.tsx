import type { Agent } from '../../../shared/types';

export function Avatar({ agent, small = false }: { agent?: Agent; small?: boolean }) {
  return (
    <span className={`avatar ${agent?.color || 'green'} ${small ? 'small' : ''}`}>
      {agent?.initials || 'OR'}
    </span>
  );
}
