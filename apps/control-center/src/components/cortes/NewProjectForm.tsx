import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { listChannels, createProject } from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteChannel } from '../../types/cortes';

const FORMAT_OPTIONS = [
  { value: '9:16', label: '9:16 — Vertical' },
  { value: '1:1', label: '1:1 — Quadrado' },
  { value: '16:9', label: '16:9 — Horizontal' },
];
const DURATION_PRESETS = [15, 20, 25, 30];

interface NewProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewProjectForm({ onSuccess, onCancel }: NewProjectFormProps) {
  const { addCorteProject, corteChannels } = useAppStore();
  const [channels, setChannels] = useState<CorteChannel[]>(corteChannels);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(15);
  const [customDuration, setCustomDuration] = useState('');
  const [format, setFormat] = useState('9:16');
  const [autoHighlights, setAutoHighlights] = useState(true);
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [autoTitle, setAutoTitle] = useState(true);
  const [autoDescription, setAutoDescription] = useState(true);
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    listChannels().then(setChannels).catch(console.error);
  }, []);

  const isCustomDuration = duration === 0;

  async function handleSubmit() {
    if (!url.trim() || !name.trim()) {
      setErr('Preencha a URL e o nome do projeto.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setErr('Cole um link válido do YouTube.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const effectiveDuration = isCustomDuration ? Number(customDuration) || 15 : duration;
      const project = await createProject({
        url: url.trim(),
        name: name.trim(),
        channelId: channelId || undefined,
        quantity,
        duration: effectiveDuration,
        format,
        autoHighlights,
        autoCaptions,
        autoTitle,
        autoDescription,
        autoHashtags,
      });
      addCorteProject(project);
      onSuccess();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cortes-new-project">
      <div className="cortes-new-project-header">
        <h2>Novo Projeto</h2>
        <button className="btn-icon" onClick={onCancel}><X size={18} /></button>
      </div>

      <div className="cortes-new-project-body">
        {/* URL */}
        <div className="cortes-form-group">
          <label>URL do vídeo do YouTube</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        {/* Nome */}
        <div className="cortes-form-group">
          <label>Nome do projeto</label>
          <input
            type="text"
            placeholder="Ex: Cortes Comédia"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Canal */}
        <div className="cortes-form-group">
          <label>Canal de destino</label>
          <select value={channelId} onChange={e => setChannelId(e.target.value)}>
            <option value="">— Nenhum canal —</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}{ch.category ? ` (${ch.category})` : ''}</option>)}
          </select>
          {channels.length === 0 && <p className="cortes-help-text">Nenhum canal cadastrado. Cadastre em "Canais" primeiro.</p>}
        </div>

        {/* Quantidade e Duração */}
        <div className="cortes-form-row">
          <div className="cortes-form-group">
            <label>Quantidade de cortes</label>
            <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
              {[1, 2, 3, 5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="cortes-form-group">
            <label>Duração desejada (s)</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
              {DURATION_PRESETS.map(d => <option key={d} value={d}>{d}s</option>)}
              <option value={0}>Personalizado</option>
            </select>
          </div>
        </div>

        {isCustomDuration && (
          <div className="cortes-form-group">
            <label>Duração personalizada (segundos)</label>
            <input
              type="number" min={5} max={120}
              placeholder="Ex: 22"
              value={customDuration}
              onChange={e => setCustomDuration(e.target.value)}
            />
          </div>
        )}

        {/* Formato */}
        <div className="cortes-form-group">
          <label>Formato do vídeo</label>
          <div className="cortes-format-options">
            {FORMAT_OPTIONS.map(f => (
              <button
                key={f.value}
                className={`cortes-format-btn${format === f.value ? ' active' : ''}`}
                onClick={() => setFormat(f.value)}
              >
                <div 
                  className="cortes-format-preview" 
                  style={{ aspectRatio: f.value === '9:16' ? '9/16' : f.value === '1:1' ? '1/1' : '16/9' }}
                />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Opções de geração */}
        <div className="cortes-checkboxes">
          <label className="cortes-check-label">
            <input type="checkbox" checked={autoHighlights} onChange={e => setAutoHighlights(e.target.checked)} />
            Selecionar melhores momentos com IA
          </label>
          <label className="cortes-check-label">
            <input type="checkbox" checked={autoCaptions} onChange={e => setAutoCaptions(e.target.checked)} />
            Gerar legendas dinâmicas
          </label>
          <label className="cortes-check-label">
            <input type="checkbox" checked={autoTitle} onChange={e => setAutoTitle(e.target.checked)} />
            Gerar título
          </label>
          <label className="cortes-check-label">
            <input type="checkbox" checked={autoDescription} onChange={e => setAutoDescription(e.target.checked)} />
            Gerar descrição
          </label>
          <label className="cortes-check-label">
            <input type="checkbox" checked={autoHashtags} onChange={e => setAutoHashtags(e.target.checked)} />
            Gerar hashtags
          </label>
        </div>

        {err && <p className="cortes-error-text">{err}</p>}

        <div className="cortes-submit-row">
          <button 
            className="btn-primary" 
            onClick={handleSubmit} 
            disabled={busy || !url.trim() || !name.trim()}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
            {busy ? 'Criando projeto...' : 'CRIAR E GERAR CORTES'}
          </button>
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
