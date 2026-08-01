import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
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
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountPlatform, setAccountPlatform] = useState('youtube');
  const [accountId, setAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
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

  async function handleAddAccount() {
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
      setAccountId('');
      setAccountHandle('');
      setAddingAccount(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to add account', e);
      alert('Erro ao adicionar conta: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreatingAcc(false);
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('Remover esta conta?')) return;
    try {
      await deleteSocialAccount(id);
      deleteCorteSocialAccount(id);
      setSocialAccounts(prev => prev.filter(a => a.id !== id));
      onRefresh();
    } catch (e) {
      console.error('Failed to delete account', e);
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

  if (loading) {
    return <div className="cortes-loading"><Loader2 size={20} className="spin" /><span>Carregando...</span></div>;
  }

  return (
    <div className="cortes-channels">
      <section className="cortes-section">
        <div className="cortes-section-header">
          <h2>Contas Conectadas</h2>
          <p>Cadastre suas contas do YouTube, Instagram, Facebook, TikTok e X</p>
        </div>
        
        <div className="cortes-card">
          <div className="cortes-card-body">
            {/* Lista de contas */}
            <div className="cortes-social-list">
              {socialAccounts.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma conta cadastrada ainda.</p>
                  <p className="cortes-help-text">Adicione seu canal do YouTube e redes sociais para usar os recursos de cortes.</p>
                </div>
              ) : (
                socialAccounts.map(acc => (
                  <div key={acc.id} className="cortes-social-item">
                    <div className="cortes-social-item-left">
                      <div className="cortes-platform-badge">{PLATFORMS.find(p => p.id === acc.platform)?.icon || '•'}</div>
                      <div>
                        <span className="cortes-social-platform">{acc.platform.toUpperCase()}</span>
                        <span className="cortes-social-handle">{acc.displayName || acc.accountId}</span>
                      </div>
                    </div>
                    <button 
                      className="btn-icon-danger" 
                      onClick={() => handleDeleteAccount(acc.id)} 
                      title="Remover conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Formulário para adicionar conta */}
            {addingAccount ? (
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
                    onClick={handleAddAccount} 
                    disabled={creatingAcc}
                  >
                    {creatingAcc ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Adicionar
                  </button>
                  <button 
                    className="btn-ghost btn-sm" 
                    onClick={() => { 
                      setAddingAccount(false); 
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
                onClick={() => setAddingAccount(true)}
              >
                <Plus size={14} /> Adicionar conta
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
