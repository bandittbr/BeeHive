import { useState } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';
import { useProjectStore } from '../../services/projects/projectStore';
import { useConversations } from '@/features/conversation/ConversationStore';

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  children?: { id: string; label: string; icon: IconName }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'conversation', label: 'Conversa', icon: 'chat' },
  { id: 'projects', label: 'Projetos', icon: 'folder' },
  {
    id: 'business',
    label: 'Negócios',
    icon: 'briefcase',
    children: [
      { id: 'projetos', label: 'Projetos', icon: 'folder' },
      { id: 'afiliados', label: 'Afiliados', icon: 'command' },
      { id: 'meus-produtos', label: 'Meus Produtos', icon: 'briefcase' },
      { id: 'criador-conteudo', label: 'Criador de Conteúdo', icon: 'edit' },
      { id: 'cortes-youtube', label: 'Cortes Youtube', icon: 'media' },
    ],
  },
  { id: 'settings', label: 'Configurações', icon: 'gear' },
];

interface BeeHiveSidebarProps {
  activeView: string;
  activeBusinessTab?: string;
  onNavigate: (view: string) => void;
  onBusinessTabChange?: (tab: string) => void;
  onOpenCowork?: (projectId: string, projectName: string) => void;
}

export function BeeHiveSidebar({
  activeView,
  activeBusinessTab,
  onNavigate,
  onBusinessTabChange,
  onOpenCowork,
}: BeeHiveSidebarProps) {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const { newConversation } = useConversations();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [businessExpanded, setBusinessExpanded] = useState(
    activeView === 'business' || activeBusinessTab !== undefined,
  );

  const handleBusinessClick = () => {
    if (activeView === 'business') {
      setBusinessExpanded(!businessExpanded);
    } else {
      setBusinessExpanded(true);
      onNavigate('business');
    }
  };

  const handleProjectClick = (project: { id: string; name: string; path: string }) => {
    setActiveProject(project.id);
    if (onOpenCowork) {
      onOpenCowork(project.id, project.name || project.path.split(/[\\/]/).pop() || 'Projeto');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">
            <Icon name="hexagon" size={20} strokeWidth={2} />
          </span>
          <span className="sidebar__logo-text">
            <span className="sidebar__brand-name">BeeHive</span>
            <span className="sidebar__brand-tag">Sistema Operacional de IA</span>
          </span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Áreas">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            <div className="sidebar__nav-item-row">
              <button
                className={`sidebar__nav-item ${activeView === item.id ? 'sidebar__nav-item--active' : ''}`}
                onClick={() => {
                  if (item.id === 'business') {
                    handleBusinessClick();
                  } else {
                    onNavigate(item.id);
                  }
                }}
              >
                <span className="sidebar__nav-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="sidebar__nav-label">{item.label}</span>
                {item.children && (
                  <span className="sidebar__nav-chevron">
                    <Icon
                      name="chevron"
                      size={14}
                      className={`sidebar__chevron${businessExpanded ? ' sidebar__chevron--open' : ''}`}
                    />
                  </span>
                )}
              </button>
              {item.id === 'conversation' && (
                <button
                  className="sidebar__nav-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    newConversation();
                    if (activeView !== 'conversation') onNavigate('conversation');
                  }}
                  title="Nova conversa"
                >
                  <Icon name="plus" size={16} />
                </button>
              )}
            </div>

            {item.id === 'business' && item.children && businessExpanded && (
              <div className="sidebar__subnav">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    className={`sidebar__subnav-item ${
                      activeView === 'business' && activeBusinessTab === child.id
                        ? 'sidebar__subnav-item--active'
                        : ''
                    }`}
                    onClick={() => {
                      onNavigate('business');
                      onBusinessTabChange?.(child.id);
                    }}
                  >
                    <span className="sidebar__subnav-icon">
                      <Icon name={child.icon} size={16} />
                    </span>
                    <span className="sidebar__subnav-label">{child.label}</span>
                  </button>
                ))}
              </div>
            )}

            {item.id === 'projects' && projects.length > 0 && (
              <div className="sidebar__subnav">
                <button
                  className="sidebar__subnav-toggle"
                  onClick={() => setProjectsExpanded(!projectsExpanded)}
                >
                  <Icon
                    name="chevron"
                    size={12}
                    className={`sidebar__chevron${projectsExpanded ? ' sidebar__chevron--open' : ''}`}
                  />
                  <span>Meus Projetos</span>
                </button>
                {projectsExpanded && (
                  <div className="sidebar__project-list">
                    {projects.map((project) => {
                      const folderName =
                        project.name || project.path.split(/[\\/]/).pop() || 'Projeto';
                      return (
                        <button
                          key={project.id}
                          className={`sidebar__project-item ${
                            activeView === 'cowork' && activeProject?.id === project.id
                              ? 'sidebar__project-item--active'
                              : ''
                          }`}
                          onClick={() => handleProjectClick(project)}
                          title={project.path}
                        >
                          <span className="sidebar__project-icon">
                            <Icon name="folder" size={15} />
                          </span>
                          <span className="sidebar__project-name">{folderName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <span className="status-dot status-dot--online" />
          <span className="sidebar__status-model">big-pickle</span>
          <span>ativo</span>
        </div>
      </div>
    </aside>
  );
}
