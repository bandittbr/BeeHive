/**
 * BeeHiveSidebar — sidebar principal do BeeHive.
 *
 * Similar ao OpenWork: navegação entre áreas, projetos, conversas e configurações.
 */

import React, { useState } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  children?: NavItem[];
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
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: '⚙️',
  },
];

interface BeeHiveSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function BeeHiveSidebar({ activeView, onNavigate }: BeeHiveSidebarProps) {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

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
              onClick={() => onNavigate(item.id)}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
            </button>

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
