// Módulo Negócios — negócios digitais autônomos (Cortes / Dark / Afiliados / Leads).
// Extraído do App.tsx para facilitar a evolução da Fase 4.
import { useState, useEffect } from 'react';
import { Plus, X, Scissors, Link2, Clapperboard, Loader2, Sparkles, Video, Download, CheckCircle2, Calendar, Bot, Play, Trash2, ChevronRight, BarChart3, Globe, Users } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateContentPackage } from '../../services/contentPipeline';
import { generateCortes, type CorteClip } from '../../services/cortesPipeline';
import { publishToYoutube } from '../../services/publish';
import { hasYoutubeCreds, hasInstagramCreds, hasFacebookCreds, hasTiktokCreds } from '../../services/credentials';
import { computeSlots, schedulePost, listAccounts, type PlatformId, type ConnectedAccount } from '../../services/scheduler';
import {
  listPilots, createPilot, updatePilot, deletePilot,
  listPilotChannels, addPilotChannel, removeClipChannel,
  listPilotHistory, runPilotNow,
  type ClipPilot, type ClipChannel, type ClipHistoryEntry,
} from '../../services/autoclip';
import { ScheduleView } from './ScheduleView';
import { LeadsView } from './LeadsView';
import type { BizType, BizAccount, SocialAccount } from '../../types';

interface BizTypeConfig {
  id: BizType;
  name: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  fieldLabel: string;
  fieldPlaceholder: string;
}

const BIZ_TYPES: BizTypeConfig[] = [
  {
    id: 'cortes', name: 'Cortes de Vídeos', color: '#7C3AED', icon: Scissors,
    desc: 'Pega um vídeo grande, encontra os melhores momentos, corta em vertical com legenda e (em breve) publica sozinho nas redes.',
    fieldLabel: 'Horário de postagem', fieldPlaceholder: 'Ex: 12:00, 18:00, 21:00',
  },
  {
    id: 'conteudo', name: 'Canal Dark / Criador de Conteúdo', color: '#6366F1', icon: Clapperboard,
    desc: 'Gera vídeos e conteúdo do zero de acordo com o nicho — histórias, fitness, culinária, terror, etc.',
    fieldLabel: 'Nicho', fieldPlaceholder: 'Ex: fitness, humor, terror...',
  },
  {
    id: 'afiliados', name: 'Afiliados', color: '#3B82F6', icon: Link2,
    desc: 'Divulga produtos com link de afiliado nas redes cadastradas para gerar vendas.',
    fieldLabel: 'Nicho / produtos', fieldPlaceholder: 'Ex: eletrônicos, moda, casa...',
  },
];

const SOCIAL_PLATFORMS: { id: SocialAccount['platform']; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'X / Twitter' },
];

type NegociosSubArea = 'conteudo' | 'leads';

export function NegociosView() {
  const [subArea, setSubArea] = useState<NegociosSubArea>('conteudo');

  return (
    <div className="negocios">
      <div className="page-header">
        <div>
          <h1>Negócios</h1>
          <p>Seus negócios digitais autônomos — cortes, criação de conteúdo, afiliados e prospecção de leads</p>
        </div>
      </div>

      {/* Sub-navegação */}
      <div className="negocios-subnav">
        <button
          className={`negocios-subnav-btn${subArea === 'conteudo' ? ' active' : ''}`}
          onClick={() => setSubArea('conteudo')}
        >
          <Clapperboard size={16} /> Conteúdo Digital
        </button>
        <button
          className={`negocios-subnav-btn${subArea === 'leads' ? ' active' : ''}`}
          onClick={() => setSubArea('leads')}
        >
          <Users size={16} /> Leads
        </button>
      </div>

      {subArea === 'conteudo' && (
        <>
          <AutopilotPanel />
          <ScheduleView />
          <div className="biz-types">
            {BIZ_TYPES.map((type) => <BizTypeSection key={type.id} type={type} />)}
          </div>
        </>
      )}

      {subArea === 'leads' && (
        <LeadsView />
      )}
    </div>
  );
}

// Piloto automático: cada piloto é uma automação independente (ex.: "Humor",
// "Terror", "Tech") com seus próprios canais fonte e contas-alvo, escolhidas
// dentre as cadastradas em Settings → Conexões. O agente descobre vídeo novo,
// corta e agenda a publicação sozinho, sem precisar abrir o app.
const PLATFORM_LABEL: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };
const sectionLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };

function AutopilotPanel() {
  const [pilots, setPilots] = useState<ClipPilot[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [pl, accLists] = await Promise.all([
      listPilots(),
      Promise.all((['youtube', 'instagram', 'facebook', 'tiktok'] as const).map((p) => listAccounts(p))),
    ]);
    setPilots(pl);
    setAccounts(accLists.flat());
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const handleCreate = async (data: { name: string; niche?: string; description?: string; postsPerDay: number; discoveryMode?: boolean; minDurationMin?: number }) => {
    const res = await createPilot(data);
    if (res.ok) { setCreating(false); await reload(); }
    return res;
  };

  return (
    <section className="biz-type-section" style={{ marginBottom: 24 }}>
      <div className="biz-type-header" style={{ '--biz-color': '#F59E0B' } as React.CSSProperties}>
        <div className="biz-type-icon" style={{ background: '#F59E0B1f', color: '#F59E0B' }}><Bot size={20} /></div>
        <div className="biz-type-info">
          <h2>Piloto automático de cortes</h2>
          <p>Cada piloto monitora seus canais, corta os melhores momentos com legenda e publica sozinho nas contas que você escolher — mesmo com o app fechado.</p>
        </div>
        <button className="btn-primary biz-type-add" onClick={() => setCreating((v) => !v)}>
          <Plus size={14} /> Novo piloto
        </button>
      </div>

      {creating && <NewPilotForm onCreate={handleCreate} onCancel={() => setCreating(false)} />}

      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Carregando...</p>
      ) : pilots.length === 0 ? (
        <div className="empty-state biz-empty"><p>Nenhum piloto criado ainda. Crie um pra cada nicho/grupo de contas (ex.: "Humor" com 2 contas, "Terror" com outras 2).</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pilots.map((p) => <PilotCard key={p.id} pilot={p} accounts={accounts} onChange={reload} />)}
        </div>
      )}
    </section>
  );
}

function NewPilotForm({ onCreate, onCancel }: {
  onCreate: (data: { name: string; niche?: string; description?: string; postsPerDay: number; discoveryMode?: boolean; minDurationMin?: number }) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [minDurationMin, setMinDurationMin] = useState(60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!name.trim()) { setErr('Dê um nome pro piloto (ex: "Humor").'); return; }
    setBusy(true); setErr('');
    const res = await onCreate({ name: name.trim(), niche: niche.trim() || undefined, description: description.trim() || undefined, postsPerDay, discoveryMode, minDurationMin });
    setBusy(false);
    if (!res.ok) setErr(res.error || 'Falha ao criar.');
  };

  return (
    <div className="biz-new-form">
      <div className="form-group">
        <label>Nome do piloto</label>
        <input type="text" placeholder="Ex: Humor" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Nicho / hashtags</label>
        <input type="text" placeholder="Ex: humor, comédia" value={niche} onChange={(e) => setNiche(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Posts por dia</label>
        <input type="number" min={1} max={20} value={postsPerDay} onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label>Descrição padrão dos posts (opcional)</label>
        <textarea rows={2} placeholder="Texto/legenda que acompanha todo corte publicado por esse piloto" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={discoveryMode} onChange={(e) => setDiscoveryMode(e.target.checked)} />
          Busca automática (sem escolher canal — o BeeHive procura vídeos do nicho sozinho)
        </label>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Busca no YouTube por vídeos do nicho acima, recentes (até 30 dias) e com mais visualizações/curtidas.
        </p>
      </div>
      {discoveryMode && (
        <div className="form-group">
          <label>Duração mínima do vídeo fonte (minutos)</label>
          <input type="number" min={1} max={600} value={minDurationMin} onChange={(e) => setMinDurationMin(Math.max(1, Number(e.target.value) || 60))} />
        </div>
      )}
      {err && <p style={{ fontSize: 11.5, color: 'var(--danger)', gridColumn: '1 / -1' }}>{err}</p>}
      <div className="biz-new-form-actions">
        <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : null} Criar piloto</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function PilotCard({ pilot, accounts, onChange }: { pilot: ClipPilot; accounts: ConnectedAccount[]; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loadedDetail, setLoadedDetail] = useState(false);
  const [channels, setChannels] = useState<ClipChannel[]>([]);
  const [history, setHistory] = useState<ClipHistoryEntry[]>([]);
  const [postsPerDay, setPostsPerDay] = useState(pilot.postsPerDay);
  const [times, setTimes] = useState(pilot.times || '');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(pilot.accountIds);
  const [discoveryMode, setDiscoveryMode] = useState(pilot.discoveryMode);
  const [minDurationMin, setMinDurationMin] = useState(pilot.minDurationMin || 60);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelLabel, setNewChannelLabel] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState('');

  const loadDetail = async () => {
    const [ch, hist] = await Promise.all([listPilotChannels(pilot.id), listPilotHistory(pilot.id)]);
    setChannels(ch); setHistory(hist); setLoadedDetail(true);
  };
  useEffect(() => { if (expanded && !loadedDetail) loadDetail(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [expanded]);

  const toggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updatePilot(pilot.id, { active: !pilot.active });
    onChange();
  };

  const saveSettings = async () => {
    setSaving(true); setSavedMsg('');
    const res = await updatePilot(pilot.id, { postsPerDay, times, accountIds: selectedAccounts, discoveryMode, minDurationMin });
    setSavedMsg(res.ok ? 'Salvo!' : (res.error || 'Falha ao salvar.'));
    setSaving(false);
    setTimeout(() => setSavedMsg(''), 2000);
    onChange();
  };

  const toggleAccount = (id: string) => setSelectedAccounts((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addChannel = async () => {
    if (!newChannelUrl.trim() || addingChannel) return;
    setAddingChannel(true);
    const res = await addPilotChannel(pilot.id, newChannelUrl.trim(), newChannelLabel.trim() || undefined);
    if (res.ok) { setNewChannelUrl(''); setNewChannelLabel(''); await loadDetail(); }
    setAddingChannel(false);
  };

  const removeChannel = async (id: string) => {
    if (await removeClipChannel(id)) setChannels((cs) => cs.filter((c) => c.id !== id));
  };

  const runNow = async () => {
    setRunning(true); setRunMsg('');
    const res = await runPilotNow(pilot.id);
    setRunMsg(res.ok ? 'Rodando em segundo plano — confira o histórico em alguns minutos.' : (res.error || 'Falha ao iniciar.'));
    setRunning(false);
    setTimeout(loadDetail, 8000);
  };

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remover o piloto "${pilot.name}"? Isso também remove os canais dele.`)) return;
    await deletePilot(pilot.id);
    onChange();
  };

  const statusLabel = (s: ClipHistoryEntry['status']) => s === 'done' ? { text: 'ok', color: '#22c55e' } : s === 'skipped' ? { text: 'pulado', color: 'var(--text-muted)' } : { text: 'erro', color: 'var(--danger)' };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
        <div>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{pilot.name}</span>
          {pilot.niche && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · {pilot.niche}</span>}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pilot.accountIds.length} conta(s) · {pilot.postsPerDay}/dia</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="status-pill" onClick={toggleActive}
            style={{ background: pilot.active ? 'rgba(34,197,94,0.15)' : undefined, color: pilot.active ? '#22c55e' : undefined, border: 'none', cursor: 'pointer' }}>
            {pilot.active ? 'Ativo' : 'Inativo'}
          </button>
          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label>Posts por dia</label>
              <input type="number" min={1} max={20} value={postsPerDay} onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="form-group">
              <label>Horários (opcional)</label>
              <input type="text" placeholder="Ex: 12:00, 18:00, 21:00" value={times} onChange={(e) => setTimes(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}>
              <input type="checkbox" checked={discoveryMode} onChange={(e) => setDiscoveryMode(e.target.checked)} />
              Busca automática (sem canal fixo — procura vídeos do nicho sozinho)
            </label>
            {discoveryMode && (
              <div className="form-group" style={{ maxWidth: 220, marginTop: 8 }}>
                <label>Duração mínima do vídeo fonte (minutos)</label>
                <input type="number" min={1} max={600} value={minDurationMin} onChange={(e) => setMinDurationMin(Math.max(1, Number(e.target.value) || 60))} />
              </div>
            )}
          </div>

          <div>
            <span style={sectionLabelStyle}>Contas-alvo ({selectedAccounts.length} selecionada{selectedAccounts.length === 1 ? '' : 's'})</span>
            {accounts.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>Nenhuma conta cadastrada ainda — vá em Settings → Conexões e cadastre pelo menos uma.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {accounts.map((a) => {
                  const on = selectedAccounts.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleAccount(a.id)}
                      style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', background: on ? '#F59E0B' : 'transparent', color: on ? 'white' : 'var(--text-secondary)' }}>
                      {PLATFORM_LABEL[a.platform] ?? a.platform}: {a.displayName || a.accountId}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 size={13} className="spin" /> : null} {savedMsg || 'Salvar'}
            </button>
            <button className="btn-ghost" onClick={runNow} disabled={running || !pilot.active}
              title={pilot.active ? '' : 'Ative o piloto antes de rodar'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Rodar agora
            </button>
            <button onClick={remove} style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remover piloto</button>
          </div>
          {runMsg && <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{runMsg}</p>}

          {discoveryMode ? (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
              <span style={sectionLabelStyle}>Canais fonte</span>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Busca automática ativada — não precisa cadastrar canal. O BeeHive procura vídeos de "{pilot.niche || pilot.name}"
                {' '}com mais de {minDurationMin} min, recentes e com mais visualizações/curtidas.
              </p>
            </div>
          ) : (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <span style={sectionLabelStyle}>Canais fonte ({channels.length})</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <input type="text" placeholder="Link do canal (ex: youtube.com/@canal)" value={newChannelUrl}
                onChange={(e) => setNewChannelUrl(e.target.value)}
                style={{ flex: '1 1 220px', minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '7px 9px', outline: 'none' }} />
              <input type="text" placeholder="Rótulo (opcional)" value={newChannelLabel}
                onChange={(e) => setNewChannelLabel(e.target.value)}
                style={{ flex: '0 1 140px', minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '7px 9px', outline: 'none' }} />
              <button onClick={addChannel} disabled={addingChannel || !newChannelUrl.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', color: 'white', background: '#F59E0B', opacity: addingChannel || !newChannelUrl.trim() ? 0.6 : 1 }}>
                {addingChannel ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Adicionar
              </button>
            </div>
            {channels.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>Nenhum canal cadastrado ainda. Adicione canais com autorização (parceria/revenue share) ou os seus próprios.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {channels.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.label ? <strong style={{ color: 'var(--text)' }}>{c.label}: </strong> : null}{c.channelUrl}
                    </span>
                    <button onClick={() => removeChannel(c.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {history.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
              <span style={sectionLabelStyle}>Histórico recente</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {history.slice(0, 10).map((h) => {
                  const st = statusLabel(h.status);
                  return (
                    <div key={`${h.videoId}_${h.processedAt}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}>
                      <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.title || h.videoId}</span>
                      <span style={{ color: st.color, flexShrink: 0 }}>{st.text}{h.status === 'done' ? ` · ${h.clipsGenerated} corte(s)` : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BizTypeSection({ type }: { type: BizTypeConfig }) {
  const { bizAccounts, addBizAccount, deleteBizAccount } = useAppStore();
  const [adding, setAdding] = useState(false);
  const accounts = bizAccounts.filter((b) => b.type === type.id);
  const Icon = type.icon;

  const handleCreate = (data: { name: string; field: string; description: string; postsPerDay: number }) => {
    const biz: BizAccount = {
      id: String(Date.now()),
      type: type.id,
      name: data.name,
      status: 'active',
      socialAccounts: [],
      createdAt: new Date().toISOString(),
      description: data.description || undefined,
      postsPerDay: data.postsPerDay,
      content: [],
      ...(type.id === 'cortes' ? { postSchedule: data.field } : { niche: data.field }),
    };
    addBizAccount(biz);
    setAdding(false);
  };

  return (
    <section className="biz-type-section">
      <div className="biz-type-header" style={{ '--biz-color': type.color } as React.CSSProperties}>
        <div className="biz-type-icon" style={{ background: `${type.color}1f`, color: type.color }}><Icon size={20} /></div>
        <div className="biz-type-info">
          <h2>{type.name}</h2>
          <p>{type.desc}</p>
        </div>
        <button className="btn-primary biz-type-add" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Cadastrar
        </button>
      </div>

      {adding && <NewBizForm type={type} onCreate={handleCreate} onCancel={() => setAdding(false)} />}

      {accounts.length === 0 ? (
        <div className="empty-state biz-empty"><p>Nenhum negócio cadastrado em {type.name} ainda.</p></div>
      ) : (
        <div className="biz-account-grid">
          {accounts.map((biz) => (
            <BizAccountCard key={biz.id} biz={biz} color={type.color} fieldLabel={type.fieldLabel} onDelete={() => deleteBizAccount(biz.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function NewBizForm({ type, onCreate, onCancel }: { type: BizTypeConfig; onCreate: (data: { name: string; field: string; description: string; postsPerDay: number }) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [field, setField] = useState('');
  const [description, setDescription] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), field: field.trim(), description: description.trim(), postsPerDay });
    setName(''); setField(''); setDescription(''); setPostsPerDay(1);
  };

  return (
    <div className="biz-new-form">
      <div className="form-group">
        <label>Nome do negócio</label>
        <input type="text" placeholder="Ex: Chris Cortes Comédia" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{type.fieldLabel}</label>
        <input type="text" placeholder={type.fieldPlaceholder} value={field} onChange={(e) => setField(e.target.value)} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label>Descrição / diretrizes de conteúdo</label>
        <textarea rows={2} placeholder="Ex: histórias de terror curtas, tom sombrio, para público jovem..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Postagens por dia</label>
        <input type="number" min={1} max={20} value={postsPerDay} onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <div className="biz-new-form-actions">
        <button className="btn-primary" onClick={submit}>Salvar</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function BizAccountCard({ biz, color, fieldLabel, onDelete }: { biz: BizAccount; color: string; fieldLabel: string; onDelete: () => void }) {
  const { addSocialAccount, removeSocialAccount, updateBizAccount } = useAppStore();
  const [addingSocial, setAddingSocial] = useState(false);
  const [platform, setPlatform] = useState<SocialAccount['platform']>('instagram');
  const [handle, setHandle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Cortes
  const [cortesUrl, setCortesUrl] = useState('');
  const [cortesBusy, setCortesBusy] = useState(false);
  const [cortesMsg, setCortesMsg] = useState('');
  const [cortesErr, setCortesErr] = useState('');
  const [cortesClips, setCortesClips] = useState<CorteClip[]>([]);
  // publicação por clipe (índice → estado)
  const [pub, setPub] = useState<Record<number, { busy?: boolean; url?: string; err?: string }>>({});
  // agendamento em lote
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedMsg, setSchedMsg] = useState('');

  const scheduleAll = async () => {
    if (schedBusy || cortesClips.length === 0) return;
    setSchedBusy(true); setSchedMsg('Preparando destinos...');
    // Monta a lista de destinos: cada conta cadastrada em Settings → Conexões
    // (multi-conta) vira um destino; se não tiver nenhuma conta cadastrada
    // pra uma rede, cai pro formulário único antigo (compat).
    const targets: { platform: PlatformId; accountId?: string }[] = [];
    for (const p of ['youtube', 'instagram', 'facebook', 'tiktok'] as PlatformId[]) {
      const accs = await listAccounts(p);
      if (accs.length) accs.forEach((a) => targets.push({ platform: p, accountId: a.id }));
    }
    if (!targets.some((t) => t.platform === 'youtube') && hasYoutubeCreds()) targets.push({ platform: 'youtube' });
    if (!targets.some((t) => t.platform === 'instagram') && hasInstagramCreds()) targets.push({ platform: 'instagram' });
    if (!targets.some((t) => t.platform === 'facebook') && hasFacebookCreds()) targets.push({ platform: 'facebook' });
    if (!targets.some((t) => t.platform === 'tiktok') && hasTiktokCreds()) targets.push({ platform: 'tiktok' });

    if (targets.length === 0) { setSchedMsg('Configure ao menos uma rede em Settings → Conexões (e clique em "Ativar"/"Conectar").'); setSchedBusy(false); return; }
    setSchedMsg('Agendando...');
    const slots = computeSlots(cortesClips.length, [biz.postSchedule || ''], biz.postsPerDay || 1);
    let ok = 0, total = 0;
    for (let i = 0; i < cortesClips.length; i++) {
      const c = cortesClips[i];
      for (const t of targets) {
        total++;
        const res = await schedulePost({
          file: c.file,
          title: c.title || `${biz.name} — corte ${i + 1}`,
          description: biz.description || '',
          tags: (biz.niche || biz.name).split(/[\s,]+/).filter(Boolean).slice(0, 10),
          at: slots[i] ?? Date.now(),
          platform: t.platform,
          accountId: t.accountId,
        });
        if (res.ok) ok++;
      }
    }
    const first = slots[0] ? new Date(slots[0]).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    setSchedMsg(`${ok}/${total} agendado(s) em ${targets.length} destino(s). Primeiro: ${first}. O servidor publica sozinho.`);
    setSchedBusy(false);
  };

  const publishClip = async (i: number, c: CorteClip) => {
    if (pub[i]?.busy) return;
    if (!hasYoutubeCreds()) {
      setPub((s) => ({ ...s, [i]: { err: 'Cadastre o YouTube em Settings → Conexões.' } }));
      return;
    }
    setPub((s) => ({ ...s, [i]: { busy: true } }));
    const res = await publishToYoutube({
      file: c.file,
      title: c.title || `${biz.name} — corte ${i + 1}`,
      description: biz.description || '',
      tags: (biz.niche || biz.name).split(/[\s,]+/).filter(Boolean).slice(0, 10),
    });
    setPub((s) => ({ ...s, [i]: res.ok ? { url: res.url } : { err: res.error } }));
  };

  const runCortes = async () => {
    if (cortesBusy || !cortesUrl.trim()) return;
    setCortesBusy(true); setCortesErr(''); setCortesClips([]); setCortesMsg('Iniciando...');
    try {
      const res = await generateCortes({ url: cortesUrl.trim(), onProgress: setCortesMsg });
      if (res.error) setCortesErr(res.error);
      setCortesClips(res.clips);
    } finally {
      setCortesBusy(false); setCortesMsg('');
    }
  };

  const submitSocial = () => {
    if (!handle.trim()) return;
    addSocialAccount(biz.id, { id: String(Date.now()), platform, handle: handle.trim() });
    setHandle(''); setAddingSocial(false);
  };

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const pkg = await generateContentPackage({
        type: biz.type,
        niche: biz.niche || biz.postSchedule || biz.name,
        description: biz.description,
      });
      updateBizAccount(biz.id, { content: [pkg, ...(biz.content || [])] });
      setExpanded(pkg.id);
    } finally {
      setGenerating(false);
    }
  };

  const sectionLabel = (t: string) => ({ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties);

  return (
    <div className="biz-account-card" style={{ '--biz-color': color } as React.CSSProperties}>
      <div className="biz-account-header">
        <span className="biz-account-name">{biz.name}</span>
        <button
          className={`status-pill ${biz.status === 'active' ? 'connected' : 'disconnected'} biz-status-toggle`}
          onClick={() => updateBizAccount(biz.id, { status: biz.status === 'active' ? 'paused' : 'active' })}
        >
          {biz.status === 'active' ? 'Ativo' : 'Pausado'}
        </button>
      </div>
      {(biz.niche || biz.postSchedule) && (
        <p className="biz-account-field"><span>{fieldLabel}:</span> {biz.niche || biz.postSchedule}</p>
      )}

      {/* Redes vinculadas */}
      <div className="biz-social-chips">
        {biz.socialAccounts.map((sa) => (
          <span key={sa.id} className="biz-social-chip">
            {SOCIAL_PLATFORMS.find((p) => p.id === sa.platform)?.label ?? sa.platform}: {sa.handle}
            <button onClick={() => removeSocialAccount(biz.id, sa.id)}><X size={11} /></button>
          </span>
        ))}
      </div>
      {addingSocial ? (
        <div className="biz-social-form">
          <select value={platform} onChange={(e) => setPlatform(e.target.value as SocialAccount['platform'])}>
            {SOCIAL_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input type="text" placeholder="@usuario" value={handle} onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSocial()} />
          <button className="btn-icon-sm" onClick={submitSocial}><Plus size={14} /></button>
        </div>
      ) : (
        <button className="biz-add-social-btn" onClick={() => setAddingSocial(true)}><Plus size={12} /> Rede social</button>
      )}

      {/* Cortes: baixar vídeo grande → cortar em vertical com legenda */}
      {biz.type === 'cortes' && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
          <span style={sectionLabel('')}>Gerar cortes de um vídeo</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              type="text"
              value={cortesUrl}
              onChange={(e) => setCortesUrl(e.target.value)}
              placeholder="Cole o link do vídeo (YouTube...)"
              style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '7px 9px', outline: 'none' }}
            />
            <button
              onClick={runCortes}
              disabled={cortesBusy || !cortesUrl.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '7px 12px', borderRadius: 6, border: 'none', cursor: cortesBusy ? 'default' : 'pointer', color: 'white', background: color, opacity: cortesBusy || !cortesUrl.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {cortesBusy ? <Loader2 size={13} className="spin" /> : <Scissors size={13} />}
              {cortesBusy ? 'Processando...' : 'Gerar cortes'}
            </button>
          </div>
          {cortesMsg && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} className="spin" /> {cortesMsg}</p>}
          {cortesErr && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 8 }}>{cortesErr}</p>}
          {cortesClips.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0 }}>{cortesClips.length} corte(s) gerado(s):</p>
                <button
                  onClick={scheduleAll}
                  disabled={schedBusy}
                  title="Agendar todos nos horários do negócio"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: schedBusy ? 'default' : 'pointer', color: 'white', background: color, opacity: schedBusy ? 0.6 : 1, whiteSpace: 'nowrap' }}
                >
                  {schedBusy ? <Loader2 size={12} className="spin" /> : <Calendar size={12} />}
                  {schedBusy ? 'Agendando...' : 'Agendar postagens'}
                </button>
              </div>
              {schedMsg && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{schedMsg}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {cortesClips.map((c, i) => (
                  <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <video src={c.url} controls preload="metadata" playsInline style={{ width: '100%', aspectRatio: '9 / 16', background: '#000', display: 'block' }} />
                    <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, fontSize: 10.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || `Corte ${i + 1}`}</span>
                      <a href={c.url} download title="Baixar" style={{ color: 'var(--text-muted)', display: 'flex' }}><Download size={13} /></a>
                    </div>
                    <div style={{ padding: '0 8px 8px' }}>
                      {pub[i]?.url ? (
                        <a href={pub[i].url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#22c55e', textDecoration: 'none' }}>
                          <CheckCircle2 size={12} /> Publicado
                        </a>
                      ) : (
                        <button
                          onClick={() => publishClip(i, c)}
                          disabled={pub[i]?.busy}
                          title="Publicar no YouTube"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: pub[i]?.busy ? 'default' : 'pointer', width: '100%', justifyContent: 'center' }}
                        >
                          {pub[i]?.busy ? <Loader2 size={12} className="spin" /> : <Video size={12} color="#ef4444" />}
                          {pub[i]?.busy ? 'Publicando...' : 'YouTube'}
                        </button>
                      )}
                      {pub[i]?.err && <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4 }}>{pub[i].err}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo gerado (roteiro/título/hashtags) */}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={sectionLabel('')}>Conteúdo {biz.postsPerDay ? `· ${biz.postsPerDay}/dia` : ''}</span>
          <button
            onClick={generate}
            disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: generating ? 'default' : 'pointer', color: 'white', background: color, opacity: generating ? 0.6 : 1 }}
          >
            {generating ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
            {generating ? 'Gerando...' : 'Gerar conteúdo'}
          </button>
        </div>

        {(!biz.content || biz.content.length === 0) ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Nenhum conteúdo gerado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {biz.content.map((c) => (
              <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || c.idea || 'Conteúdo'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{expanded === c.id ? '▲' : '▼'}</span>
                </div>
                {expanded === c.id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.idea && <div><strong style={{ color: 'var(--text)' }}>Ideia:</strong> {c.idea}</div>}
                    {c.script && <div><strong style={{ color: 'var(--text)' }}>Roteiro:</strong><div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>{c.script}</div></div>}
                    {c.description && <div><strong style={{ color: 'var(--text)' }}>Descrição:</strong> {c.description}</div>}
                    {c.hashtags.length > 0 && <div style={{ color: 'var(--primary-light)' }}>{c.hashtags.map((h) => `#${h}`).join(' ')}</div>}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>postagem automática — em construção</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="biz-delete-btn" onClick={onDelete}>Remover negócio</button>
    </div>
  );
}
