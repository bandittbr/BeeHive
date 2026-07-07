import { Icon } from '@/components/common/Icon';
import { NAV_ITEMS } from '@/data/navigation';
import './Sidebar.css';

interface SidebarProps {
  activeArea: string;
  onSelectArea: (id: string) => void;
  open: boolean;
}

/**
 * Barra lateral de navegação entre as Áreas.
 *
 * No Sprint 1 a navegação é puramente visual: selecionar um item destaca-o,
 * mas nenhuma Área (além da Conversa) tem tela própria ainda.
 */
export function Sidebar({ activeArea, onSelectArea, open }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <img className="sidebar__logo" src="/beehive.svg" alt="" width={32} height={32} />
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">BeeHive</span>
          <span className="sidebar__brand-tag">Sistema Operacional de IA</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Áreas">
        <ul>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeArea;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelectArea(item.id)}
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__avatar" aria-hidden>
          A
        </div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">Administrador</span>
          <span className="sidebar__user-plan">Plano Ultimate</span>
        </div>
      </div>
    </aside>
  );
}
