import type { InputHTMLAttributes } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: IconName;
}

/** Campo de entrada de texto com rótulo e ícone opcionais. */
export function Input({ label, icon, id, className, ...rest }: InputProps) {
  return (
    <label className={['field', className ?? ''].filter(Boolean).join(' ')} htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <span className="field__control">
        {icon && (
          <span className="field__icon">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input id={id} className="input" {...rest} />
      </span>
    </label>
  );
}
