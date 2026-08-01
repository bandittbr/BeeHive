import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  listChannels, createChannel, deleteChannel,
  listSocialAccounts, createSocialAccount, deleteSocialAccount,
} from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteChannel, CorteSocialAccount } from '../../types/cortes';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'facebook', label: 'Facebook', icon: 'f' },
  { id: 'twitter', label: 'X/Twitter', icon: '𝕏' },
  { id: 'tiktok', label: 'TikTok', icon: '♪' },
];

export function ChannelsManagerView({ onRefresh }: { onRefresh: () => void }) {
  const { addCorteChannel, deleteCorteChannel, addCorteSocialAccount, deleteCorteSocialAccount } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para expansão das personas
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  
  // Estado para formulário de nova conta
  const [addingAccount, setAddingAccount] = useState<string | null>(null); // channelId sendo adicionado
  const [accountPlatform, setAccountPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [creatingAcc, setCreatingAcc] = useState(false);
  
  // Estado para novo canal
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  useEffect(() => { loadAll(); }, []);

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
      // Expandir automaticamente o novo canal
      setExpandedChannels(prev => new Set([...prev, ch.id]));
      onRefresh();
    } catch (e) {
      console.error('Failed to create channel', e);
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
      setSocialAccounts(prev => prev.filter(a => a.channelIds?.includes(id) === false));
      setExpandedChannels(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to delete channel', e);
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
        platform: accountPlatform, 
        accountId: accountId.trim(), 
        displayName: accountHandle.trim() || undefined 
      });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      
      // Atualizar o canal com a nova conta
      const currentChannel = channels.find(c => c.id === channelId);
      const newSocialAccountIds = [...(currentChannel?.socialAccountIds || []), acc.id];
      const updatedChannels = channels.map(c => 
        c.id === channelId ? { ...c, socialAccountIds: newSocialAccountIds } : c
      );
      setChannels(updatedChannels);
      await handleUpdateChannel(channelId, { socialAccountIds: newSocialAccountIds });
      
      setAccountId('');
      setAccountHandle('');
      setAddingAccount(null);
      onRefresh();
    } catch (e) {
      console.error('Failed to add account', e);
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
      
      // Remover do canal
      const currentChannel = channels.find(c => c.id === channelId);
      const newIds = (currentChannel?.socialAccountIds || []).filter(id => id !== accountIdStr);
      const updatedChannels = channels.map(c => 
        c.id === channelId ? { ...c, socialAccountIds: newIds } : c
      );
      setChannels(updatedChannels);
      await handleUpdateChannel(channelId, { socialAccountIds: newIds });
      onRefresh();
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  }

  async function handleUpdateChannel(id: string, data: Partial<CorteChannel>) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
      const updated = { ...channels.find(c => c.id === id)!, ...data };
      setChannels(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) {
      console.error('Failed to update channel', e);
    }
  }

  if (loading) {
    return <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando...</span></div>;
  }

  return (
    <div className="cortes-channels">
      {/* Seção: Personas */}
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>Personas / Canais</h2>
          <p>Crie personas para organizar suas contas por projeto ou nicho</p>
        </div>
        
        <div className="cortes-card">
          <div className="cortes-card-body">
            {/* Lista de personas */}
            <div className="cortes-channel-list">
              {channels.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma persona cadastrada ainda.</p>
                  <p className="cortes-help-text">Crie uma persona (ex: "Risadola Cortes") para organizar suas contas de rede social.</p>
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

                      {/* Conteúdo expandido - contas desta persona */}
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
                                    <div className="cortes-platform-badge">
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

                          {/* Botão para adicionar conta */}
                          {addingAccount === ch.id ? (
                            <div className="cortes-social-form">
                              <select value={accountPlatform} onChange={e => setAccountPlatform(e.target.value)}>
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
                                setAccountPlatform('youtube');
                                setAccountId('');
                                setAccountHandle('');
                              }}
                            >
                              <Plus size={14} /> Adicionar rede social
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Botão para adicionar nova persona */}
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
