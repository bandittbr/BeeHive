import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Clock, Calendar } from 'lucide-react';
import {
  listChannels, createChannel, deleteChannel,
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

// Configurações de segurança
const SCHEDULING_RULES = {
  minIntervalMinutes: 60,      // Mínimo 1h entre posts
  maxPostsPerDay: 3,          // Máximo 3 posts por dia por rede
  safeHours: [9, 12, 15, 18, 21], // Horários seguros (9h, 12h, 15h, 18h, 21h)
  avoidNight: true,           // Evitar postar à noite
};

// URL base do Railway
const BACKEND_URL = 'https://beehive-production-d895.up.railway.app';

export function ChannelsManagerView({ onRefresh }: { onRefresh: () => void }) {
  const { addCorteChannel, deleteCorteChannel, addCorteSocialAccount, deleteCorteSocialAccount } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para expansão das personas
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  
  // Estado para OAuth flow
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  
  // Estado para formulário manual (fallback)
  const [addingAccount, setAddingAccount] = useState<string | null>(null);
  const [manualPlatform, setManualPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [creatingAcc, setCreatingAcc] = useState(false);
  
  // Estado para novo canal
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  
  // Estado para configurações de agendamento
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('scheduled');
  const [selectedSchedule, setSelectedSchedule] = useState<{ date: string; time: string }>({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  });

  useEffect(() => { loadAll(); }, []);

  // Escuta callback do OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const accountIdParam = urlParams.get('accountId');
    const displayName = urlParams.get('displayName');
    
    if (connected && accountIdParam) {
      handleOAuthCallback(connected, accountIdParam, displayName || undefined);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [ch, acc] = await Promise.all([listChannels(), listSocialAccounts()]);
      setChannels(ch);
      setSocialAccounts(acc);
      ch.forEach(c => addCorteChannel(c));
      acc.forEach(a => addCorteSocialAccount(a));
    } catch (e) {
      console.error('Failed to load', e);
    } finally {
      setLoading(false);
    }
  }

  function toggleChannel(channelId: string) {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim()) {
      alert('Por favor, preencha o nome da persona');
      return;
    }
    setCreatingChannel(true);
    try {
      const ch = await createChannel({ 
        name: newChannelName.trim(), 
        category: newChannelCategory.trim() || undefined 
      });
      addCorteChannel(ch);
      setChannels(prev => [...prev, ch]);
      setNewChannelName('');
      setNewChannelCategory('');
      setShowNewChannel(false);
      setExpandedChannels(prev => new Set([...prev, ch.id]));
      onRefresh();
    } catch (e) {
      alert('Erro ao criar persona: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleDeleteChannel(id: string) {
    if (!confirm('Remover esta persona e todas as contas conectadas?')) return;
    try {
      await deleteChannel(id);
      deleteCorteChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      onRefresh();
    } catch (e) {
      console.error('Failed to delete channel', e);
    }
  }

  function startOAuth(platform: string, channelId: string) {
    setConnectingTo(`${platform}:${channelId}`);
    const redirectUri = `${window.location.origin}/`;
    window.location.href = `${BACKEND_URL}/oauth/${platform}/start?redirectUri=${encodeURIComponent(redirectUri)}&state=${channelId}`;
  }

  async function handleOAuthCallback(platform: string, accountId: string, displayName?: string) {
    try {
      const acc = await createSocialAccount({ 
        platform, 
        accountId, 
        displayName: displayName || accountId
      });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      
      const updatedChannels = channels.map(ch => {
        if (!ch.socialAccountIds?.includes(acc.id)) {
          return { ...ch, socialAccountIds: [...(ch.socialAccountIds || []), acc.id] };
        }
        return ch;
      });
      setChannels(updatedChannels);
      onRefresh();
    } catch (e) {
      alert('Erro ao conectar conta: ' + (e instanceof Error ? e.message : String(e)));
      setConnectingTo(null);
    }
  }

  async function handleAddAccount(channelId: string) {
    if (!accountId.trim()) {
      alert('Por favor, preencha o ID/Link da conta');
      return;
    }
    setCreatingAcc(true);
    try {
      const acc = await createSocialAccount({ 
        platform: manualPlatform, 
        accountId: accountId.trim(), 
        displayName: accountHandle.trim() || undefined 
      });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      
      const currentChannel = channels.find(c => c.id === channelId);
      const newSocialAccountIds = [...(currentChannel?.socialAccountIds || []), acc.id];
      const updatedChannels = channels.map(c => 
        c.id === channelId ? { ...c, socialAccountIds: newSocialAccountIds } : c
      );
      setChannels(updatedChannels);
      
      setAccountId('');
      setAccountHandle('');
      setAddingAccount(null);
      onRefresh();
    } catch (e) {
      alert('Erro ao adicionar conta: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreatingAcc(false);
    }
  }

  async function handleDeleteAccount(accountIdStr: string, channelId: string) {
    try {
      await deleteSocialAccount(accountIdStr);
      deleteCorteSocialAccount(accountIdStr);
      setSocialAccounts(prev => prev.filter(a => a.id !== accountIdStr));
      
      const currentChannel = channels.find(c => c.id === channelId);
      const newIds = (currentChannel?.socialAccountIds || []).filter(id => id !== accountIdStr);
      const updatedChannels = channels.map(c => 
        c.id === channelId ? { ...c, socialAccountIds: newIds } : c
      );
      setChannels(updatedChannels);
      onRefresh();
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  }

  // Calcular próximo horário seguro
  function getNextSafeSchedule(date: string, currentTime: string): string {
    const now = new Date();
    const [hour, minute] = currentTime.split(':').map(Number);
    
    // Adiciona intervalo mínimo
    const nextTime = new Date(now);
    nextTime.setHours(hour, minute, 0, 0);
    nextTime.setMinutes(nextTime.getMinutes() + SCHEDULING_RULES.minIntervalMinutes);
    
    // Formata para string
    const h = nextTime.getHours().toString().padStart(2, '0');
    const m = nextTime.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  if (loading) {
    return <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando...</span></div>;
  }

  return (
    <div className="cortes-channels">
      {/* Seção: Agenda de Publicação */}
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>⏰ Agenda de Publicação</h2>
          <p>Configure o horário seguro para publicar os cortes (evita bans)</p>
        </div>
        
        <div className="cortes-card">
          <div className="cortes-card-body">
            <div className="cortes-schedule-config">
              {/* Modo de publicação */}
              <div className="cortes-mode-selector">
                <label className="cortes-label">Modo de Publicação:</label>
                <div className="cortes-mode-options">
                  <button 
                    className={`cortes-mode-btn ${scheduleMode === 'immediate' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('immediate')}
                  >
                    <Clock size={14} /> Imediato
                  </button>
                  <button 
                    className={`cortes-mode-btn ${scheduleMode === 'scheduled' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('scheduled')}
                  >
                    <Calendar size={14} /> Agendado
                  </button>
                </div>
              </div>

              {/* Configuração de datas */}
              {scheduleMode === 'scheduled' && (
                <div className="cortes-date-config">
                  <div className="cortes-form-group">
                    <label>Data</label>
                    <input 
                      type="date" 
                      value={selectedSchedule.date}
                      onChange={e => setSelectedSchedule(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="cortes-form-group">
                    <label>Horário Inicial</label>
                    <input 
                      type="time" 
                      value={selectedSchedule.time}
                      onChange={e => setSelectedSchedule(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  
                  {/* Regras de segurança */}
                  <div className="cortes-rules-info">
                    <h4>🔒 Regras de Segurança:</h4>
                    <ul>
                      <li>Mínimo de {SCHEDULING_RULES.minIntervalMinutes}min entre posts</li>
                      <li>Máximo de {SCHEDULING_RULES.maxPostsPerDay} posts/dia por rede</li>
                      <li>Evitando horários noturnos (22h-6h)</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Preview do schedule */}
              {scheduleMode === 'scheduled' && (
                <div className="cortes-schedule-preview">
                  <h4>📅 Previsão de Publicação:</h4>
                  <div className="cortes-time-slots">
                    {Array.from({ length: SCHEDULING_RULES.maxPostsPerDay }, (_, i) => {
                      const [hour, minute] = selectedSchedule.time.split(':').map(Number);
                      const slotTime = new Date();
                      slotTime.setDate(parseInt(selectedSchedule.date));
                      slotTime.setHours(hour + (i * 3), minute, 0, 0); // 3h entre posts
                      return (
                        <div key={i} className="cortes-time-slot">
                          <span>{slotTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="cortes-slot-label">Post {i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Personas */}
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>🎭 Personalias / Canais</h2>
          <p>Crie personas para organizar suas redes sociais por projeto ou nicho</p>
        </div>
        
        <div className="cortes-card">
          <div className="cortes-card-body">
            {/* Lista de personas */}
            <div className="cortes-channel-list">
              {channels.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma persona cadastrada ainda.</p>
                  <p className="cortes-help-text">Crie uma persona (ex: "Risadola Cortes") para organizar suas contas de rede social e conectar via OAuth.</p>
                </div>
              ) : (
                channels.map(ch => {
                  const channelAccounts = socialAccounts.filter(sa => ch.socialAccountIds?.includes(sa.id));
                  const isExpanded = expandedChannels.has(ch.id);
                  
                  return (
                    <div key={ch.id} className="cortes-channel-item">
                      {/* Header da persona */}
                      <div className="cortes-channel-header">
                        <button 
                          className="cortes-channel-toggle"
                          onClick={() => toggleChannel(ch.id)}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div className="cortes-channel-info">
                          <span className="cortes-channel-name">{ch.name}</span>
                          {ch.category && <span className="cortes-channel-category">{ch.category}</span>}
                          <span className="cortes-account-count">
                            {channelAccounts.length} conta{channelAccounts.length !== 1 ? 's' : ''} conectada{channelAccounts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button 
                          className="btn-icon-danger" 
                          onClick={() => handleDeleteChannel(ch.id)}
                          title="Remover persona"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Conteúdo expandido */}
                      {isExpanded && (
                        <div className="cortes-channel-content">
                          {/* Lista de contas desta persona */}
                          <div className="cortes-social-list">
                            {channelAccounts.length === 0 ? (
                              <div className="empty-state">
                                <p className="cortes-help-text">Nenhuma rede social conectada nesta persona.</p>
                              </div>
                            ) : (
                              channelAccounts.map(acc => (
                                <div key={acc.id} className="cortes-social-item">
                                  <div className="cortes-social-item-left">
                                    <div 
                                      className="cortes-platform-badge"
                                      style={{ background: PLATFORMS.find(p => p.id === acc.platform)?.color + '20' }}
                                    >
                                      {PLATFORMS.find(p => p.id === acc.platform)?.icon || '•'}
                                    </div>
                                    <div>
                                      <span className="cortes-social-platform">{acc.platform.toUpperCase()}</span>
                                      <span className="cortes-social-handle">{acc.displayName || acc.accountId}</span>
                                    </div>
                                  </div>
                                  <button 
                                    className="btn-icon-danger" 
                                    onClick={() => handleDeleteAccount(acc.id, ch.id)}
                                    title="Remover conta"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Botões de ação */}
                          <div className="cortes-actions-row">
                            {/* OAuth - Conectar com login */}
                            <div className="cortes-oauth-section">
                              <p className="cortes-help-text">Conecte sua conta ({PLATFORMS.find(p => p.id === 'youtube')?.label || 'selecionar'})</p>
                              <div className="cortes-platform-grid">
                                {PLATFORMS.map(p => {
                                  const isConnecting = connectingTo?.startsWith(`${p.id}:`);
                                  return (
                                    <button
                                      key={p.id}
                                      className={`cortes-platform-btn ${isConnecting ? ' connecting' : ''}`}
                                      style={{ borderColor: p.color + '40' }}
                                      onClick={() => startOAuth(p.id, ch.id)}
                                      disabled={isConnecting}
                                    >
                                      <span className="cortes-platform-icon" style={{ color: p.color }}>{p.icon}</span>
                                      <span>{p.label}</span>
                                      {isConnecting && <Loader2 size={12} className="spin" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Manual fallback */}
                            {addingAccount === ch.id ? (
                              <div className="cortes-social-form">
                                <select value={manualPlatform} onChange={e => setManualPlatform(e.target.value)}>
                                  {PLATFORMS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                  ))}
                                </select>
                                <input 
                                  type="text" 
                                  placeholder="ID ou Link da conta" 
                                  value={accountId} 
                                  onChange={e => setAccountId(e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  placeholder="Nome de exibição (opcional)" 
                                  value={accountHandle} 
                                  onChange={e => setAccountHandle(e.target.value)} 
                                />
                                <div className="cortes-form-actions">
                                  <button 
                                    className="btn-primary btn-sm" 
                                    onClick={() => handleAddAccount(ch.id)}
                                    disabled={creatingAcc || !accountId.trim()}
                                  >
                                    {creatingAcc ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Adicionar
                                  </button>
                                  <button 
                                    className="btn-ghost btn-sm" 
                                    onClick={() => { 
                                      setAddingAccount(null); 
                                      setAccountId(''); 
                                      setAccountHandle(''); 
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                className="btn-outline btn-sm" 
                                onClick={() => {
                                  setAddingAccount(ch.id);
                                  setManualPlatform('youtube');
                                  setAccountId('');
                                  setAccountHandle('');
                                }}
                              >
                                <Plus size={14} /> Adicionar manualmente
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Botão para nova persona */}
            {showNewChannel ? (
              <div className="cortes-channel-form">
                <input 
                  type="text" 
                  placeholder="Nome da persona (ex: Risadola Cortes)" 
                  value={newChannelName} 
                  onChange={e => setNewChannelName(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Categoria (ex: Comédia, Games...)" 
                  value={newChannelCategory} 
                  onChange={e => setNewChannelCategory(e.target.value)} 
                />
                <div className="cortes-form-actions">
                  <button 
                    className="btn-primary btn-sm" 
                    onClick={handleCreateChannel}
                    disabled={creatingChannel || !newChannelName.trim()}
                  >
                    {creatingChannel ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Criar Persona
                  </button>
                  <button 
                    className="btn-ghost btn-sm" 
                    onClick={() => { 
                      setShowNewChannel(false); 
                      setNewChannelName(''); 
                      setNewChannelCategory(''); 
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="btn-outline btn-sm" 
                onClick={() => setShowNewChannel(true)}
              >
                <Plus size={14} /> Nova Persona
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
