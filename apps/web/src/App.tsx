import { useState, useEffect } from 'react';
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
import { CoworkView } from '@/features/cowork/CoworkView';
import { useLocalProject } from '@/features/projects/useLocalProject';
import { projectFiles } from '@/services/files/projectFiles';

type ViewType = 'dashboard' | 'conversation' | 'projects' | 'business' | 'settings' | 'cowork';

interface CoworkProject {
  id: string;
  name: string;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { id, navigate } = useHashRoute(AREA_IDS, 'conversa');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeBusinessTab, setActiveBusinessTab] = useState<string>('projetos');
  const [coworkProject, setCoworkProject] = useState<CoworkProject | null>(null);
  const localProject = useLocalProject();

  useEffect(() => {
    projectFiles.init();
  }, []);

  useEffect(() => {
    (async () => {
      const projects = await projectFiles.listProjects();
      if (projects.length > 0 && !localProject.project) {
        localProject.selectProject(projects[0].id);
      }
    })();
  }, []);

  const handleNavigate = (view: string) => {
    if (view === 'cowork') return;
    setActiveView(view as ViewType);
    setCoworkProject(null);
    if (view === 'conversation') {
      navigate('conversa');
    }
  };

  const handleOpenCowork = (projectId: string, projectName: string) => {
    setCoworkProject({ id: projectId, name: projectName });
    setActiveView('cowork');
  };

  const handleCoworkBack = () => {
    setCoworkProject(null);
    setActiveView('projects');
  };

  const handleBusinessTabChange = (tab: string) => {
    setActiveBusinessTab(tab);
  };

  const renderView = () => {
    if (activeView === 'cowork' && coworkProject) {
      return (
        <CoworkView
          projectId={coworkProject.id}
          projectName={coworkProject.name}
          onBack={handleCoworkBack}
        />
      );
    }

    switch (activeView) {
      case 'projects':
        return <ProjectsView onOpenCowork={handleOpenCowork} />;
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
      <ConversationStoreProvider projectContext={localProject.buildContext()}>
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
