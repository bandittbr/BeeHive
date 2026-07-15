import { useState, useRef, useEffect } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';
import { useModel } from '@/context/ModelContext';
import './ModelSelector.css';

const PROVIDER_ICONS: Record<string, string> = {
  ollama: 'agents',
  opencode: 'code',
  openrouter: 'grid',
  openai: 'code',
  anthropic: 'code',
  groq: 'code',
  together: 'code',
  nvidia: 'code',
  gemini: 'code',
  custom: 'gear',
};

const TIER_LABELS: Record<string, string> = {
  local: 'Local',
  free: 'Gratuito',
  paid: 'Pago',
};

interface ModelSelectorProps {
  label?: string;
  compact?: boolean;
}

export function ModelSelector({ label = 'Modelo', compact = false }: ModelSelectorProps) {
  const {
    activeModel,
    activeProviderId,
    providers,
    loadingProviders,
    setModel,
    refresh,
  } = useModel();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const currentModel = activeProvider?.models.find(m => m.id === activeModel);
  const displayName = currentModel?.name ?? activeModel ?? 'Carregando...';

  const connectedProviders = providers.filter(p => p.hasCredentials && p.isEnabled && p.isRegistered);

  const handleSelectModel = async (model: { id: string; name: string; vision: boolean }) => {
    if (model.id === activeModel) return;
    await setModel(model.id);
    setOpen(false);
  };

  if (loadingProviders) {
    return <div className="model-selector loading" title="Carregando provedores...">⟳</div>;
  }

  if (!connectedProviders.length) {
    return (
      <div className="model-selector no-providers" title="Nenhum provedor conectado">
        <Icon name="warning" size={16} />
        <span>Conecte um provedor em Configurações → Ai Providers</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="model-selector compact" ref={ref}>
        <button
          className="model-selector__trigger"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`Trocar modelo (atual: ${displayName})`}
          title={`Modelo atual: ${displayName}${currentModel?.vision ? ' 👁️' : ''}`}
        >
          <span className="model-selector__name">{displayName}</span>
          {currentModel?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        {open && <ModelDropdown providers={connectedProviders} activeModel={activeModel} onSelectModel={handleSelectModel} />}
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
          {currentModel?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        <button className="model-selector__refresh" onClick={() => void refresh()} title="Recarregar" disabled={loadingProviders}>
          <Icon name={loadingProviders ? 'stop' : 'command'} size={14} />
        </button>
      </div>
      {open && <ModelDropdown providers={connectedProviders} activeModel={activeModel} onSelectModel={handleSelectModel} />}
    </div>
  );
}

interface ModelDropdownProps {
  providers: any[];
  activeModel: string;
  onSelectModel: (model: { id: string; name: string; vision: boolean }) => Promise<void>;
}

function ModelDropdown({ providers, activeModel, onSelectModel }: ModelDropdownProps) {
  const { loadProviderModels } = useModel();

  return (
    <div className="model-selector__dropdown">
      {providers.map(provider => (
        <div key={provider.id} className="model-selector__section">
          <div className="model-selector__section-header">
            <Icon name={(provider.icon && PROVIDER_ICONS[provider.icon] ? PROVIDER_ICONS[provider.icon] : 'gear') as IconName} size={14} />
            <span className="model-selector__provider-name">{provider.name}</span>
            <span className={`model-selector__tier model-selector__tier--${provider.tier}`}>
              {TIER_LABELS[provider.tier] ?? provider.tier}
            </span>
            {provider.loadingModels && <span className="model-selector__loading">⟳</span>}
            {provider.error && <span className="model-selector__error" title={provider.error}>⚠</span>}
          </div>

          <div className="model-selector__models">
            {provider.loadingModels ? (
              <div className="model-selector__loading">Carregando modelos...</div>
            ) : provider.models.length === 0 ? (
              <button
                className="model-selector__load-btn"
                onClick={() => loadProviderModels(provider.id)}
                disabled={provider.loadingModels}
              >
                Carregar modelos
              </button>
            ) : (
              provider.models.map((model: { id: string; name: string; vision: boolean }) => (
                <button
                  key={model.id}
                  className={`model-selector__model${activeModel === model.id ? ' model-selector__model--active' : ''}`}
                  onClick={() => onSelectModel(model)}
                  title={model.vision ? 'Suporta visão/imagens' : ''}
                >
                  <span className="model-selector__model-name">{model.name}</span>
                  {model.vision && <span className="model-selector__vision">👁️</span>}
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}