/**
 * Topbar — barra superior do BeeHive.
 */

import { useState, useEffect } from 'react';
import { Icon } from '@/components/common/Icon';
import { UsageRing } from '@/components/common/UsageRing';
import { getActiveProvider } from '@/services/settings/settingsService';
import type { Theme } from '@/theme/useTheme';
import './Topbar.css';

interface TopbarProps {
  theme: Theme;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  activeView: string;
}

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  conversation: 'Conversa',
  projects: 'Projetos',
  business: 'Negócios',
  settings: 'Configurações',
};

export function Topbar({ theme, onToggleTheme, onToggleSidebar, activeView }: TopbarProps) {
  const viewLabel = VIEW_LABELS[activeView] || 'BeeHive';
  const [modelName, setModelName] = useState<string>('carregando...');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getActiveProvider();
        if (!cancelled) {
          setModelName(info.activeModel ?? 'nenhum modelo');
        }
      } catch {
        if (!cancelled) setModelName('big-pickle');
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
          <h1 className="topbar__title">{viewLabel}</h1>
          <p className="topbar__subtitle">
            {activeView === 'conversation'
              ? 'Converse com a IA do BeeHive'
              : activeView === 'projects'
                ? 'Gerencie seus projetos locais'
                : activeView === 'dashboard'
                  ? 'Visão geral do sistema'
                  : 'Como posso ajudar você hoje?'}
          </p>
        </div>
      </div>

      <div className="topbar__actions">
        <UsageRing />
        <div className="topbar__model-badge">
          <span className="status-dot status-dot--online" />
          <span>{modelName}</span>
        </div>
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
