/**
 * BeeHiveSidebar — sidebar principal do BeeHive.
 *
 * Similar ao OpenWork: navegação entre áreas, projetos, conversas e configurações.
 * Agora com sub-itens para Negócios (Afiliados, Meus Produtos, Criador de Conteúdo).
 */

import { useState } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  children?: { id: string; label: string; icon: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  {
    id: 'conversation',
    label: 'Conversa',
    icon: '💬',
  },
  {
    id: 'projects',
    label: 'Projetos',
    icon: '📁',
  },
  {
    id: 'business',
    label: 'Negócios',
    icon: '💼',
    children: [
      { id: 'projetos', label: 'Projetos', icon: '📋' },
      { id: 'afiliados', label: 'Afiliados', icon: '🔗' },
      { id: 'meus-produtos', label: 'Meus Produtos', icon: '📦' },
      { id: 'criador-conteudo', label: 'Criador de Conteúdo', icon: '✍️' },
      { id: 'cortes-youtube', label: 'Cortes Youtube', icon: '🎬' },
    ],
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: '⚙️',
  },
];

interface BeeHiveSidebarProps {
  activeView: string;
  activeBusinessTab?: string;
  onNavigate: (view: string) => void;
  onBusinessTabChange?: (tab: string) => void;
}

export function BeeHiveSidebar({ activeView, activeBusinessTab, onNavigate, onBusinessTabChange }: BeeHiveSidebarProps) {
  const { projects, activeProject, setActiveProject } = useProjectStore();
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

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">🐝</span>
          <span className="sidebar__logo-text">BeeHive</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
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
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
              {item.children && (
                <span className="sidebar__nav-chevron">
                  {businessExpanded ? '▾' : '▸'}
                </span>
              )}
            </button>

            {/* Sub-itens de Negócios */}
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
                    <span className="sidebar__subnav-icon">{child.icon}</span>
                    <span className="sidebar__subnav-label">{child.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Projetos na sidebar */}
            {item.id === 'projects' && projects.length > 0 && (
              <div className="sidebar__subnav">
                <button
                  className="sidebar__subnav-toggle"
                  onClick={() => setProjectsExpanded(!projectsExpanded)}
                >
                  <span>{projectsExpanded ? '▾' : '▸'}</span>
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
                          className={`sidebar__project-item ${activeProject?.id === project.id ? 'sidebar__project-item--active' : ''}`}
                          onClick={() => {
                            setActiveProject(project.id);
                            onNavigate('projects');
                          }}
                          title={project.path}
                        >
                          <span className="sidebar__project-icon">
                            {project.icon || '📁'}
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
          <span>big-pickle</span>
        </div>
      </div>
    </aside>
  );
}
