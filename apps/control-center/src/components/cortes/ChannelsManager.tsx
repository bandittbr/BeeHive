import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Settings, Globe } from 'lucide-react';
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

// URL base do Railway
const BACKEND_URL = 'https://beehive-production-d895.up.railway.app';

interface PlatformConfig {
  platform: string;
  clientId?: string;
  clientSecret?: string;
  connectedAccountId?: string;
  displayName?: string;
}

export function ChannelsManagerView({ onRefresh }: { onRefresh: () => void }) {
  const { addCorteChannel, deleteCorteChannel, addCorteSocialAccount, deleteCorteSocialAccount } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para expansão das personas
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  
  // Estado para novo canal
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  
  // Estado para configuração OAuth de cada plataforma
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfig>>({});
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<{ platform: string; channelId: string } | null>(null);
  
  // Estado para formulário manual
  const [addingManual, setAddingManual] = useState<string | null>(null);
  const [manualPlatform, setManualPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [creatingAcc, setCreatingAcc] = useState(false);

  useEffect(() => { loadAll(); }, []);

  // Escuta callback do OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const accountIdParam = urlParams.get('accountId');
    const displayName = urlParams.get('displayName');
    const state = urlParams.get('state');
    
    if (connected && accountIdParam && state) {
      handleOAuthCallback(connected, accountIdParam, displayName || undefined, state);
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
      
      // Load platform configs
      const configs: Record<string, PlatformConfig> = {};
      acc.forEach(a => {
        configs[a.platform] = {
          platform: a.platform,
          connectedAccountId: a.id,
          displayName: a.displayName,
        };
      });
      setPlatformConfigs(configs);
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
      // Expande automaticamente para configurar contas
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
    setOauthState({ platform, channelId });
    const redirectUri = `${window.location.origin}/`;
    window.open(
      `${BACKEND_URL}/oauth/${platform}/start?redirectUri=${encodeURIComponent(redirectUri)}&state=${channelId}`,
      'oauth_popup',
      'width=600,height=500,left=' + (window.screen.width/2 - 300) + ',top=' + (window.screen.height/2 - 250)
    );
  }

  async function handleOAuthCallback(platform: string, accountId: string, displayName?: string, channelId?: string) {
    if (!channelId) {
      alert('Erro: ID da persona não encontrado');
      return;
    }
    try {
      const acc = await createSocialAccount({ 
        platform, 
        accountId, 
        displayName: displayName || accountId
      });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      
      // Adiciona à persona
      const currentChannel = channels.find(c => c.id === channelId);
      if (currentChannel) {
        const newSocialAccountIds = [...(currentChannel.socialAccountIds || []), acc.id];
        const updatedChannels = channels.map(c => 
          c.id === channelId ? { ...c, socialAccountIds: newSocialAccountIds } : c
        );
        setChannels(updatedChannels);
      }
      
      setOauthState(null);
      onRefresh();
    } catch (e) {
      alert('Erro ao conectar conta: ' + (e instanceof Error ? e.message : String(e)));
      setOauthState(null);
    }
  }

  async function handleSavePlatformConfig(platform: string, clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      alert('Preencha Client ID e Client Secret');
      return;
    }
    setSavingConfig(platform);
    try {
      const res = await fetch(`${BACKEND_URL}/oauth/apps/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setPlatformConfigs(prev => ({
        ...prev,
        [platform]: { platform, clientId, clientSecret }
      }));
    } catch (e) {
      alert('Erro ao salvar: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingConfig(null);
    }
  }

  async function handleAddManual(channelId: string) {
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
      if (currentChannel) {
        const newSocialAccountIds = [...(currentChannel.socialAccountIds || []), acc.id];
        const updatedChannels = channels.map(c => 
          c.id === channelId ? { ...c, socialAccountIds: newSocialAccountIds } : c
        );
        setChannels(updatedChannels);
      }
      
      setAccountId('');
      setAccountHandle('');
      setAddingManual(null);
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
      if (currentChannel) {
        const newIds = (currentChannel.socialAccountIds || []).filter(id => id !== accountIdStr);
        const updatedChannels = channels.map(c => 
          c.id === channelId ? { ...c, socialAccountIds: newIds } : c
        );
        setChannels(updatedChannels);
      }
      onRefresh();
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  }

  if (loading) {
    return <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando...</span></div>;
  }

  return (
    <div className="cortes-channels">
      {/* Lista de personas */}
      <div className="cortes-personas-list">
        {channels.length === 0 ? (
          <div className="cortes-empty-state">
            <Globe size={48} />
            <h3>Comece criando sua primeira persona</h3>
            <p>Personas ajudam a organizar suas contas de rede social por projeto ou nicho</p>
          </div>
        ) : (
          channels.map(ch => {
            const channelAccounts = socialAccounts.filter(sa => ch.socialAccountIds?.includes(sa.id));
            const isExpanded = expandedChannels.has(ch.id);
            
            return (
              <div key={ch.id} className="cortes-persona-card">
                {/* Header da Persona */}
                <div className="cortes-persona-header">
                  <button 
                    className="cortes-toggle-btn"
                    onClick={() => toggleChannel(ch.id)}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="cortes-persona-info">
                    <h3 className="cortes-persona-name">{ch.name}</h3>
                    {ch.category && <span className="cortes-persona-category">{ch.category}</span>}
                    <span className="cortes-account-badge">
                      {channelAccounts.length} conta{channelAccounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button 
                    className="btn-icon-danger" 
                    onClick={() => handleDeleteChannel(ch.id)}
                    title="Excluir persona"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="cortes-persona-content">
                    {/* Configuração OAuth por plataforma */}
                    <div className="cortes-oauth-config-section">
                      <h4>🔑 Configurar Conexões</h4>
                      <p className="cortes-help-text">Adicione as credenciais OAuth para conectar suas contas</p>
                      
                      <div className="cortes-platform-config-grid">
                        {PLATFORMS.map(p => {
                          const config = platformConfigs[p.id] || {};
                          const hasConnection = channelAccounts.some(a => a.platform === p.id);
                          const isSaving = savingConfig === p.id;
                          
                          return (
                            <div key={p.id} className={`cortes-platform-config ${hasConnection ? 'connected' : ''}`}>
                              <div className="cortes-platform-header">
                                <span className="cortes-platform-icon" style={{ color: p.color }}>{p.icon}</span>
                                <span className="cortes-platform-name">{p.label}</span>
                                {hasConnection && <span className="cortes-connected-badge">✓ Conectado</span>}
                              </div>
                              
                              {!hasConnection && (
                                <div className="cortes-oauth-form">
                                  <input 
                                    type="text"
                                    placeholder="Client ID"
                                    value={config.clientId || ''}
                                    onChange={e => setPlatformConfigs(prev => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], clientId: e.target.value }
                                    }))}
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Client Secret"
                                    value={config.clientSecret || ''}
                                    onChange={e => setPlatformConfigs(prev => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], clientSecret: e.target.value }
                                    }))}
                                  />
                                  <div className="cortes-oauth-actions">
                                    <button 
                                      className="btn-primary btn-sm"
                                      onClick={() => handleSavePlatformConfig(p.id, config.clientId || '', config.clientSecret || '')}
                                      disabled={isSaving || !config.clientId || !config.clientSecret}
                                    >
                                      {isSaving ? <Loader2 size={12} className="spin" /> : <Settings size={12} />} Salvar
                                    </button>
                                    <button 
                                      className="btn-outline btn-sm"
                                      onClick={() => startOAuth(p.id, ch.id)}
                                      disabled={!config.clientId || !config.clientSecret}
                                    >
                                      <Globe size={12} /> Conectar
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {hasConnection && (
                                <div className="cortes-connected-account">
                                  <span className="cortes-account-display">Conectado como: {config.displayName || 'Conta conectada'}</span>
                                  <button 
                                    className="btn-ghost btn-xs"
                                    onClick={() => {
                                      const acc = channelAccounts.find(a => a.platform === p.id);
                                      if (acc) handleDeleteAccount(acc.id, ch.id);
                                    }}
                                  >
                                    Desconectar
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Contas já conectadas */}
                    {channelAccounts.length > 0 && (
                      <div className="cortes-connected-accounts">
                        <h4>Contas Conectadas</h4>
                        {channelAccounts.map(acc => (
                          <div key={acc.id} className="cortes-account-item">
                            <div className="cortes-account-icon" style={{ color: PLATFORMS.find(p => p.id === acc.platform)?.color }}>
                              {PLATFORMS.find(p => p.id === acc.platform)?.icon}
                            </div>
                            <div className="cortes-account-info">
                              <span className="cortes-account-platform">{acc.platform.toUpperCase()}</span>
                              <span className="cortes-account-name">{acc.displayName || acc.accountId}</span>
                            </div>
                            <button 
                              className="btn-icon-sm"
                              onClick={() => handleDeleteAccount(acc.id, ch.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adicionar manualmente */}
                    {addingManual === ch.id ? (
                      <div className="cortes-manual-form">
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
                          placeholder="Nome (opcional)" 
                          value={accountHandle}
                          onChange={e => setAccountHandle(e.target.value)}
                        />
                        <div className="cortes-form-actions">
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => handleAddManual(ch.id)}
                            disabled={creatingAcc || !accountId.trim()}
                          >
                            {creatingAcc ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Adicionar
                          </button>
                          <button 
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              setAddingManual(null);
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
                        className="btn-outline"
                        onClick={() => setAddingManual(ch.id)}
                      >
                        <Plus size={14} /> Adicionar conta manualmente
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botão para nova persona */}
      <button 
        className="btn-primary"
        onClick={() => setShowNewChannel(true)}
      >
        <Plus size={16} /> Nova Persona
      </button>

      {/* Formulário de nova persona */}
      {showNewChannel && (
        <div className="cortes-new-channel-form">
          <h3>Nova Persona</h3>
          <input 
            type="text" 
            placeholder="Nome (ex: Risadola Cortes)" 
            value={newChannelName}
            onChange={e => setNewChannelName(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Categoria (opcional, ex: Comédia)" 
            value={newChannelCategory}
            onChange={e => setNewChannelCategory(e.target.value)}
          />
          <div className="cortes-form-actions">
            <button 
              className="btn-primary"
              onClick={handleCreateChannel}
              disabled={creatingChannel || !newChannelName.trim()}
            >
              {creatingChannel ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Criar Persona
            </button>
            <button 
              className="btn-ghost"
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
      )}
    </div>
  );
}
