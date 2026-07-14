import { useState } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { AddProjectModal } from '../../components/projects/AddProjectModal';

interface ProjectsViewProps {
  onOpenCowork?: (projectId: string, projectName: string) => void;
}

export function ProjectsView({ onOpenCowork }: ProjectsViewProps) {
  const { projects, activeProject, loading, error, setActiveProject, removeProject } =
    useProjectStore();
  const [showAddModal, setShowAddModal] = useState(false);

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>Projetos</h1>
          <p className="text-muted">
            Gerencie seus diretórios locais para trabalhar com o BeeHive.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Adicionar Projeto
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📂</div>
          <h2>Nenhum projeto ainda</h2>
          <p>Adicione um diretório do seu computador para começar a trabalhar.</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Adicionar Projeto
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={activeProject?.id === project.id}
              onSelect={(id) => {
                setActiveProject(id);
                if (onOpenCowork) {
                  onOpenCowork(project.id, project.name);
                }
              }}
              onRemove={removeProject}
            />
          ))}
        </div>
      )}

      <AddProjectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
