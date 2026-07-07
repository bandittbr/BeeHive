import { useState } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { Button, EmptyState, Modal } from '@/components/ui';
import { useBusiness } from './useBusiness';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { CreateProjectModal } from './components/CreateProjectModal';
import './BusinessView.css';

/**
 * Área Business — cria e administra negócios digitais como Projetos.
 *
 * Duas telas: a lista de Projetos e o detalhe de um Projeto (onde o agente
 * estrategista gera o plano de conteúdo). Projetos persistem no navegador.
 */
export function BusinessView() {
  const {
    projects,
    generating,
    createProject,
    deleteProject,
    generatePlan,
    generatePosts,
    stopGeneration,
    setProjectImage,
  } = useBusiness();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <AreaPage
      icon="briefcase"
      title="Business"
      description="Crie e administre negócios digitais como Projetos."
      state="Ativo"
    >
      {selected ? (
        <ProjectDetail
          project={selected}
          generatingPlan={generating?.id === selected.id && generating.kind === 'plan'}
          generatingPosts={generating?.id === selected.id && generating.kind === 'posts'}
          onGeneratePlan={() => generatePlan(selected.id, selected.niche, selected.brand)}
          onGeneratePosts={() =>
            generatePosts(selected.id, selected.niche, selected.brand, selected.contentPlan)
          }
          onSetImage={(prompt, url) => setProjectImage(selected.id, prompt, url)}
          onStop={stopGeneration}
          onBack={() => setSelectedId(null)}
          onDelete={() => setPendingDelete(selected.id)}
        />
      ) : (
        <>
          <div className="business__toolbar">
            <span className="business__count">
              {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
            <Button variant="primary" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
              Novo Projeto
            </Button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon="briefcase"
              title="Nenhum projeto ainda"
              description="Crie seu primeiro negócio digital e deixe o agente gerar o plano de conteúdo."
              action={
                <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
                  Criar Projeto
                </Button>
              }
            />
          ) : (
            <div className="business__grid">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => setSelectedId(project.id)}
                  onDelete={() => setPendingDelete(project.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          const id = createProject(input);
          setSelectedId(id);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        title="Apagar projeto"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) {
                  deleteProject(pendingDelete);
                  if (selectedId === pendingDelete) setSelectedId(null);
                }
                setPendingDelete(null);
              }}
            >
              Apagar
            </Button>
          </>
        }
      >
        Apagar este projeto? Esta ação não pode ser desfeita.
      </Modal>
    </AreaPage>
  );
}
