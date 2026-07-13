/**
 * Raiz da aplicação BeeHive.
 *
 * Integra:
 * - Navegação por views (dashboard, conversation, projects, business, settings)
 * - Sistema de projetos (diretórios locais)
 * - Tema claro/escuro
 * - Serviço de conversa
 * - Sub-navegação de Negócios (Projetos, Afiliados, Meus Produtos, Criador de Conteúdo)
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AreaScreen, AREA_IDS } from '@/app/areas';
import { useHashRoute } from '@/app/router/useHashRoute';
import { useTheme } from '@/theme/useTheme';
import { ConversationServiceProvider } from '@/services/conversation/ConversationServiceContext';
import { runtimeConversationService } from '@/services/conversation/runtimeConversationService';
import { ConversationStoreProvider } from '@/features/conversation/ConversationStore';
import { ProjectStoreProvider } from '@/services/projects/ProjectStoreProvider';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { BusinessView } from '@/features/business/BusinessView';
import { SettingsView } from '@/features/settings/SettingsView';
import { DashboardView } from '@/features/dashboard/DashboardView';

type ViewType = 'dashboard' | 'conversation' | 'projects' | 'business' | 'settings';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { id, navigate } = useHashRoute(AREA_IDS, 'conversa');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeBusinessTab, setActiveBusinessTab] = useState<string>('projetos');

  const handleNavigate = (view: string) => {
    setActiveView(view as ViewType);
    if (view === 'conversation') {
      navigate('conversa');
    }
  };

  const handleBusinessTabChange = (tab: string) => {
    setActiveBusinessTab(tab);
  };

  const renderView = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectsView />;
      case 'business':
        return (
          <BusinessView
            initialTab={activeBusinessTab}
            onTabChange={handleBusinessTabChange}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'dashboard':
        return (
          <div className="view-container">
            <DashboardView onNavigate={handleNavigate} />
          </div>
        );
      case 'conversation':
      default:
        return <AreaScreen id={id} />;
    }
  };

  return (
    <ConversationServiceProvider service={runtimeConversationService}>
      <ConversationStoreProvider>
        <ProjectStoreProvider>
          <AppLayout
            activeView={activeView}
            activeBusinessTab={activeBusinessTab}
            onNavigate={handleNavigate}
            onBusinessTabChange={handleBusinessTabChange}
            theme={theme}
            onToggleTheme={toggleTheme}
          >
            {renderView()}
          </AppLayout>
        </ProjectStoreProvider>
      </ConversationStoreProvider>
    </ConversationServiceProvider>
  );
}
