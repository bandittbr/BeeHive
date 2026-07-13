/**
 * ProjectCard — card de projeto na grid.
 */

import type { Project } from '../../services/projects/types';

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ProjectCard({ project, isActive, onSelect, onRemove }: ProjectCardProps) {
  const folderName = project.name || project.path.split(/[\\/]/).pop() || 'Projeto';

  return (
    <div
      className={`project-card ${isActive ? 'project-card--active' : ''}`}
      onClick={() => onSelect(project.id)}
    >
      <div className="project-card__icon">
        {project.icon || '📁'}
      </div>
      <div className="project-card__info">
        <h3 className="project-card__name">{folderName}</h3>
        <p className="project-card__path" title={project.path}>
          {project.path}
        </p>
        {project.description && (
          <p className="project-card__description">{project.description}</p>
        )}
      </div>
      <div className="project-card__actions">
        {isActive && <span className="badge badge--active">Ativo</span>}
        <button
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(project.id);
          }}
          title="Remover projeto"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
