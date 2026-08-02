import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Key, Globe, CheckCircle2, X, RefreshCw } from 'lucide-react';
import {
  listChannels, createChannel, deleteChannel,
  listSocialAccounts, createSocialAccount, deleteSocialAccount, updateChannel,
} from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import { WORKER_BASE_URL } from '../../services/cortes-api';
import type { CorteChannel, CorteSocialAccount } from '../../types/cortes';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'instagram', label: 'Instagram', icon: '📷', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2' },
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
  { id: 'tiktok', label: 'TikTok', icon: '♪', color: '#00F2EA' },
];

const BACKEND_URL = WORKER_BASE_URL;

export function ChannelsManagerView({ onRefresh }: { onRefresh: () => void }) {
  const { addCorteChannel, deleteCorteChannel, addCorteSocialAccount, deleteCorteSocialAccount, updateCorteChannel } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  
  // OAuth state
  const [oauthChannelId, setOauthChannelId] = useState<string | null>(null);
  const [oauthPlatform, setOauthPlatform] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'waiting' | 'connecting' | 'success' | 'error'>('idle');
  const [oauthError, setOauthError] = useState<string>('');
  
  // Credenciais OAuth por plataforma
  const [oauthCreds, setOauthCreds] = useState<Record<string, { clientId: string; clientSecret: string }>>({});
  const [savingCreds, setSavingCreds] = useState<string | null>(null);
  
  // Formulário manual
  const [addingManual, setAddingManual] = useState<string | null>(null);
  const [manualPlatform, setManualPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [creatingAcc, setCreatingAcc] = useState(false);
  
  // Nova persona
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('connected');
    const accountId = params.get('accountId');
    const displayName = params.get('displayName');
    const channelId = params.get('channelId');
    if (!platform || !accountId || !channelId) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    void (async () => {
      await createSocialAccount({ platform, accountId, displayName: displayName || undefined, channelId });
      await loadAll();
      setExpandedChannels((previous) => new Set([...previous, channelId]));
      onRefresh();
    })().catch((error) => { setOauthStatus('error'); setOauthError(error instanceof Error ? error.message : String(error)); });
  }, []);
  // DEBUG: Escuta callback OAuth na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const platform = urlParams.get('platform');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDesc = urlParams.get('error_description');
    
    console.log('[OAuth Debug] URL Params:', { code, platform, state, error, errorDesc });
    
    if (error) {
      console.error('[OAuth Debug] Erro no OAuth:', error, errorDesc);
      setOauthStatus('error');
      setOauthError(`Erro: ${error} - ${errorDesc || 'Verifique as credenciais'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (code && platform && state) {
      console.log('[OAuth Debug] Código recebido, trocando por tokens...');
      handleOAuthCallback(platform, code, state);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [ch, acc] = await Promise.all([listChannels(), listSocialAccounts()]);
      console.log('[Debug] Canais carregados:', ch);
      console.log('[Debug] Contas sociais:', acc);
      
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
      console.log('[Debug] Canal criado:', ch);
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

  // Iniciar OAuth
  function startOAuth(platform: string, channelId: string) {
    const cred = oauthCreds[platform];
    if (!cred?.clientId || !cred.clientSecret) {
      alert('Por favor, salve as credenciais OAuth primeiro!');
      return;
    }
    
    console.log('[OAuth Debug] Iniciando OAuth:', { platform, channelId });
    setOauthChannelId(channelId);
    setOauthPlatform(platform);
    setOauthStatus('waiting');
    setOauthError('');
    
    // Redireciona para o backend OAuth
    const authUrl = `${BACKEND_URL}/oauth/${platform}/start?channelId=${encodeURIComponent(channelId)}`;
    
    console.log('[OAuth Debug] Redirecionando para:', authUrl);
    window.location.href = authUrl;
  }

  // Callback OAuth
  async function handleOAuthCallback(platform: string, code: string, channelId: string) {
    console.log('[OAuth Debug] Processando callback:', { platform, code, channelId });
    setOauthStatus('connecting');
    
    try {
      // Troca o código por tokens
      const redirectUri = `${BACKEND_URL}/oauth/${platform}/callback`;
      const tokenRes = await fetch(`${BACKEND_URL}/oauth/${platform}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      });
      
      if (!tokenRes.ok) {
        throw new Error(`Falha ao trocar código: ${tokenRes.status}`);
      }
      
      const tokenData = await tokenRes.json();
      console.log('[OAuth Debug] Tokens obtidos:', tokenData);
      
      // Cria a conta na API de cortes
      const account = await createSocialAccount({
        platform,
        accountId: tokenData.accountId,
        displayName: tokenData.displayName,
        channelId,
      });
      
      console.log('[OAuth Debug] Conta criada:', account);
      
      // Adiciona à persona
      addCorteSocialAccount(account);
      setSocialAccounts(prev => [...prev, account]);
      
      const currentChannel = channels.find(c => c.id === channelId);
      if (currentChannel) {
        const newSocialAccountIds = [...(currentChannel.socialAccountIds || []), account.id];
        const updatedChannels = channels.map(c => 
          c.id === channelId ? { ...c, socialAccountIds: newSocialAccountIds } : c
        );
        setChannels(updatedChannels);
        await updateChannel(channelId, { socialAccountIds: newSocialAccountIds });
      }
      
      setOauthStatus('success');
      onRefresh();
      
      setTimeout(() => {
        setOauthChannelId(null);
        setOauthPlatform(null);
        setOauthStatus('idle');
      }, 2000);
      
    } catch (e) {
      console.error('[OAuth Debug] Erro no callback:', e);
      setOauthStatus('error');
      setOauthError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSaveCreds(platform: string) {
    const cred = oauthCreds[platform];
    if (!cred?.clientId || !cred.clientSecret) {
      alert('Preencha Client ID e Client Secret');
      return;
    }
    setSavingCreds(platform);
    try {
      const res = await fetch(`${BACKEND_URL}/oauth/apps/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cred.clientId, clientSecret: cred.clientSecret }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      alert('Credenciais salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingCreds(null);
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
        displayName: accountHandle.trim() || undefined,
        channelId,
      });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      
      const currentChannel = channels.find(c => c.id === channelId);
      if (currentChannel) {
        const newIds = [...(currentChannel.socialAccountIds || []), acc.id];
        setChannels(prev => prev.map(c => c.id === channelId ? { ...c, socialAccountIds: newIds } : c));
        await updateChannel(channelId, { socialAccountIds: newIds });
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
        setChannels(prev => prev.map(c => c.id === channelId ? { ...c, socialAccountIds: newIds } : c));
        await updateChannel(channelId, { socialAccountIds: newIds });
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
      {/* Status OAuth */}
      {oauthStatus !== 'idle' && (
        <div className={`cortes-oauth-status ${oauthStatus}`}>
          {oauthStatus === 'waiting' && (
            <div className="cortes-oauth-waiting">
              <Loader2 size={20} className="spin" />
              <span>Redirecionando para o Google...</span>
            </div>
          )}
          {oauthStatus === 'connecting' && (
            <div className="cortes-oauth-connecting">
              <Loader2 size={20} className="spin" />
              <span>Conectando conta...</span>
            </div>
          )}
          {oauthStatus === 'success' && (
            <div className="cortes-oauth-success">
              <CheckCircle2 size={20} />
              <span>Conta conectada com sucesso!</span>
            </div>
          )}
          {oauthStatus === 'error' && (
            <div className="cortes-oauth-error">
              <X size={20} />
              <span>{oauthError}</span>
              <button onClick={() => setOauthStatus('idle')}>Fechar</button>
            </div>
          )}
        </div>
      )}

      {/* Lista de personas */}
      <div className="cortes-personas-list">
        {channels.length === 0 ? (
          <div className="cortes-empty-state">
            <Key size={48} />
            <h3>Comece criando sua primeira persona</h3>
            <p>Personas ajudam a organizar suas contas de rede social por projeto ou nicho</p>
          </div>
        ) : (
          channels.map(ch => {
            const channelAccounts = socialAccounts.filter(sa => ch.socialAccountIds?.includes(sa.id));
            const isExpanded = expandedChannels.has(ch.id);
            
            return (
              <div key={ch.id} className="cortes-persona-card">
                <div className="cortes-persona-header">
                  <button className="cortes-toggle-btn" onClick={() => toggleChannel(ch.id)}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="cortes-persona-info">
                    <h3 className="cortes-persona-name">{ch.name}</h3>
                    {ch.category && <span className="cortes-persona-category">{ch.category}</span>}
                    <span className="cortes-account-badge">
                      {channelAccounts.length} conta{channelAccounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="btn-icon-danger" onClick={() => handleDeleteChannel(ch.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="cortes-persona-content">
                    {/* OAuth Section */}
                    <div className="cortes-oauth-section">
                      <h4>Redes desta persona</h4>
                      <p className="cortes-help-text">Cada conta conectada aqui sera usada somente pelos cortes desta persona.</p>
                      
                      <div className="cortes-platforms-grid">
                        {PLATFORMS.map(p => {
                          const cred = oauthCreds[p.id];
                          const hasCreds = cred?.clientId && cred.clientSecret;
                          const hasConnection = channelAccounts.some(a => a.platform === p.id);
                          const isConnecting = oauthPlatform === p.id && oauthChannelId === ch.id;
                          
                          return (
                            <div key={p.id} className={`cortes-platform-config ${hasConnection ? 'connected' : ''}`}>
                              <div className="cortes-platform-header">
                                <span className="cortes-platform-icon" style={{ color: p.color }}>{p.icon}</span>
                                <span className="cortes-platform-name">{p.label}</span>
                                {hasConnection && <CheckCircle2 size={16} color="var(--success)" />}
                              </div>
                              
                              {!hasConnection ? (
                                <div className="cortes-oauth-form">
                                  <input 
                                    type="text"
                                    placeholder="Client ID"
                                    value={cred?.clientId || ''}
                                    onChange={e => setOauthCreds(prev => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], clientId: e.target.value }
                                    }))}
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Client Secret"
                                    value={cred?.clientSecret || ''}
                                    onChange={e => setOauthCreds(prev => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], clientSecret: e.target.value }
                                    }))}
                                  />
                                  <div className="cortes-oauth-actions">
                                    <button 
                                      className="btn-primary btn-sm"
                                      onClick={() => handleSaveCreds(p.id)}
                                      disabled={savingCreds === p.id || !cred?.clientId || !cred?.clientSecret}
                                    >
                                      {savingCreds === p.id ? <Loader2 size={12} className="spin" /> : <Key size={12} />} Salvar
                                    </button>
                                    {hasCreds && (
                                      <button 
                                        className="btn-outline btn-sm"
                                        onClick={() => startOAuth(p.id, ch.id)}
                                        disabled={isConnecting}
                                      >
                                        {isConnecting ? <Loader2 size={12} className="spin" /> : <Globe size={12} />} Conectar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="cortes-connected-info">
                                  <span>✓ Conectado</span>
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

                    {/* Contas Conectadas */}
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
                            <button className="btn-icon-sm" onClick={() => handleDeleteAccount(acc.id, ch.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual Add */}
                    {addingManual === ch.id ? (
                      <div className="cortes-manual-form">
                        <select value={manualPlatform} onChange={e => setManualPlatform(e.target.value)}>
                          {PLATFORMS.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                        </select>
                        <input type="text" placeholder="ID ou Link da conta" value={accountId} onChange={e => setAccountId(e.target.value)} />
                        <input type="text" placeholder="Nome (opcional)" value={accountHandle} onChange={e => setAccountHandle(e.target.value)} />
                        <div className="cortes-form-actions">
                          <button className="btn-primary btn-sm" onClick={() => handleAddManual(ch.id)} disabled={creatingAcc || !accountId.trim()}>
                            {creatingAcc ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Adicionar
                          </button>
                          <button className="btn-ghost btn-sm" onClick={() => setAddingManual(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-outline" onClick={() => setAddingManual(ch.id)}>
                        <Plus size={14} /> Adicionar manualmente
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button className="btn-primary" onClick={() => setShowNewChannel(true)}>
        <Plus size={16} /> Nova Persona
      </button>

      {showNewChannel && (
        <div className="new-project-modal-overlay" onClick={() => setShowNewChannel(false)}>
          <div className="new-project-modal cortes-persona-modal" onClick={(event) => event.stopPropagation()}>
            <div className="new-project-modal-header">
              <h2 className="new-project-modal-title">Criar persona</h2>
              <button className="btn-close-modal" onClick={() => setShowNewChannel(false)} aria-label="Fechar">x</button>
            </div>
            <div className="new-project-modal-body">
              <p className="form-hint">Esta persona tera suas proprias redes sociais e sua propria agenda de publicacao.</p>
              <div className="cortes-new-channel-form">
                <input autoFocus type="text" placeholder="Nome (ex: Risadola Cortes)" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                <input type="text" placeholder="Nicho ou categoria (opcional)" value={newChannelCategory} onChange={e => setNewChannelCategory(e.target.value)} />
                <div className="cortes-form-actions">
                  <button className="btn-primary" onClick={handleCreateChannel} disabled={creatingChannel || !newChannelName.trim()}>
                    {creatingChannel ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Criar persona
                  </button>
                  <button className="btn-ghost" onClick={() => setShowNewChannel(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
