import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, CheckCircle2, Globe, Instagram, Facebook, Twitter, Loader2 } from 'lucide-react';
import {
  listChannels, createChannel, updateChannel, deleteChannel,
  listSocialAccounts, createSocialAccount, deleteSocialAccount,
} from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteChannel, CorteSocialAccount } from '../../types/cortes';

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  youtube: <Globe size={14} />,
  instagram: <Instagram size={14} />,
  facebook: <Facebook size={14} />,
  twitter: <Twitter size={14} />,
  tiktok: <Globe size={14} />,
};

export function ChannelsManagerView({ onRefresh }: { onRefresh: () => void }) {
  const { addCorteChannel, updateCorteChannel, deleteCorteChannel } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CorteSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelCategory, setChannelCategory] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [accountPlatform, setAccountPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingAcc, setCreatingAcc] = useState(false);

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

  async function handleCreateChannel() {
    if (!channelName.trim() || creating) return;
    setCreating(true);
    try {
      const ch = await createChannel({ name: channelName.trim(), category: channelCategory.trim() || undefined, description: channelDesc.trim() || undefined });
      addCorteChannel(ch);
      setChannels(prev => [...prev, ch]);
      setChannelName('');
      setChannelCategory('');
      setChannelDesc('');
      setAddingChannel(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to create channel', e);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteChannel(id: string) {
    if (!confirm('Remover este canal?')) return;
    try {
      await deleteChannel(id);
      deleteCorteChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      onRefresh();
    } catch (e) {
      console.error('Failed to delete channel', e);
    }
  }

  async function handleAddAccount() {
    if (!accountId.trim() || creatingAcc) return;
    setCreatingAcc(true);
    try {
      const acc = await createSocialAccount({ platform: accountPlatform, accountId: accountId.trim(), displayName: accountHandle.trim() || undefined });
      addCorteSocialAccount(acc);
      setSocialAccounts(prev => [...prev, acc]);
      setAccountId('');
      setAccountHandle('');
      setAddingAccount(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to add account', e);
    } finally {
      setCreatingAcc(false);
    }
  }

  async function handleDeleteAccount(id: string) {
    try {
      await deleteSocialAccount(id);
      deleteCorteSocialAccount(id);
      setSocialAccounts(prev => prev.filter(a => a.id !== id));
      onRefresh();
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  }

  if (loading) {
    return <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando canais...</span></div>;
  }

  return (
    <div className="cortes-channels">
      {/* Seção: Redes Sociais */}
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>Redes Sociais</h2>
          <p>Contas cadastradas — vinculadas aos canais abaixo</p>
        </div>
        <div className="cortes-card">
          <div className="cortes-card-body">
            {/* Lista de contas */}
            <div className="cortes-social-list">
              {socialAccounts.length === 0 ? (
                <div className="empty-state"><p>Nenhuma rede social cadastrada ainda.</p></div>
              ) : (
                socialAccounts.map(acc => (
                  <div key={acc.id} className="cortes-social-item">
                    <div className="cortes-social-item-left">
                      <div className="cortes-platform-badge">{PLATFORM_ICON[acc.platform] || <Globe size={14} />}</div>
                      <div>
                        <span className="cortes-social-platform">{acc.platform.toUpperCase()}</span>
                        <span className="cortes-social-handle">{acc.displayName || acc.accountId}</span>
                      </div>
                    </div>
                    <button className="btn-icon-danger" onClick={() => handleDeleteAccount(acc.id)} title="Remover conta"><Trash2 size={14} /></button>
                  </div>
                ))
              )}
            </div>

            {/* Formulário para adicionar */}
            {addingAccount ? (
              <div className="cortes-social-form">
                <select value={accountPlatform} onChange={e => setAccountPlatform(e.target.value)}>
                  {['youtube', 'instagram', 'facebook', 'twitter', 'tiktok'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <input type="text" placeholder="ID / Link da conta" value={accountId} onChange={e => setAccountId(e.target.value)} />
                <input type="text" placeholder="Nome de exibição (opcional)" value={accountHandle} onChange={e => setAccountHandle(e.target.value)} />
                <div className="cortes-form-actions">
                  <button className="btn-primary btn-sm" onClick={handleAddAccount} disabled={creatingAcc}>
                    {creatingAcc ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />} Salvar
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setAddingAccount(false); setAccountId(''); setAccountHandle(''); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn-outline btn-sm" onClick={() => setAddingAccount(true)}>
                <Plus size={14} /> Adicionar rede social
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Seção: Canais */}
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>Canais</h2>
          <p>Gerencie seus canais e associe redes sociais a cada um</p>
        </div>
        <div className="cortes-card">
          <div className="cortes-card-body">
            {/* Lista de canais */}
            <div className="cortes-channel-list">
              {channels.length === 0 ? (
                <div className="empty-state"><p>Nenhum canal cadastrado ainda.</p></div>
              ) : (
                channels.map(ch => (
                  <div key={ch.id} className="cortes-channel-item">
                    <div className="cortes-channel-info">
                      <span className="cortes-channel-name">{ch.name}</span>
                      {ch.category && <span className="cortes-channel-category">{ch.category}</span>}
                      <div className="cortes-channel-accounts">
                        {socialAccounts.filter(sa => ch.socialAccountIds?.includes(sa.id)).map(sa => (
                          <span key={sa.id} className="cortes-account-tag">
                            {PLATFORM_ICON[sa.platform]} {sa.displayName || sa.accountId}
                          </span>
                        ))}
                        {(!ch.socialAccountIds || ch.socialAccountIds.length === 0) && <span className="cortes-empty-tag">Nenhuma rede associada</span>}
                      </div>
                    </div>
                    <div className="cortes-channel-actions">
                      <button className="btn-icon" title="Editar" onClick={() => alert('Funcionalidade em desenvolvimento')}><Pencil size={14} /></button>
                      <button className="btn-icon-danger" title="Remover" onClick={() => handleDeleteChannel(ch.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulário para adicionar canal */}
            {addingChannel ? (
              <div className="cortes-channel-form">
                <input type="text" placeholder="Nome do canal" value={channelName} onChange={e => setChannelName(e.target.value)} />
                <input type="text" placeholder="Categoria (ex: Comédia, Terror)" value={channelCategory} onChange={e => setChannelCategory(e.target.value)} />
                <textarea placeholder="Descrição (opcional)" rows={2} value={channelDesc} onChange={e => setChannelDesc(e.target.value)} />
                <div className="cortes-form-actions">
                  <button className="btn-primary btn-sm" onClick={handleCreateChannel} disabled={creating || !channelName.trim()}>
                    {creating ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Criar canal
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setAddingChannel(false); setChannelName(''); setChannelCategory(''); setChannelDesc(''); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn-outline btn-sm" onClick={() => setAddingChannel(true)}>
                <Plus size={14} /> Adicionar canal
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
