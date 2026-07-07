import { Button, Badge, EmptyState, Loading } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import { MarkdownMessage } from '@/features/conversation/components/MarkdownMessage';
import { ProjectImage } from './ProjectImage';
import type { Project } from '../useBusiness';

interface ProjectDetailProps {
  project: Project;
  generatingPlan: boolean;
  generatingPosts: boolean;
  onGeneratePlan: () => void;
  onGeneratePosts: () => void;
  onSetImage: (prompt: string, url: string) => void;
  onStop: () => void;
  onBack: () => void;
  onDelete: () => void;
}

interface AgentSectionProps {
  title: string;
  content: string;
  generating: boolean;
  emptyIcon: 'media' | 'chat';
  emptyText: string;
  generateLabel: string;
  onGenerate: () => void;
  onStop: () => void;
}

/** Uma seção de agente (plano ou posts): botão gerar/parar + resultado ao vivo. */
function AgentSection({
  title,
  content,
  generating,
  emptyIcon,
  emptyText,
  generateLabel,
  onGenerate,
  onStop,
}: AgentSectionProps) {
  const hasContent = content.trim().length > 0;
  return (
    <section className="project-detail__plan">
      <div className="project-detail__plan-head">
        <h3 className="project-detail__plan-title">{title}</h3>
        {generating ? (
          <Button variant="secondary" size="sm" icon="stop" onClick={onStop}>
            Parar
          </Button>
        ) : (
          <Button variant="primary" size="sm" icon="agents" onClick={onGenerate}>
            {hasContent ? 'Gerar de novo' : generateLabel}
          </Button>
        )}
      </div>

      {hasContent ? (
        <div className="project-detail__plan-body">
          <MarkdownMessage content={content} />
        </div>
      ) : generating ? (
        <div className="project-detail__plan-loading">
          <Loading variant="dots" label="Gerando" />
          <span>Gerando...</span>
        </div>
      ) : (
        <EmptyState icon={emptyIcon} title="Nada gerado ainda" description={emptyText} />
      )}
    </section>
  );
}

/** Tela de um Projeto: dados + agentes (estrategista e redator de posts). */
export function ProjectDetail({
  project,
  generatingPlan,
  generatingPosts,
  onGeneratePlan,
  onGeneratePosts,
  onSetImage,
  onStop,
  onBack,
  onDelete,
}: ProjectDetailProps) {
  return (
    <div className="project-detail">
      <div className="project-detail__bar">
        <button type="button" className="project-detail__back" onClick={onBack}>
          <Icon name="code" size={16} />
          <span>Voltar</span>
        </button>
        <Button variant="danger" size="sm" icon="trash" onClick={onDelete}>
          Apagar
        </Button>
      </div>

      <header className="project-detail__header">
        <h2 className="project-detail__name">{project.name}</h2>
        <div className="project-detail__tags">
          <Badge tone="accent">{project.niche}</Badge>
          {project.brand && <Badge tone="neutral">{project.brand}</Badge>}
        </div>
        {project.description && <p className="project-detail__desc">{project.description}</p>}
      </header>

      <AgentSection
        title="Plano de conteúdo"
        content={project.contentPlan}
        generating={generatingPlan}
        emptyIcon="media"
        emptyText="O agente estrategista cria um plano de conteúdo para este nicho."
        generateLabel="Gerar plano"
        onGenerate={onGeneratePlan}
        onStop={onStop}
      />

      <AgentSection
        title="Posts prontos"
        content={project.posts}
        generating={generatingPosts}
        emptyIcon="chat"
        emptyText="O agente redator escreve posts prontos (formato, legenda e hashtags). Gera melhor se já houver um plano."
        generateLabel="Gerar posts"
        onGenerate={onGeneratePosts}
        onStop={onStop}
      />

      <ProjectImage project={project} onSetImage={onSetImage} />
    </div>
  );
}
