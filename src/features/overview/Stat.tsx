import type { LucideIcon } from 'lucide-react';

export function Stat({
  label,
  value,
  icon: Icon,
  note,
  highlight,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className="stat">
      <div>
        {label}
        <Icon size={17} />
      </div>
      <strong className={highlight ? 'accent' : ''}>{String(value).padStart(2, '0')}</strong>
      <small>{note}</small>
    </div>
  );
}
