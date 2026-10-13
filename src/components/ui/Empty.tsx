import type { ReactNode } from 'react';
import { ListTodo } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Empty({
  icon: Icon = ListTodo,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
