import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

/** Rótulo compacto para estados e categorias. */
export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="badge__dot" aria-hidden />}
      {children}
    </span>
  );
}
