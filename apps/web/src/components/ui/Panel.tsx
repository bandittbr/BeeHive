import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Seção com cabeçalho opcional (título + ações) e corpo. */
export function Panel({ title, actions, children, className }: PanelProps) {
  return (
    <section className={['panel', className ?? ''].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <header className="panel__header">
          {title && <h3 className="panel__title">{title}</h3>}
          {actions}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}
