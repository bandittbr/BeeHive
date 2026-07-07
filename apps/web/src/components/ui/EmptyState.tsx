import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vazio padrão: ícone, título, texto e ação opcional. */
export function EmptyState({ icon = 'info', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden>
        <Icon name={icon} size={24} />
      </span>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__text">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
