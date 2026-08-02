import { useState, useEffect } from 'react';
import { Plus, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  listChannels, createChannel, deleteChannel, updateChannel,
  listSocialAccounts, createSocialAccount, deleteSocialAccount,
  listProjects, createProject, updateProject, deleteProject,
  getSettings, saveSettings,
} from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';
import type { CorteChannel, CorteSocialAccount, CorteProject } from '../../types/cortes';

// Formatos de vídeo suportados
const FORMAT_OPTIONS = [
  { value: '9:16', label: 'Vertical (9:16)', icon: '📱', description: 'TikTok/Reels/Shorts' },
  { value: '1:1', label: 'Quadrado (1:1)', icon: '⬜', description: 'Instagram/Facebook' },
  { value: '16:9', label: 'Horizontal (16:9)', icon: '◼️', description: 'YouTube Desktop' },
];

// Durações predefinidas em segundos
const DURATION_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60];

interface NewProjectFormProps {
  onClose?: () => void;
  onCreated?: (project: CorteProject) => void;
}

export function NewProjectForm({ onClose, onCreated }: NewProjectFormProps = {}) {
  const { 
    corteProjects, 
    addCorteProject, 
    corteChannels,
  } = useAppStore();
  
  // Estados do formulário
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState<string | null>(null); // Agora é opcional
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(15);
  const [format, setFormat] = useState('9:16');
  const [autoHighlights, setAutoHighlights] = useState(true);
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [autoTitle, setAutoTitle] = useState(true);
  const [autoDescription, setAutoDescription] = useState(true);
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [customDuration, setCustomDuration] = useState(''); // Para duração personalizada
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Carregar lista de canais ao montar
  useEffect(() => {
    listChannels()
      .then(channels => {
        if (channels.length > 0 && !channelId) {
          setChannelId(channels[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Verificar se o formulário está válido
  const isFormValid = () => {
    return (
      url.trim().length > 0 &&
      name.trim().length > 0 &&
      quantity >= 1 &&
      duration >= 5 &&
      duration <= 300 && // Máximo 5 minutos
      format !== ''
    );
  };

  // Alternar presets de duração
  const handleDurationPreset = (d: number) => {
    setDuration(d);
    setCustomDuration('');
  };

  // Gerar projeto (teste sem salvar ainda)
  const generatePreview = () => {
    if (!isFormValid()) {
      setErr('Por favor preencha todos os campos obrigatórios');
      return;
    }

    setBusy(true);
    setErr('');

    setTimeout(() => {
      // Simulação de processamento
      setBusy(false);
      alert('Projeto criado com sucesso! Os serão processados em segundo plano.');
    }, 1000);
  };

  // Enviar真实的 criaçãopara o backend
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isFormValid()) {
      setErr('Por favor preencha todos os campos obrigatórios com valores válidos');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      const effectiveDuration = duration;
      
      const project = await createProject({
        url: url.trim(),
        name: name.trim(),
        channelId: channelId || undefined, // Agora é opcional
        quantity: quantity,
        duration: effectiveDuration,
        format: format,
        autoHighlights,
        autoCaptions,
        autoTitle,
        autoDescription,
        autoHashtags,
      });

      // Adicionar à store
      addCorteProject(project);

      // Chamar callback de sucesso se fornecido
      if (onCreated) {
        onCreated(project);
      } else if (onClose) {
        onClose();
      }

      // Limpar formulário
      setUrl('');
      setName('');
      setChannelId(null);
      setQuantity(3);
      setDuration(15);
      setFormat('9:16');
      setAutoHighlights(true);
      setAutoCaptions(true);
      setAutoTitle(true);
      setAutoDescription(true);
      setAutoHashtags(true);
      setErr('');
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      setErr('Falha ao criar projeto. Verifique a conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  // Remover projeto (deletar da lista de testes)
  const handleDeleteProject = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      try {
        await deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
      } catch (e) {
        console.error('Erro ao deletar:', e);
      }
    }
  };

  // Status do projeto
  const getProjectStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return '#3b82f6'; // azul
      case 'processing': return '#f59e0b'; // laranja
      case 'ready': return '#10b981'; // verde
      case 'error': return '#ef4444'; // vermelho
      default: return '#6b7280';
    }
  };

  return (
    <div className="new-project-modal-overlay" onClick={onClose}>
      <div className="new-project-modal" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho do modal */}
        <div className="new-project-modal-header">
          <div className="new-project-modal-title-container">
            <h2 className="new-project-modal-title">
              {onClose ? 'Criar Novo Projeto de Corte' : 'Gerar Cortes'}
            </h2>
            {onClose && (
              <button 
                className="btn-close-modal" 
                onClick={onClose}
                aria-label="Fechar"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Corpo do formulário */}
        <div className="new-project-modal-body">
          <form className="new-project-form" onSubmit={handleSubmit}>
            {/* Erros do formulário */}
            {err && (
              <div className="form-error-banner">
                <AlertCircle size={16} className="form-error-icon" />
                <span className="form-error-text">{err}</span>
              </div>
            )}

            {/* URL do Vídeo - Campo Obrigatório */}
            <div className="form-group required">
              <label htmlFor="video-url" className="form-label">
                URL do vídeo do YouTube 🔗
              </label>
              <input
                type="url"
                id="video-url"
                placeholder="Cole o link completo do YouTube (ex: https://www.youtube.com/watch?v=...)"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className={`form-input ${url.trim().length > 0 ? 'form-input-valid' : ''}`}
                required
              />
              {url.trim().length > 0 && /^https?:\/\/www\.youtube\.com\/watch\?v=/.test(url) && (
                <span className="form-status-indicator form-status-valid">✓ Link válido</span>
              )}
              {url.trim().length > 0 && !/^https?:\/\/www\.youtube\.com\/watch\?v=/.test(url) && (
                <span className="form-status-indicator form-status-warning">⚠ Formato pode não ser suportado</span>
              )}
              {url.trim() === '' && <span className="form-hint">Campo obrigatório</span>}
            </div>

            {/* Nome do Projeto - Campo Obrigatório */}
            <div className="form-group required">
              <label htmlFor="project-name" className="form-label">
                Nome do Projeto ✨
              </label>
              <input
                type="text"
                id="project-name"
                placeholder="Ex: Cortes Comédia, Vlogs Diários, Tech Review"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`form-input ${name.trim().length > 0 ? 'form-input-valid' : ''}`}
                required
              />
              {name.trim().length > 0 && (
                <span className="form-status-indicator form-status-valid">✓ Nome adicionado</span>
              )}
              {name.trim() === '' && <span className="form-hint">Campo obrigatório</span>}
            </div>

            {/* Canal de Destino - Campo Opcional */}
            <div className="form-group">
              <label htmlFor="channel-select" className="form-label">
                Canal de Destapo (Opcional) 👤
              </label>
              <select
                id="channel-select"
                value={channelId || ''}
                onChange={e => setChannelId(e.target.value || null)}
                className="form-select"
              >
                <option value="">Sem canal selecionado</option>
                {corteChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} {channel.category ? `(${channel.category})` : ''}
                  </option>
                ))}
              </select>
              {!channelId && <span className="form-hint">Opcional: associe a esta persona</span>}
            </div>

            {/* Quantidade de Cortes */}
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Quantidades de cortes 🎯
              </label>
              <select
                id="quantity"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="form-select"
              >
                {[1, 2, 3, 5, 8, 10].map(q => (
                  <option key={q} value={q}>{q} corte(s)</option>
                ))}
              </select>
            </div>

            {/* Duração dos Cortes */}
            <div className="form-group">
              <label className="form-label">
                Duração dos cortes ⏱️
              </label>
              
              {/* Opções rápidas */}
              <div className="quick-duration-options">
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`quick-duration-btn ${String(duration) === String(d) ? 'active' : ''}`}
                    onClick={() => handleDurationPreset(d)}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              {/* Custom duration input */}
              <div className="custom-duration-option">
                <label htmlFor="custom-duration" className="custom-duration-label">
                  ou personalize:
                </label>
                <input
                  type="number"
                  id="custom-duration"
                  min="5"
                  max="300"
                  value={customDuration}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomDuration(val);
                    if (val !== '') {
                      setDuration(Math.max(5, Math.min(300, Number(val))));
                    }
                  }}
                  className="custom-duration-input"
                  placeholder="segundos"
                />
                <span className="unit-label">seg</span>
              </div>
            </div>

            {/* Formato do Vídeo */}
            <div className="form-group">
              <label className="form-label">
                Formato do vídeo 📐
              </label>
              
              <div className="format-options-grid">
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`format-option-btn ${format === opt.value ? 'active' : ''}`}
                    onClick={() => setFormat(opt.value)}
                  >
                    <div className="format-option-preview">
                      {opt.icon}
                    </div>
                    <div className="format-option-label">
                      {opt.label}
                    </div>
                    <div className="format-option-description">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configurações de IA (Todas marcadas por padrão) */}
            <div className="form-group ai-features-section">
              <label className="form-label">
                ✨ Otimizações com IA (todas ativadas por padrão)
              </label>
              
              <div className="ai-checkboxes-grid">
                <div className="ai-checkbox-item">
                  <input
                    type="checkbox"
                    id="ai-highlights"
                    checked={autoHighlights}
                    onChange={e => setAutoHighlights(e.target.checked)}
                    className="ai-checkbox"
                  />
                  <label htmlFor="ai-highlights" className="ai-checkbox-label">
                    Melhor moment selection (IA)
                  </label>
                </div>
                
                <div className="ai-checkbox-item">
                  <input
                    type="checkbox"
                    id="ai-captions"
                    checked={autoCaptions}
                    onChange={e => setAutoCaptions(e.target.checked)}
                    className="ai-checkbox"
                  />
                  <label htmlFor="ai-captions" className="ai-checkbox-label">
                        Legendas dinâmicas automatizadas
                  </label>
                </div>
                
                <div className="ai-checkbox-item">
                  <input
                    type="checkbox"
                    id="ai-title"
                    checked={autoTitle}
                    onChange={e => setAutoTitle(e.target.checked)}
                    className="ai-checkbox"
                  />
                  <label htmlFor="ai-title" className="ai-checkbox-label">
                    Título atrativo gerado por IA
                  </label>
                </div>
                
                <div className="ai-checkbox-item">
                  <input
                    type="checkbox"
                    id="ai-description"
                    checked={autoDescription}
                    onChange={e => setAutoDescription(e.target.checked)}
                    className="ai-checkbox"
                  />
                  <label htmlFor="ai-description" className="ai-checkbox-label">
                    Descrição otimizada para SEO
                  </label>
                </div>
                
                <div className="ai-checkbox-item">
                  <input
                    type="checkbox"
                    id="ai-hashtags"
                    checked={autoHashtags}
                    onChange={e => setAutoHashtags(e.target.checked)}
                    className="ai-checkbox"
                  />
                  <label htmlFor="ai-hashtags" className="ai-checkbox-label">
                    Hashtags relevantes automáticas
                  </label>
                </div>
              </div>
              
              <div className="ai-features-help-text">
                <span>💡 Todas as opções de IA estão habilitadas por padrão. Desmarque qualquer uma se preferir controlar manualmente.</span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="form-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (onClose) onClose();
                }}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn btn-primary btn-lg ${!isFormValid() ? 'disabled' : ''}`}
                disabled={busy || !isFormValid()}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Gerar e Publicar Cortes
                  </>
                )}
              </button>
            </div>

            {/* Preview do que será feito (apenas como informação) */}
            <div className="project-preview-info">
              <h4 className="preview-title">📝 Resumo do Projeto:</h4>
              <div className="preview-content">
                <p><strong>Vídeo:</strong> {url.substring(0, 60)}{url.length > 60 ? '...' : ''}</p>
                <p><strong>Nome:</strong> {name}</p>
                <p><strong>Canal:</strong> {channelId ? corteChannels.find(c => c.id === channelId)?.name : 'Sem canal'}</p>
                <p><strong>Quantidade:</strong> {quantity} corte(s)</p>
                <p><strong>Duração:</strong> {duration}s</p>
                <p><strong>Formato:</strong> {format}</p>
                <p><strong>Otimizações IA:</strong> {autoHighlights + autoCaptions + autoTitle + autoDescription + autoHashtags}/5 ativos</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NewProjectForm;
