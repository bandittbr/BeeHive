/**
 * AppLayout — moldura principal do BeeHive.
 *
 * Sidebar à esquerda (navegação), topbar no topo, conteúdo no centro.
 */

import { useState, type ReactNode } from 'react';
import { BeeHiveSidebar } from './BeeHiveSidebar';
import { Topbar } from './Topbar';
import type { Theme } from '@/theme/useTheme';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function AppLayout({
  children,
  activeView,
  onNavigate,
  theme,
  onToggleTheme,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <BeeHiveSidebar activeView={activeView} onNavigate={onNavigate} />
      )}

      <div className="app-layout__main">
        <Topbar
          theme={theme}
          onToggleTheme={onToggleTheme}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          activeView={activeView}
        />
        <main className="app-layout__content">{children}</main>
      </div>
    </div>
  );
}
