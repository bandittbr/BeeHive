import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/common/Icon';
import { useModel } from '@/context/ModelContext';
import './ModelSelector.css';

interface ModelSelectorProps {
  /** Texto curto para label */
  label?: string;
  /** Se true, mostra apenas o modelo atual com ícone de troca */
  compact?: boolean;
}

const MODEL_OPTIONS = [
  // OpenCode (free) - models with vision
  { providerId: 'opencode', model: 'gpt-4o-mini', label: 'GPT-4o Mini', vision: true, free: true },
  { providerId: 'opencode', model: 'gpt-4o', label: 'GPT-4o', vision: true, free: false },
  { providerId: 'opencode', model: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', vision: true, free: false },
  { providerId: 'opencode', model: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', vision: true, free: false },
  // Ollama local
  { providerId: 'ollama', model: 'llama3.2', label: 'Llama 3.2 (Ollama)', vision: false, free: true },
  { providerId: 'ollama', model: 'llava', label: 'LLaVA (Ollama)', vision: true, free: true },
  { providerId: 'ollama', model: 'llama3.2-vision', label: 'Llama 3.2 Vision (Ollama)', vision: true, free: true },
  // OpenRouter
  { providerId: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenRouter)', vision: true, free: false },
  { providerId: 'openrouter', model: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (OpenRouter)', vision: true, free: false },
  { providerId: 'openrouter', model: 'google/gemini-pro-vision', label: 'Gemini Pro Vision (OpenRouter)', vision: true, free: false },
];

export function ModelSelector({ label = 'Modelo', compact = false }: ModelSelectorProps) {
  const { activeModel, activeProviderId, setModel, setProvider, loading, refresh } = useModel();
  const [open, setOpen] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = MODEL_OPTIONS.find(o => o.model === activeModel && o.providerId === activeProviderId);
  const displayName = currentOption?.label ?? activeModel ?? 'Carregando...';

  const handleSelect = async (option: typeof MODEL_OPTIONS[0]) => {
    if (option.providerId !== activeProviderId) {
      setProviderLoading(option.providerId);
      try {
        await setProvider(option.providerId);
      } finally {
        setProviderLoading(null);
      }
    }
    await setModel(option.model);
    setOpen(false);
  };

  if (loading) {
    return <div className="model-selector loading" title="Carregando modelo...">⟳</div>;
  }

  if (compact) {
    return (
      <div className="model-selector compact" ref={ref}>
        <button
          className="model-selector__trigger"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`Trocar modelo (atual: ${displayName})`}
          title={`Modelo atual: ${displayName}${currentOption?.vision ? ' 👁️' : ''}`}
        >
          <span className="model-selector__name">{displayName}</span>
          {currentOption?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        {open && <ModelDropdown onSelect={handleSelect} current={currentOption} providerLoading={providerLoading} />}
      </div>
    );
  }

  return (
    <div className="model-selector" ref={ref}>
      <label className="model-selector__label">{label}</label>
      <div className="model-selector__trigger-row">
        <button
          className="model-selector__trigger"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`Trocar modelo (atual: ${displayName})`}
        >
          <span className="model-selector__name">{displayName}</span>
          {currentOption?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        <button className="model-selector__refresh" onClick={() => void refresh()} title="Recarregar" disabled={loading}>
          <Icon name={loading ? 'stop' : 'command'} size={14} />
        </button>
      </div>
      {open && <ModelDropdown onSelect={handleSelect} current={currentOption} providerLoading={providerLoading} />}
    </div>
  );
}

function ModelDropdown({
  onSelect,
  current,
  providerLoading,
}: {
  onSelect: (opt: typeof MODEL_OPTIONS[0]) => void;
  current: typeof MODEL_OPTIONS[0] | undefined;
  providerLoading: string | null;
}) {
  return (
    <div className="model-selector__dropdown">
      <div className="model-selector__section">
        <span className="model-selector__section-title">OpenCode (gratuito, vision)</span>
        {MODEL_OPTIONS.filter(o => o.providerId === 'opencode').map(opt => (
          <button
            key={opt.model}
            className={`model-selector__option${current?.model === opt.model && current?.providerId === 'opencode' ? ' model-selector__option--active' : ''}`}
            onClick={() => onSelect(opt)}
            disabled={providerLoading === 'opencode'}
          >
            <span className="model-selector__opt-name">{opt.label}</span>
            {opt.vision && <span className="model-selector__vision">👁️</span>}
            {opt.free && <span className="model-selector__free">grátis</span>}
          </button>
        ))}
      </div>
      <div className="model-selector__section">
        <span className="model-selector__section-title">Ollama (local)</span>
        {MODEL_OPTIONS.filter(o => o.providerId === 'ollama').map(opt => (
          <button
            key={opt.model}
            className={`model-selector__option${current?.model === opt.model && current?.providerId === 'ollama' ? ' model-selector__option--active' : ''}`}
            onClick={() => onSelect(opt)}
            disabled={providerLoading === 'ollama'}
          >
            <span className="model-selector__opt-name">{opt.label}</span>
            {opt.vision && <span className="model-selector__vision">👁️</span>}
            {opt.free && <span className="model-selector__free">grátis</span>}
          </button>
        ))}
      </div>
      <div className="model-selector__section">
        <span className="model-selector__section-title">OpenRouter (pago)</span>
        {MODEL_OPTIONS.filter(o => o.providerId === 'openrouter').map(opt => (
          <button
            key={opt.model}
            className={`model-selector__option${current?.model === opt.model && current?.providerId === 'openrouter' ? ' model-selector__option--active' : ''}`}
            onClick={() => onSelect(opt)}
            disabled={providerLoading === 'openrouter'}
          >
            <span className="model-selector__opt-name">{opt.label}</span>
            {opt.vision && <span className="model-selector__vision">👁️</span>}
          </button>
        ))}
      </div>
    </div>
  );
}