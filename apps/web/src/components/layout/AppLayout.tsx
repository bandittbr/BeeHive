import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { Theme } from '@/theme/useTheme';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  activeArea: string;
  onSelectArea: (id: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

/**
 * Moldura da aplicação: barra lateral + barra superior + área de conteúdo.
 *
 * O layout apenas posiciona as peças; não contém regra de negócio. Gerencia
 * somente o estado visual de abrir/fechar a sidebar (útil no modo responsivo).
 */
export function AppLayout({
  children,
  activeArea,
  onSelectArea,
  theme,
  onToggleTheme,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        activeArea={activeArea}
        onSelectArea={(id) => {
          onSelectArea(id);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
      />

      {sidebarOpen && (
        <div className="app-layout__scrim" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <div className="app-layout__main">
        <Topbar
          theme={theme}
          onToggleTheme={onToggleTheme}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="app-layout__content">{children}</main>
      </div>
    </div>
  );
}
