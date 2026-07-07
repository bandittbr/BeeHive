import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/ui';
import type { Project } from '../useBusiness';

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}

/** Cartão de um Projeto na listagem do Business. */
export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  return (
    <div
      className="project-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="project-card__head">
        <span className="project-card__icon" aria-hidden>
          <Icon name="briefcase" size={20} />
        </span>
        <button
          type="button"
          className="project-card__delete"
          aria-label="Apagar projeto"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
      <h3 className="project-card__name">{project.name}</h3>
      <p className="project-card__niche">{project.niche}</p>
      <div className="project-card__foot">
        <Badge tone={project.contentPlan ? 'success' : 'neutral'} dot>
          {project.contentPlan ? 'Com plano' : 'Sem plano'}
        </Badge>
      </div>
    </div>
  );
}
