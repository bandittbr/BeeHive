import { useState } from 'react';
import { Clapperboard, Plus, Radio, Settings, ShieldCheck } from 'lucide-react';
import { ChannelsManagerView } from './ChannelsManager';
import { CorteSettingsView } from './CorteSettings';
import { OauthSettingsView } from './OauthSettings';
import { NewProjectForm } from './NewProjectForm';
import { ProjetosView } from './ProjetosView';
import { ProjectDetailView } from './ProjectDetail';

type Tab = 'projects' | 'channels' | 'automation' | 'settings';

export function CortesView() {
  const [tab, setTab] = useState<Tab>('projects');
  const [newProject, setNewProject] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((value) => value + 1);

  if (projectId) return <ProjectDetailView projectId={projectId} onBack={() => { setProjectId(null); refresh(); }} onLoad={refresh} />;

  return (
    <section className="cortes-page cortes-workspace">
      <header className="cortes-hero">
        <div>
          <div className="cortes-eyebrow"><Radio size={14} /> Conteúdo em piloto automático</div>
          <h1>Cortes que viram audiência.</h1>
          <p>Cole um vídeo longo. A IA encontra os momentos fortes, cria os vídeos verticais e deixa cada publicação organizada para aprovação e agenda.</p>
        </div>
        <button className="btn-primary cortes-create" onClick={() => setNewProject(true)}><Plus size={17} /> Novo lote de cortes</button>
      </header>

      <nav className="cortes-tabs cortes-tabs-modern" aria-label="Navegação de cortes">
        <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}><Clapperboard size={16} /> Meus cortes</button>
        <button className={tab === 'channels' ? 'active' : ''} onClick={() => setTab('channels')}><Radio size={16} /> Canais e redes</button>
        <button className={tab === 'automation' ? 'active' : ''} onClick={() => setTab('automation')}><ShieldCheck size={16} /> Conexões oficiais</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={16} /> Estilo padrão</button>
      </nav>

      <div className="cortes-content cortes-content-modern" key={refreshKey}>
        {tab === 'projects' && <ProjetosView onOpenProject={setProjectId} onRefresh={() => setNewProject(true)} />}
        {tab === 'channels' && <ChannelsManagerView />}
        {tab === 'automation' && <OauthSettingsView />}
        {tab === 'settings' && <CorteSettingsView />}
      </div>
      {newProject && <NewProjectForm onClose={() => setNewProject(false)} onCreated={(project) => { setNewProject(false); setProjectId(project.id); }} />}
    </section>
  );
}

export default CortesView;