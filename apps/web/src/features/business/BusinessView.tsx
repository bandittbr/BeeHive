import { useState, useEffect } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { Button, EmptyState, Modal } from '@/components/ui';
import { useBusiness } from './useBusiness';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { CreateProjectModal } from './components/CreateProjectModal';
import { AffiliatesView } from './affiliates/AffiliatesView';
import { MyProductsView } from './affiliates/MyProductsView';
import { ContentCreatorView } from './affiliates/ContentCreatorView';
import './BusinessView.css';

export type BusinessTab = 'projetos' | 'afiliados' | 'meus-produtos' | 'criador-conteudo';

const TABS: { id: BusinessTab; label: string; icon: string }[] = [
  { id: 'projetos', label: 'Projetos', icon: '📋' },
  { id: 'afiliados', label: 'Afiliados', icon: '🔗' },
  { id: 'meus-produtos', label: 'Meus Produtos', icon: '📦' },
  { id: 'criador-conteudo', label: 'Criador de Conteúdo', icon: '✍️' },
];

interface BusinessViewProps {
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

/**
 * Área Business — agora com sub-módulos:
 * - Projetos (original)
 * - Afiliados (discovery rules + automação)
 * - Meus Produtos (produtos descobertos)
 * - Criador de Conteúdo (conteúdo gerado + publicações)
 */
export function BusinessView({ initialTab, onTabChange }: BusinessViewProps) {
  const [activeTab, setActiveTab] = useState<BusinessTab>(
    (initialTab as BusinessTab) || 'projetos',
  );
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

  // Sincroniza com initialTab quando vem da sidebar
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab as BusinessTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: BusinessTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'afiliados':
        return <AffiliatesView />;
      case 'meus-produtos':
        return <MyProductsView />;
      case 'criador-conteudo':
        return <ContentCreatorView />;
      case 'projetos':
      default:
        return selected ? (
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
        );
    }
  };

  return (
    <AreaPage
      icon="briefcase"
      title="Negócios"
      description="Gerencie seus negócios digitais, afiliados e conteúdo."
      state="Ativo"
    >
      {/* Navegação de abas */}
      <div className="business__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`business__tab ${activeTab === tab.id ? 'business__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="business__tab-icon">{tab.icon}</span>
            <span className="business__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="business__tab-content">
        {renderTabContent()}
      </div>

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
