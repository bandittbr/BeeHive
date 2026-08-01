import { useState, useEffect } from 'react';
import { Scissors, Layers, Users, Settings, Plus, Loader2 } from 'lucide-react';
import { ProjetosView } from './ProjetosView';
import { ProjectDetailView } from './ProjectDetail';
import { NewProjectForm } from './NewProjectForm';
import { ChannelsManagerView } from './ChannelsManager';
import { CorteSettingsView } from './CorteSettings';
import type { CorteChannel, CorteSocialAccount, CorteProject, CorteSettings } from '../../types/cortes';
import { useAppStore } from '../../stores/appStore';
import { listChannels, listProjects, getSettings, listSocialAccounts } from '../../services/cortes-api';

type CortesTab = 'canais' | 'configuracoes';

export function CortesView() {
  const { corteChannels, corteProjects, corteSocialAccounts, corteSettings,
    addCorteChannel, addCorteProject, addCorteSocialAccount, setCorteSettings } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<CortesTab>('projetos');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const [channels, projects, settings, socialAccounts] = await Promise.all([
        listChannels(),
        listProjects(),
        getSettings().catch(() => null),
        listSocialAccounts(),
      ]);
      
      if (channels.length > 0) channels.forEach(ch => addCorteChannel(ch));
      if (projects.length > 0) projects.forEach(p => addCorteProject(p));
      if (settings) setCorteSettings(settings);
      if (socialAccounts.length > 0) socialAccounts.forEach(sa => addCorteSocialAccount(sa));
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenProject(id: string) {
    setSelectedProjectId(id);
  }

  function handleBack() {
    setSelectedProjectId(null);
  }

  // Show project detail if selected
  if (selectedProjectId) {
    return (
      <div className="cortes-main">
        <ProjectDetailView 
          projectId={selectedProjectId} 
          onBack={handleBack} 
          onLoad={loadAllData}
        />
      </div>
    );
  }

  return (
    <div className="cortes-main">
      {/* Page header */}
      <div className="cortes-page-header">
        <div>
          <h1>Cortes</h1>
          <p>Gerencie seus projetos de cortes de vídeo — crie, edite e publique cortes automatizados</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewProject(true)}>
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      {loading ? (
        <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando...</span></div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="cortes-tabs">
            <button
              className={`cortes-tab${activeTab === 'canais' ? ' active' : ''}`}
              onClick={() => setActiveTab('canais')}
            >
              <Users size={16} /> Canais & Redes
            </button>
            <button
              className={`cortes-tab${activeTab === 'configuracoes' ? ' active' : ''}`}
              onClick={() => setActiveTab('configuracoes')}
            >
              <Settings size={16} /> Configurações
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'canais' && (
            <ChannelsManagerView onRefresh={loadAllData} />
          )}
          {activeTab === 'canais' && (
            <ChannelsManagerView onRefresh={loadAllData} />
          )}
          {activeTab === 'configuracoes' && (
            <CorteSettingsView />
          )}
        </>
      )}

      {/* New project modal */}
      {showNewProject && (
        <div className="cortes-modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="cortes-modal" onClick={e => e.stopPropagation()}>
            <NewProjectForm 
              onSuccess={() => {
                setShowNewProject(false);
                loadAllData();
              }} 
              onCancel={() => setShowNewProject(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
