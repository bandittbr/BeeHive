import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

/** Contêiner visual padrão. Use `interactive` para feedback de hover/clique. */
export function Card({ interactive = false, children, className, ...rest }: CardProps) {
  const classes = ['card', interactive ? 'card--interactive' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
