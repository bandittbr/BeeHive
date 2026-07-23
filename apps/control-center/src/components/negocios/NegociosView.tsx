// Módulo Negócios — negócios digitais autônomos (Cortes / Dark / Afiliados).
// Extraído do App.tsx para facilitar a evolução da Fase 4.
import { useState } from 'react';
import { Plus, X, Scissors, Link2, Clapperboard, Loader2, Sparkles, Video, Download, CheckCircle2, Calendar } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateContentPackage } from '../../services/contentPipeline';
import { generateCortes, type CorteClip } from '../../services/cortesPipeline';
import { publishToYoutube } from '../../services/publish';
import { hasYoutubeCreds } from '../../services/credentials';
import { computeSlots, schedulePost } from '../../services/scheduler';
import { ScheduleView } from './ScheduleView';
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

export function NegociosView() {
  return (
    <div className="negocios">
      <div className="page-header">
        <div>
          <h1>Negócios</h1>
          <p>Seus negócios digitais autônomos — cortes, criação de conteúdo e afiliados</p>
        </div>
      </div>

      <ScheduleView />

      <div className="biz-types">
        {BIZ_TYPES.map((type) => <BizTypeSection key={type.id} type={type} />)}
      </div>
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
    if (!hasYoutubeCreds()) { setSchedMsg('Cadastre o YouTube em Settings → Conexões (e clique em "Ativar postagem automática").'); return; }
    setSchedBusy(true); setSchedMsg('Agendando...');
    const slots = computeSlots(cortesClips.length, [biz.postSchedule || ''], biz.postsPerDay || 1);
    let ok = 0;
    for (let i = 0; i < cortesClips.length; i++) {
      const c = cortesClips[i];
      const res = await schedulePost({
        file: c.file,
        title: c.title || `${biz.name} — corte ${i + 1}`,
        description: biz.description || '',
        tags: (biz.niche || biz.name).split(/[\s,]+/).filter(Boolean).slice(0, 10),
        at: slots[i] ?? Date.now(),
      });
      if (res.ok) ok++;
    }
    const first = slots[0] ? new Date(slots[0]).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    setSchedMsg(`${ok}/${cortesClips.length} agendado(s). Primeiro: ${first}. O servidor publica sozinho.`);
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
      setCortesBusy(false); setCortesMsgSafe(setCortesMsg);
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
