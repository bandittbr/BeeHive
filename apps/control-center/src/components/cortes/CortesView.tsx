import { useState, useEffect } from 'react';
import { Users, Settings, Plus, Loader2 } from 'lucide-react';
import { NewProjectForm } from './NewProjectForm';
import { ChannelsManagerView } from './ChannelsManager';
import { CorteSettingsView } from './CorteSettings';
// OAuth agora está integrado no ChannelsManager
import type { CorteChannel, CorteSocialAccount, CorteProject, CorteSettings } from '../../types/cortes';
import { useAppStore } from '../../stores/appStore';
import { listChannels, getSettings, listSocialAccounts } from '../../services/cortes-api';

type CortesTab = 'canais' | 'oauth' | 'configuracoes';

export function CortesView() {
  const { corteChannels, corteProjects, corteSocialAccounts, corteSettings,
    addCorteChannel, addCorteProject, addCorteSocialAccount, setCorteSettings } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<CortesTab>('canais');
  const [showNewProject, setShowNewProject] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const [channels, settings, socialAccounts] = await Promise.all([
        listChannels(),
        getSettings().catch(() => null),
        listSocialAccounts(),
      ]);
      
      if (channels.length > 0) channels.forEach(ch => addCorteChannel(ch));
      if (settings) setCorteSettings(settings);
      if (socialAccounts.length > 0) socialAccounts.forEach(sa => addCorteSocialAccount(sa));
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
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
          {/* OAuth está integrado no tab Canais */}
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
