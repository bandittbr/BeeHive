import { Icon } from '@/components/common/Icon';
import type { Theme } from '@/theme/useTheme';
import './Topbar.css';

interface TopbarProps {
  theme: Theme;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
}

/**
 * Barra superior: saudação + ações globais (busca, notificações, tema).
 *
 * As ações são visuais no Sprint 1. O botão de tema funciona (troca de
 * aparência), por ser puramente apresentacional. Busca e notificações ainda
 * não têm comportamento.
 */
export function Topbar({ theme, onToggleTheme, onToggleSidebar }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={onToggleSidebar}
          aria-label="Abrir menu"
        >
          <Icon name="grid" size={20} />
        </button>
        <div className="topbar__greeting">
          <h1 className="topbar__title">
            Olá, Administrador <span aria-hidden>👋</span>
          </h1>
          <p className="topbar__subtitle">Como posso ajudar você hoje?</p>
        </div>
      </div>

      <div className="topbar__actions">
        <button type="button" className="topbar__icon-btn" aria-label="Buscar">
          <Icon name="search" size={20} />
        </button>
        <button type="button" className="topbar__icon-btn" aria-label="Notificações">
          <Icon name="bell" size={20} />
          <span className="topbar__badge">3</span>
        </button>
        <button
          type="button"
          className="topbar__icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
      </div>
    </header>
  );
}
