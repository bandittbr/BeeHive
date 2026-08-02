import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { createProject } from '../../services/cortes-api';
import { useAppStore } from '../../stores/appStore';

interface NewProjectFormProps {
  onClose?: () => void;
  onCreated?: (project: any) => void;
}

export function NewProjectForm({ onClose, onCreated }: NewProjectFormProps = {}) {
  const { corteChannels, addCorteProject } = useAppStore();
  
  // Estados do formulário
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState(corteChannels.length > 0 ? corteChannels[0].id : '');
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(15);
  const [format, setFormat] = useState('9:16');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Verificar se o botão deve estar ativo
  const isButtonActive = () => {
    return url.trim().length > 0 && 
           name.trim().length > 0 && 
           quantity >= 1 &&
           format !== '';
  };

  // Enviar projeto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isButtonActive()) {
      alert('Por favor preencha todos os campos obrigatórios com valores válidos!');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const project = await createProject({
        url: url.trim(),
        name: name.trim(),
        channelId: channelId,
        quantity,
        duration,
        format,
        autoHighlights: true,
        autoCaptions: true,
        autoTitle: true,
        autoDescription: true,
        autoHashtags: true,
      });
      
      addCorteProject(project);
      
      if (onCreated) onCreated(project);
      if (onClose) onClose();
      
      // Resetar formulário
      setUrl('');
      setName('');
      setChannelId(corteChannels.length > 0 ? corteChannels[0].id : '');
      setQuantity(3);
      setDuration(15);
      setFormat('9:16');
      
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      setError('Falha ao criar projeto. Verifique os dados e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  // Opções de formato
  const formatOptions = [
    { value: '9:16', label: 'Vertical (TikTok/Reels)', icon: '📱' },
    { value: '1:1', label: 'Quadrado (Instagram)', icon: '⬜' },
    { value: '16:9', label: 'Horizontal (YouTube)', icon: '◼️' },
  ];

  // Opções de duração
  const durationOptions = [5, 10, 15, 20, 25, 30, 45, 60];

  return (
    <div className="new-project-modal-overlay" onClick={() => onClose?.()}>
      <div className="new-project-modal" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="new-project-modal-header">
          <h2 className="new-project-modal-title">Criar Novo Projeto de Corte</h2>
          <button className="btn-close-modal" onClick={() => onClose?.()} aria-label="Fechar">
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="new-project-modal-body">
          {error && (
            <div className="alert alert-error">
              ❌ {error}
            </div>
          )}

          <form className="new-project-form" onSubmit={handleSubmit}>
            {/* URL do Vídeo */}
            <div className="form-group required">
              <label htmlFor="video-url" className="form-label">
                URL do vídeo do YouTube 🔗
              </label>
              <input
                type="url"
                id="video-url"
                placeholder="Cole o link completo do YouTube..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className={`form-input ${url.trim() ? 'valid' : ''}`}
                required
              />
              <small className="form-hint">Obrigatório - Deve ser um link válido do YouTube</small>
            </div>

            {/* Nome do Projeto */}
            <div className="form-group required">
              <label htmlFor="project-name" className="form-label">
                Nome do Project ✨
              </label>
              <input
                type="text"
                id="project-name"
                placeholder="Ex: Cortes Comédia, Vlogs Diários"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`form-input ${name.trim() ? 'valid' : ''}`}
                required
              />
              <small className="form-hint">Obrigatório - Nome do seu projeto de cortes</small>
            </div>

            {/* Canal de Destino */}
            <div className="form-group">
              <label htmlFor="channel-select" className="form-label">
                Canal de Destapo 👤
              </label>
              <select
                id="channel-select"
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                className="form-select"
              >
                <option value="">Sem canal selecionado (padrão)</option>
                {corteChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} {channel.category ? `(${channel.category})` : ''}
                  </option>
                ))}
              </select>
              <small className="form-hint">Opcional - Associe a esta persona/canal</small>
            </div>

            {/* Quantidade */}
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
                {[1, 2, 3, 4, 5, 8, 10].map(q => (
                  <option key={q} value={q}>{q} corte(s)</option>
                ))}
              </select>
            </div>

            {/* Duração */}
            <div className="form-group">
              <label className="form-label">
                Duração dos cortes ⏱️
              </label>
              
              {/* Opções rápidas */}
              <div className="quick-options">
                {durationOptions.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`quick-option-btn ${String(duration) === String(d) ? 'active' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d}s
                  </button>
                ))}
              </div>
              
              {/* Custom input */}
              <div className="custom-option">
                <input
                  type="number"
                  min="5"
                  max="300"
                  placeholder="segundos"
                  className="custom-input"
                />
                <span className="unit-label">seg</span>
              </div>
            </div>

            {/* Formato */}
            <div className="form-group">
              <label className="form-label">
                Formato do vídeo 📐
              </label>
              
              <div className="options-grid">
                {formatOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`option-btn ${format === opt.value ? 'active' : ''}`}
                    onClick={() => setFormat(opt.value)}
                  >
                    <div className="option-icon">{opt.icon}</div>
                    <div className="option-label">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Features de IA (todas ativadas por padrão) */}
            <div className="ai-features-section">
              <label className="form-label">✨ Otimizações com IA (todas ativadas)</label>
              
              <div className="checkbox-grid">
                <div className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Melhores momentos selectionados por IA</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Legendas dinâmicas automatizadas</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Título atrativo gerado por IA</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Descrição otimizada</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Hashtags relevantes</span>
                </div>
              </div>
              
              <p className="help-text">
                <strong>Nota:</strong> Todas as opções de IA estão habilitadas por padrão para melhores resultados.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose?.()}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn btn-primary btn-lg ${!isButtonActive() ? 'disabled' : ''}`}
                disabled={busy || !isButtonActive()}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Gerar e Publicar Cortes
                  </>
                )}
              </button>
            </div>

            {/* Resumo do Projeto */}
            <div className="project-summary">
              <h4>📝 Resumo do Projeto:</h4>
              <div className="summary-content">
                <p><strong>Vídeo:</strong> {url ? url.substring(0, 50) + '...' : 'Pendente'}</p>
                <p><strong>Name:</strong> {name || 'Pendente'}</p>
                <p><strong>Canal:</strong> {channelId ? corteChannels.find(c => c.id === channelId)?.name || 'Sem canal' : 'Sem canal'}</p>
                <p><strong>Quantidade:</strong> {quantity} corte(s)</p>
                <p><strong>Duração:</strong> {duration}s</p>
                <p><strong>Formato:</strong> {format}</p>
                <p><strong>Otimizações IA:</strong> 5/5 ativos</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NewProjectForm;
