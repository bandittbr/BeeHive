import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconName;
  onSelect: () => void;
}

interface MenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  ariaLabel?: string;
}

/**
 * Menu suspenso (dropdown). Abre ao clicar no `trigger` e fecha ao clicar fora
 * ou ao escolher um item.
 */
export function Menu({ trigger, items, ariaLabel = 'Menu' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {trigger}
      </button>

      {open && (
        <div className="menu__list" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="menu__item"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon && <Icon name={item.icon} size={16} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
