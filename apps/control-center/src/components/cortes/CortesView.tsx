import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2, Settings, Globe } from 'lucide-react';
import { 
  listChannels, createChannel, deleteChannel, updateChannel,
  listSocialAccounts, createSocialAccount, deleteSocialAccount,
} from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteChannel, CorteSocialAccount } from '../../types/cortes';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'instagram', label: 'Instagram', icon: '📷', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2' },
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
  { id: 'tiktok', label: 'TikTok', icon: '♪', color: '#00F2EA' },
];

export function CortesView() {
  const {
    corteChannels, corteProjects, corteSocialAccounts, corteSettings,
    addCorteChannel, addCorteProject, addCorteSocialAccount, setCorteSettings,
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState('canais');
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaCategory, setPersonaCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Simulação de dados (na produção viria da API)
  const [channels, setChannels] = useState<CorteChannel[]>([
    { id: 'ch_1', name: 'Risadola Cortes', category: 'Comédia', description: '', socialAccountIds: [], createdAt: '2026-08-02', updatedAt: '2026-08-02' },
  ]);
  
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [settings, setSettings] = useState({ subtitleFontSize: 24 });

  useEffect(() => {
    // Em uma aplicação real, isso viria do backend
    setLoading(false);
  }, []);

  async function handleCreatePersona() {
    if (!personaName.trim()) return alert('Preencha o nome da persona!');
    
    const newChannel: CorteChannel = {
      id: `ch_${Date.now()}`,
      name: personaName,
      category: personaCategory || 'General',
      description: '',
      socialAccountIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setChannels(prev => [...prev, newChannel]);
    addCorteChannel(newChannel);
    setPersonaName('');
    setPersonaCategory('');
    setShowNewPersona(false);
  }

  async function handleDeletePersona(id: string) {
    setChannels(prev => prev.filter(c => c.id !== id));
    deleteCorteChannel(id);
  }

  async function handleAddSocialAccount(channelId: string, platform: string, handle: string) {
    const newAccount: CorteSocialAccount = {
      id: `sa_${Date.now()}`,
      platform,
      accountId: handle,
      displayName: handle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      channelIds: [channelId],
    };
    
    setSocialAccounts(prev => [...prev, newAccount]);
    addCorteSocialAccount(newAccount);
    
    // Atualiza o canal com a conta
    const updatedChannels = channels.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, socialAccountIds: [...(ch.socialAccountIds || []), newAccount.id] };
      }
      return ch;
    });
    setChannels(updatedChannels);
  }

  const isFormValid = (data: any) => {
    return !!data.url && !!data.name && data.quantity && data.duration && data.format;
  };

  return (
    <div className="cortes-page">
      {/* Cabeçalho */}
      <header className="cortes-header">
        <div className="cortes-header-content">
          <h1 className="cortes-title">🎬 Cortes</h1>
          <p className="cortes-subtitle">Gerencie seus projetos de cortes de vídeo - crie, edite e publique cortes automatizados</p>
        </div>
        
        {/* Botões de ação */}
        <div className="cortes-actions">
          <button className="btn btn-primary" onClick={() => setShowNewPersona(true)}>
            <Plus size={16} /> Nova Persona
          </button>
        </div>
      </header>

      {/* Abas de navegação */}
      <nav className="cortes-tabs">
        <button 
          className={`cortes-tab ${activeTab === 'canais' ? 'active' : ''}`}
          onClick={() => setActiveTab('canais')}
        >
          <Globe size={18} /> Canais & Redes
        </button>
        <button 
          className={`cortes-tab ${activeTab === 'projetos' ? 'active' : ''}`}
          onClick={() => setActiveTab('projetos')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11h3M6 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>
          </svg> Projetos
        </button>
        <button 
          className={`cortes-tab ${activeTab === 'configuracoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuracoes')}
        >
          <Settings size={18} /> Configurações
        </button>
      </nav>

      {/* Conteúdo das abas */}
      <main className="cortes-content">
        {/* Aba Canais & Redes */}
        {activeTab === 'canais' && (
          <div className="cortes-section cortes-section-canais">
            <section className="cortes-card">
              <div className="cortes-card-header">
                <h2 className="cortes-card-title">🎭 Personas e Canais</h2>
                <p className="cortes-card-subtitle">Crie personas para organizar suas contas por nicho ou projeto</p>
              </div>

              {/* Grid de personas */}
              <div className="cortes-personas-grid">
                {channels.map(channel => (
                  <div key={channel.id} className="cortes-persona-card">
                    <div className="cortes-persona-header">
                      <h3 className="cortes-persona-name">{channel.name}</h3>
                      {channel.category && (
                        <span className="cortes-persona-category">{channel.category}</span>
                      )}
                      <button 
                        className="btn btn-delete"
                        onClick={() => handleDeletePersona(channel.id)}
                        title="Excluir persona"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="cortes-persona-details">
                      <div className="cortes-channel-info">
                        <span className="cortes-channel-label">Canal:</span>
                        <span className="cortes-channel-value">{channel.name}</span>
                      </div>
                      {channel.socialAccountIds.length > 0 && (
                        <div className="cortes-social-count">
                          <span className="cortes-social-count-label">Contas conectadas:</span>
                          <span className="cortes-social-count-number">{channel.socialAccountIds.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Botão de expandir canais */}
                    <button className="cortes-channel-expand-btn">
                      <ChevronDown size={14} /> Ver canais
                    </button>

                    {/* Expansão de canais (oculto por padrão) */}
                    <div className="cortes-channel-expanded">
                      <h4 className="cortes-channel-heading">Plataformas Conectadas:</h4>
                      {channel.socialAccountIds.length === 0 ? (
                        <p className="cortes-no-channels">Nenhuma conta conectada ainda.</p>
                      ) : (
                        <div className="cortes-platforms-list">
                          {['youtube', 'instagram', 'facebook', 'tiktok'].map(platform => (
                            <div key={platform} className="cortes-platform-item">
                              <span className="cortes-platform-icon">
                                {PLATFORMS.find(p => p.id === platform)?.icon}
                              </span>
                              <span className="cortes-platform-name">
                                {PLATFORMS.find(p => p.id === platform)?.label}
                              </span>
                              <button className="btn btn-small btn-connect">
                                Conectar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Adicionar nova persona */}
                {showNewPersona && (
                  <div className="cortes-add-persona-form">
                    <h3>Nova Persona</h3>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Nome da persona (ex: Risadola Cortes)"
                        value={personaName}
                        onChange={(e) => setPersonaName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <select
                        value={personaCategory}
                        onChange={(e) => setPersonaCategory(e.target.value)}
                      >
                        <option value="">Categoria</option>
                        <option value="Comédia">Comédia</option>
                        <option value="Entretenimento">Entretenimento</option>
                        <option value="Educacional">Educacional</option>
                        <option value="Games">Games</option>
                        <option value="Tech">Tech</option>
                        <option value="Viagens">Viagens</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={handleCreatePersona}>
                        Criar Persona
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowNewPersona(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                
                {!showNewPersona && channels.length === 0 && (
                  <div className="cortes-empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <h4>Sem personas criadas</h4>
                    <p>Crie sua primeira persona para começar a gerenciar seus canais</p>
                  </div>
                )}
              </div>
            </section>

            {/* Sezione de redes sociais */}
            <section className="cortes-card">
              <div className="cortes-card-header">
                <h2 className="cortes-card-title">🔗 Redes Sociais</h2>
                <p className="cortes-card-subtitle">Conecte suas contas de redes sociais para publicação automática</p>
              </div>
              
              <div className="cortes-platforms-container">
                <div className="cortes-platform-item">
                  <div className="cortes-platform-header">
                    <div className="cortes-platform-icon-wrapper">
                      <span className="cortes-platform-icon">▶</span>
                    </div>
                    <div className="cortes-platform-name">YouTube</div>
                  </div>
                  <button className="btn btn-connect">Conectar</button>
                </div>
                <div className="cortes-platform-item">
                  <div className="cortes-platform-header">
                    <div className="cortes-platform-icon-wrapper">
                      <span className="cortes-platform-icon">📷</span>
                    </div>
                    <div className="cortes-platform-name">Instagram</div>
                  </div>
                  <button className="btn btn-connect">Conectar</button>
                </div>
                <div className="cortes-platform-item">
                  <div className="cortes-platform-header">
                    <div className="cortes-platform-icon-wrapper">
                      <span className="cortes-platform-icon">f</span>
                    </div>
                    <div className="cortes-platform-name">Facebook</div>
                  </div>
                  <button className="btn btn-connect">Conectar</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Aba Projetos */}
        {activeTab === 'projetos' && (
          <div className="cortes-section cortes-section-projetos">
            <div className="cortes-header-controls">
              <h2>📋 Projetos de Cortes</h2>
              <button className="btn btn-primary">
                <Plus size={16} /> Novo Projeto
              </button>
            </div>

            {/* Formulário de novo projeto */}
            <div className="cortes-project-form-card">
              <h3>Criar Novo Projeto de Corte</h3>
              
              <form className="project-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="project-url">URL do Vídeo YouTube</label>
                    <input
                      type="url"
                      id="project-url"
                      placeholder="Cole o link do vídeo do YouTube aqui..."
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="project-name">Nome do Projeto</label>
                    <input
                      type="text"
                      id="project-name"
                      placeholder="Ex: Comédia Viral"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="channel-select">Canal / Persona</label>
                    <select id="channel-select" className="form-select">
                      <option value="">Selecione um canal</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name} ({channel.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="quantity">Quantidade de Cortes</label>
                    <select id="quantity" className="form-select">
                      {[1, 2, 3, 5, 10].map(q => (
                        <option key={q} value={q}>{q} corte(s)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="duration">Duração dos Cortes</label>
                    <select id="duration" className="form-select">
                      {[5, 10, 15, 20, 25, 30, 45, 60].map(d => (
                        <option key={d} value={`${d}s`}>{d} segundos</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="formato">Formato do Vídeo</label>
                    <select id="formato" className="form-select">
                      <option value="9:16">9:16 (Vertical - TikTok/Reels/Shorts)</option>
                      <option value="1:1">1:1 (Quadrado)</option>
                      <option value="16:9">16:9 (Horizontal - Desktop)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group checkboxes-group">
                  <label>Otimizações IA:</label>
                  <div className="checkbox-item">
                    <input type="checkbox" id="auto-highlights" defaultChecked />
                    <label htmlFor="auto-highlights">Selecionar melhores momentos com IA</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="auto-captions" defaultChecked />
                    <label htmlFor="auto-captions">Gerar legendas dinâmicas</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="auto-title" defaultChecked />
                    <label htmlFor="auto-title">Gerar título atraente</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="auto-desc" defaultChecked />
                    <label htmlFor="auto-desc">Gerar descrição</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="auto-hashtags" defaultChecked />
                    <label htmlFor="auto-hashtags">Gerar hashtags</label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-lg">
                    Gerar e Publicar Cortes
                  </button>
                  <button type="button" className="btn btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de projetos existentes */}
            {corteProjects.length > 0 && (
              <div className="cortes-projects-list">
                <h4>Projetos Recentes</h4>
                <div className="projects-grid">
                  {corteProjects.map(project => (
                    <div key={project.id} className="project-card">
                      <div className="project-header">
                        <h4 className="project-title">{project.name}</h4>
                        <span className={`status-badge ${project.status.toLowerCase()}`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="project-meta">
                        <span className="meta-item">
                          <span className="meta-label">URL:</span>
                          <span className="meta-value truncate">{project.sourceVideoUrl.substring(0, 50)}...</span>
                        </span>
                      </div>
                      <div className="project-stats">
                        <div className="stat-item">
                          <span className="stat-number">{project.clips?.length || 0}</span>
                          <span className="stat-label">cortes</span>
                        </div>
                      </div>
                      <div className="project-actions">
                        <button className="btn btn-sm btn-view">Ver Detalhes</button>
                        <button className="btn btn-sm btn-edit">Editar</button>
                        <button className="btn btn-sm btn-publish">Publicar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba Configurações */}
        {activeTab === 'configuracoes' && (
          <div className="cortes-section cortes-section-configuracoes">
            <section className="cortes-card">
              <div className="cortes-card-header">
                <h2 className="cortes-card-title">⚙️ Configuração de Legendas</h2>
                <p className="cortes-card-subtitle">Personalize as legendas dos seus cortes</p>
              </div>
              
              <div className="form-group">
                <label>Fonte</label>
                <select className="form-select">
                  <option>Arial</option>
                  <option>Roboto</option>
                  <option>Lato</option>
                  <option>Montserrat</option>
                  <option>Open Sans</option>
                  <option>Helvetica</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tamanho da Fonte</label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={settings.subtitleFontSize}
                  className="form-range"
                />
                <span className="value-display">{settings.subtitleFontSize}px</span>
              </div>

              <div className="form-group">
                <label>Cor da Palavra Ativa</label>
                <div className="color-picker">
                  <div className="color-option active" style={{ backgroundColor: 'yellow' }}></div>
                  <div className="color-option" style={{ backgroundColor: 'red' }}></div>
                  <div className="color-option" style={{ backgroundColor: 'green' }}></div>
                  <div className="color-option" style={{ backgroundColor: 'blue' }}></div>
                  <div className="color-option" style={{ backgroundColor: 'orange' }}></div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary">Salvar Configurações</button>
                <button className="btn btn-secondary">Redefinir Padrão</button>
              </div>
            </section>

            <section className="cortes-card">
              <div className="cortes-card-header">
                <h2 className="cortes-card-title">⚡ Configuração de Vídeo</h2>
                <p className="cortes-card-subtitle">Defina padrões globais para a geração de cortes</p>
              </div>

              <div className="form-group">
                <label>Qualidade Padrão</label>
                <select className="form-select">
                  <option>720p HD</option>
                  <option>1080p Full HD</option>
                  <option>4K UHD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Duração Padrão dos Cortes</label>
                <input
                  type="number"
                  defaultValue={15}
                  className="form-input"
                />
                <span className="unit">segundos</span>
              </div>

              <div className="form-group">
                <label>Quantidade Padrão de Cortes por Vídeo</label>
                <input
                  type="number"
                  defaultValue={3}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-primary">Aplicar Padrões</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default CortesView;
