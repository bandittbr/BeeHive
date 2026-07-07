import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
}

const ICONS: Record<AlertVariant, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'warning',
};

/** Mensagem destacada de status (informação, sucesso, atenção, erro). */
export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div className={`alert alert--${variant}`} role="status">
      <span className="alert__icon">
        <Icon name={ICONS[variant]} size={18} />
      </span>
      <div>
        {title && <div className="alert__title">{title}</div>}
        {children && <div className="alert__text">{children}</div>}
      </div>
    </div>
  );
}
