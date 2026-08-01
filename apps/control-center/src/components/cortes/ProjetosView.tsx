import { useState, useEffect } from 'react';
import { Search, Scissors, Clock, FileVideo, Calendar, Plus, Loader2, Eye, Trash2, Pencil } from 'lucide-react';
import { listProjects, deleteProject } from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteProject } from '../../types/cortes';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  GENERATING: 'Gerando...',
  READY: 'Pronto',
  ERROR: 'Erro',
  PUBLISHED: 'Publicado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  GENERATING: '#3b82f6',
  READY: '#22c55e',
  ERROR: '#ef4444',
  PUBLISHED: '#8b5cf6',
};

interface ProjetosViewProps {
  onOpenProject: (id: string) => void;
  onRefresh: () => void;
}

export function ProjetosView({ onOpenProject, onRefresh }: ProjetosViewProps) {
  const { corteProjects, corteChannels, updateCorteProject, deleteCorteProject } = useAppStore();
  const [projects, setProjects] = useState<CorteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await listProjects();
      setProjects(data);
      data.forEach(p => {
        if (!corteProjects.find(cp => cp.id === p.id)) {
          updateCorteProject(p.id, { ...p });
        }
      });
    } catch (e) {
      console.error('Failed to load projects', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sourceVideoUrl.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="cortes-projetos">
      <div className="cortes-search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar projetos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando projetos...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Scissors size={40} strokeWidth={1.5} />
          <h3>Nenhum projeto encontrado</h3>
          <p>Crie seu primeiro projeto de cortes para começar a produzir vídeos virais.</p>
          <button className="btn-primary btn-sm" onClick={() => onRefresh()}>
            <Plus size={14} /> Novo Projeto
          </button>
        </div>
      ) : (
        <div className="cortes-projects-grid">
          {filtered.map(proj => {
            const channel = corteChannels.find(c => c.id === proj.channelId);
            return (
              <div key={proj.id} className="cortes-project-card">
                <div className="cortes-project-card-top">
                  <div className="cortes-project-name-wrap">
                    <span className="cortes-project-name">{proj.name}</span>
                    {channel && <span className="cortes-project-channel">{channel.name}</span>}
                  </div>
                  <span
                    className="cortes-status-badge"
                    style={{ background: `${STATUS_COLOR[proj.status] || '#94a3b8'}22`, color: STATUS_COLOR[proj.status] || '#94a3b8' }}
                  >
                    {STATUS_LABEL[proj.status] || proj.status}
                  </span>
                </div>
                <div className="cortes-project-meta">
                  <div className="cortes-meta-row">
                    <FileVideo size={13} />
                    <a href={proj.sourceVideoUrl} target="_blank" rel="noreferrer" className="cortes-meta-link">
                      {proj.sourceVideoUrl.length > 50 ? proj.sourceVideoUrl.slice(0, 50) + '...' : proj.sourceVideoUrl}
                    </a>
                  </div>
                  <div className="cortes-meta-row">
                    <Clock size={13} />
                    <span>{proj.duration}s · {proj.format} · {proj.quantityRequested} cortes</span>
                  </div>
                  <div className="cortes-meta-row">
                    <Calendar size={13} />
                    <span>{new Date(proj.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="cortes-project-actions">
                  <button className="btn-primary btn-sm" onClick={() => onOpenProject(proj.id)}>
                    <Eye size={13} /> Abrir projeto
                  </button>
                  <button 
                    className="btn-icon-danger" 
                    onClick={() => {
                      if (!confirm(`Excluir o projeto "${proj.name}"?`)) return;
                      deleteProject(proj.id).then(() => {
                        deleteCorteProject(proj.id);
                        setProjects(prev => prev.filter(p => p.id !== proj.id));
                      }).catch(console.error);
                    }} 
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
