/**
 * Modelos Virtuais — componente principal
 * Cadastro de modelos, fotos, agendamento e logs de postagem.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, ChevronRight, Play, ImageIcon, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  listModels, addModel, updateModel, deleteModel,
  listModelPhotos, listModelLogs, triggerModelosTick,
  type VirtualModel, type VirtualModelLog,
  modelStatusLabel,
} from '../../services/modelosService';

export function ModelosVirtuais() {
  const [models, setModels] = useState<VirtualModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tickMsg, setTickMsg] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const m = await listModels();
      setModels(m);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async (data: { name: string; postsPerDay: number }) => {
    try {
      await addModel(data);
      setCreating(false);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao criar modelo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este modelo e todos os seus logs?')) return;
    if (await deleteModel(id)) await reload();
  };

  const handleTick = async () => {
    setTickMsg('Processando...');
    try {
      await triggerModelosTick();
      setTickMsg('Tick executado!');
      setTimeout(() => setTickMsg(''), 3000);
    } catch (e) {
      setTickMsg(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={20} /> Modelos Virtuais
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Cadastre modelos, coloque fotos na pasta e o BeeHive posta automaticamente com legendas geradas por IA
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={handleTick} disabled={tickMsg === 'Processando...'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Play size={14} /> Executar tick
          </button>
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Plus size={14} /> Novo modelo
          </button>
        </div>
      </div>
      {tickMsg && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {tickMsg.includes('Erro') ? <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--danger)' }} /> : null}
          {tickMsg}
        </p>
      )}

      {/* Create form */}
      {creating && <NewModelForm onCreate={handleCreate} onCancel={() => setCreating(false)} />}

      {/* Instructions */}
      <div style={{
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: '#F59E0B' }}>📸 Como funciona:</strong>
        <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          <li>Crie um modelo (ex: "Ana Modelo")</li>
          <li>Coloque fotos na pasta <code>modelos/&lt;id-do-modelo&gt;/photos/</code> do servidor</li>
          <li>O BeeHive posta automaticamente a cada 30 minutos, sem repetir fotos</li>
          <li>Cada postagem gera legenda com IA e publica nas contas conectadas</li>
        </ol>
      </div>

      {/* Model list */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>
          <Loader2 size={14} className="spin" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Carregando...
        </p>
      ) : models.length === 0 ? (
        <div className="empty-state biz-empty">
          <p>Nenhum modelo virtual cadastrado ainda. Crie um e coloque fotos na pasta para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {models.map((m) => (
            <ModelCard key={m.id} model={m} onDelete={handleDelete} onChange={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- New Model Form ----

function NewModelForm({ onCreate, onCancel }: {
  onCreate: (data: { name: string; postsPerDay: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!name.trim()) { setErr('Nome é obrigatório'); return; }
    setBusy(true); setErr('');
    await onCreate({ name: name.trim(), postsPerDay: Math.max(1, postsPerDay) });
    setBusy(false);
  };

  return (
    <div className="biz-new-form" style={{ marginBottom: 16 }}>
      <div className="form-group">
        <label>Nome do modelo</label>
        <input type="text" placeholder="Ex: Ana Modelo" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Posts por dia</label>
        <input type="number" min={1} max={30} value={postsPerDay} onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      {err && <p style={{ fontSize: 11.5, color: 'var(--danger)', gridColumn: '1 / -1' }}>{err}</p>}
      <div className="biz-new-form-actions">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={13} className="spin" /> : null} Criar modelo
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ---- Model Card ----

function ModelCard({ model, onDelete, onChange }: {
  model: VirtualModel;
  onDelete: (id: string) => void;
  onChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadedDetail, setLoadedDetail] = useState(false);
  const [photos, setPhotos] = useState<{ all: string[]; unused: string[] }>({ all: [], unused: [] });
  const [logs, setLogs] = useState<VirtualModelLog[]>([]);
  const [postsPerDay, setPostsPerDay] = useState(model.postsPerDay);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadDetail = async () => {
    const [ph, lg] = await Promise.all([
      listModelPhotos(model.id),
      listModelLogs(model.id),
    ]);
    setPhotos(ph);
    setLogs(lg);
    setLoadedDetail(true);
  };

  useEffect(() => {
    if (expanded && !loadedDetail) loadDetail();
  }, [expanded, loadedDetail]);

  const toggleActive = async () => {
    await updateModel(model.id, { active: !model.active });
    onChange();
  };

  const saveSettings = async () => {
    setSaving(true); setSavedMsg('');
    const res = await updateModel(model.id, { postsPerDay });
    setSavedMsg('Salvo!');
    setSaving(false);
    setTimeout(() => setSavedMsg(''), 2000);
    onChange();
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface, transparent)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: model.active ? 'rgba(34,197,94,0.12)' : 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: model.active ? '#22c55e' : 'var(--text-muted)',
          }}>
            <ImageIcon size={16} />
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{model.name}</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {model.postsPerDay}/dia · {photos.all.length || 0} foto(s) · {model.accounts.length} conta(s)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="status-pill"
            onClick={(e) => { e.stopPropagation(); toggleActive(); }}
            style={{
              background: model.active ? 'rgba(34,197,94,0.15)' : 'transparent',
              color: model.active ? '#22c55e' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', fontSize: 11,
            }}
          >
            {modelStatusLabel(model.active)}
          </span>
          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Posts por dia</label>
              <input type="number" min={1} max={30} value={postsPerDay}
                onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))}
                style={{ fontSize: 12, padding: '6px 8px', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn-primary" onClick={saveSettings} disabled={saving}
                style={{ fontSize: 11.5, padding: '6px 12px' }}>
                {saving ? <Loader2 size={12} className="spin" /> : null} {savedMsg || 'Salvar'}
              </button>
            </div>
          </div>

          {/* Photo folder info */}
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12,
          }}>
            <strong style={{ color: 'var(--text)' }}>Pasta de fotos:</strong>{' '}
            <code style={{ fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{model.photoDir}</code>
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
              {photos.all.length === 0 ? (
                <span style={{ color: '#f59e0b' }}>⚠️ Nenhuma foto encontrada. Coloque arquivos .jpg/.png na pasta acima.</span>
              ) : (
                <span>📸 {photos.all.length} foto(s) no total, {photos.unused.length} ainda não postada(s)</span>
              )}
            </div>
          </div>

          {/* Connected accounts */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contas conectadas ({model.accounts.length})
            </span>
            {model.accounts.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Nenhuma conta conectada. Edite o modelo via API para adicionar contas (em breve no frontend).
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {model.accounts.map((a, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                  }}>
                    {a.platform}: {a.accountId}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Logs */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Últimas postagens ({logs.length})
            </span>
            {logs.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Nenhuma postagem ainda. O BeeHive posta automaticamente ou clique em "Executar tick" acima.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
                  }}>
                    {/* Status icon */}
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      {log.status === 'done' ? <CheckCircle2 size={14} color="#22c55e" /> :
                       log.status === 'error' ? <XCircle size={14} color="#ef4444" /> :
                       <Clock size={14} color="#f59e0b" />}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {log.photoFile && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>📷 {log.photoFile}</span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(log.runAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {log.caption && (
                        <p style={{ margin: '4px 0 0', color: 'var(--text)', fontSize: 11.5, lineHeight: 1.4 }}>
                          "{log.caption.slice(0, 120)}{log.caption.length > 120 ? '...' : ''}"
                        </p>
                      )}
                      {log.publishedTo && log.publishedTo.length > 0 && (
                        <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#22c55e' }}>
                          ✅ {log.publishedTo.join(', ')}
                        </p>
                      )}
                      {log.error && (
                        <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--danger)' }}>⚠️ {log.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete button */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <button
              onClick={() => onDelete(model.id)}
              style={{ fontSize: 11.5, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Trash2 size={13} /> Remover modelo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
