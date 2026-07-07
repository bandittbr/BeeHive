interface LoadingProps {
  variant?: 'spinner' | 'dots';
  label?: string;
}

/** Indicadores de carregamento: `spinner` (genérico) ou `dots` (digitando). */
export function Loading({ variant = 'spinner', label }: LoadingProps) {
  if (variant === 'dots') {
    return (
      <span className="typing" role="status" aria-label={label ?? 'Carregando'}>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
    );
  }

  return <span className="spinner" role="status" aria-label={label ?? 'Carregando'} />;
}
