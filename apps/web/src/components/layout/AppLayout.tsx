import { useState, type ReactNode } from 'react';
import { BeeHiveSidebar } from './BeeHiveSidebar';
import { Topbar } from './Topbar';
import type { Theme } from '@/theme/useTheme';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  activeView: string;
  activeBusinessTab?: string;
  onNavigate: (view: string) => void;
  onBusinessTabChange?: (tab: string) => void;
  onOpenCowork?: (projectId: string, projectName: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function AppLayout({
  children,
  activeView,
  activeBusinessTab,
  onNavigate,
  onBusinessTabChange,
  onOpenCowork,
  theme,
  onToggleTheme,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <BeeHiveSidebar
          activeView={activeView}
          activeBusinessTab={activeBusinessTab}
          onNavigate={onNavigate}
          onBusinessTabChange={onBusinessTabChange}
          onOpenCowork={onOpenCowork}
        />
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
