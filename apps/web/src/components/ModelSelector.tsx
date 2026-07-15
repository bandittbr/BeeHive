import { useState, useRef, useEffect } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';
import { useModel } from '@/context/ModelContext';
import { saveProvider, testProvider, activateProvider, getProviderModels } from '@/services/settings/settingsService';
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
  const [testing, setTesting] = useState<string | null>(null);

useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = async (model: { id: string; name: string; vision: boolean }) => {
    if (model.id === activeModel) return;
    await setModel(model.id);
    setOpen(false);
  };

  const handleTestProvider = async (provider: any) => {
    if (!provider.requiresApiKey) return;
    setTesting(provider.id);
    try {
      const result = await testProvider(provider.id);
      if (!result.ok) alert(`Falha no teste: ${result.detail ?? 'Erro desconhecido'}`);
      else alert('Conexão OK!');
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleSaveProvider = async (provider: any, apiKey: string, baseUrl?: string) => {
    try {
      await saveProvider(provider.id, { apiKey, baseUrl });
      await activateProvider(provider.id);
      await getProviderModels(provider.id);
    } catch (err) {
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  if (loadingProviders) {
    return <div className="model-selector loading" title="Carregando provedores...">⟳</div>;
  }

  const configuredProviders = providers.filter(p => p.hasCredentials && p.isEnabled && p.isRegistered);
  const unconfiguredProviders = providers.filter(p => !p.hasCredentials || !p.isEnabled || !p.isRegistered);

  const activeProviderObj = providers.find(p => p.id === activeProviderId);
  const currentModelObj = activeProviderObj?.models.find(m => m.id === activeModel);
  const displayName = currentModelObj?.name ?? activeModel ?? 'Selecione um modelo';

  if (!providers.length) {
    return (
      <div className="model-selector no-providers" title="Nenhum provedor disponível">
        <Icon name="warning" size={16} />
        <span>Nenhum provedor no catálogo</span>
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
          title={`Modelo atual: ${displayName}${currentModelObj?.vision ? ' 👁️' : ''}`}
        >
          <span className="model-selector__name">{displayName}</span>
          {currentModelObj?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        {open && (
          <ModelDropdown
            configured={configuredProviders}
            unconfigured={unconfiguredProviders}
            activeModel={activeModel}
            onSelectModel={handleSelectModel}
            onTestProvider={handleTestProvider}
            onSaveProvider={handleSaveProvider}
            testing={testing}
          />
        )}
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
          {currentModelObj?.vision && <span className="model-selector__vision" title="Suporta visão/imagens">👁️</span>}
          <Icon name="chevron" size={14} className={open ? 'model-selector__chevron--open' : ''} />
        </button>
        <button className="model-selector__refresh" onClick={() => void refresh()} title="Recarregar" disabled={loadingProviders}>
          <Icon name={loadingProviders ? 'stop' : 'command'} size={14} />
        </button>
      </div>
      {open && <ModelDropdown configured={configuredProviders} unconfigured={unconfiguredProviders} activeModel={activeModel} onSelectModel={handleSelectModel} onTestProvider={handleTestProvider} onSaveProvider={handleSaveProvider} testing={testing} />}
    </div>
  );
}

interface ModelDropdownProps {
  configured: any[];
  unconfigured: any[];
  activeModel: string;
  onSelectModel: (model: { id: string; name: string; vision: boolean }) => Promise<void>;
  onTestProvider: (provider: any) => Promise<void>;
  onSaveProvider: (provider: any, apiKey: string, baseUrl?: string) => Promise<void>;
  testing: string | null;
}

function ModelDropdown({ configured, unconfigured, onSelectModel, onTestProvider, onSaveProvider, testing }: ModelDropdownProps) {
  const { loadProviderModels, activeModel } = useModel();

  const renderConfiguredProviders = () => {
    if (configured.length === 0) return null;
    return (
      <div className="model-selector__section">
        <span className="model-selector__section-title">Configurados</span>
        {configured.map(provider => {
          let modelsContent: React.ReactNode;
          if (provider.loadingModels) {
            modelsContent = <div className="model-selector__loading">Carregando modelos...</div>;
          } else if (provider.models.length === 0) {
            modelsContent = (
              <button
                className="model-selector__load-btn"
                onClick={() => loadProviderModels(provider.id)}
                disabled={provider.loadingModels}
              >
                Carregar modelos
              </button>
            );
          } else {
            modelsContent = provider.models.map((model: { id: string; name: string; vision: boolean }) => (
              <button
                key={model.id}
                className={`model-selector__model${activeModel === model.id ? ' model-selector__model--active' : ''}`}
                onClick={() => onSelectModel(model)}
                title={model.vision ? 'Suporta visão/imagens' : ''}
              >
                <span className="model-selector__model-name">{model.name}</span>
                {model.vision && <span className="model-selector__vision">👁️</span>}
              </button>
            ));
          }

          return (
            <div key={provider.id} className="model-selector__section">
              <div className="model-selector__section-header">
                <Icon name={(PROVIDER_ICONS[provider.icon] ? PROVIDER_ICONS[provider.icon] : 'gear') as IconName} size={14} />
                <span className="model-selector__provider-name">{provider.name}</span>
                <span className={`model-selector__tier model-selector__tier--${provider.tier}`}>
                  {TIER_LABELS[provider.tier] ?? provider.tier}
                </span>
                {provider.loadingModels && <span className="model-selector__loading">⟳</span>}
                {provider.error && <span className="model-selector__error" title={provider.error}>⚠</span>}
              </div>
              <div className="model-selector__models">{modelsContent}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUnconfiguredProviders = () => {
    if (unconfigured.length === 0) return null;
    return (
      <div className="model-selector__section">
        <span className="model-selector__section-title">Disponíveis (clique para configurar)</span>
        {unconfigured.map(provider => (
          <div key={provider.id} className="model-selector__section">
            <div className="model-selector__section-header">
              <Icon name={(PROVIDER_ICONS[provider.icon] ? PROVIDER_ICONS[provider.icon] : 'gear') as IconName} size={14} />
              <span className="model-selector__provider-name">{provider.name}</span>
              <span className={`model-selector__tier model-selector__tier--${provider.tier}`}>
                {TIER_LABELS[provider.tier] ?? provider.tier}
              </span>
              {!provider.requiresApiKey && <span className="model-selector__free-badge">Grátis</span>}
            </div>
            <div className="model-selector__config-form">
{provider.requiresApiKey ? (
                <ConfigureProviderForm
                  provider={provider}
                  onSave={onSaveProvider}
                  onTest={onTestProvider}
                  testing={testing === provider.id ? provider.id : null}
                />
              ) : (
                <button
                  className="model-selector__config-btn"
                  onClick={() => onSaveProvider(provider, '', provider.defaultBaseUrl)}
                >
                  Ativar {provider.name}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="model-selector__dropdown">
      {renderConfiguredProviders()}
      {renderUnconfiguredProviders()}
    </div>
  );
}

interface ConfigureProviderFormProps {
  provider: any;
  onSave: (provider: any, apiKey: string, baseUrl?: string) => Promise<void>;
  onTest: (provider: any) => Promise<void>;
  testing: string | null;
}

function ConfigureProviderForm({ provider, onSave, onTest, testing }: ConfigureProviderFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.defaultBaseUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() && provider.requiresApiKey) return;
    setSaving(true);
    try {
      await onSave(provider, apiKey.trim(), baseUrl.trim() || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="model-selector__config-form">
      {provider.requiresApiKey && (
        <div className="model-selector__field">
          <label>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={`Sua ${provider.name} API Key`}
            required
          />
        </div>
      )}
      <div className="model-selector__field">
        <label>Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={provider.defaultBaseUrl}
          defaultValue={provider.defaultBaseUrl}
        />
      </div>
      <div className="model-selector__actions">
        <button type="button" className="model-selector__btn-secondary" onClick={() => onTest(provider)} disabled={!!testing || saving || !apiKey.trim()}>
          {testing === provider.id ? '⟳ Testando...' : 'Testar conexão'}
        </button>
        <button type="submit" className="model-selector__btn-primary" disabled={saving || (provider.requiresApiKey && !apiKey.trim())}>
          {saving ? 'Salvando...' : 'Salvar e ativar'}
        </button>
      </div>
    </form>
  );
}
