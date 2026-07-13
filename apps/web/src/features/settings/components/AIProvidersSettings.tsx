import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Input, Loading, Panel } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import {
  listProviders,
  saveProvider,
  testProvider,
  activateProvider,
  setDefaultModel,
  type ProviderCatalogStatus,
  type TestResult,
} from '@/services/settings/settingsService';
import './AIProvidersSettings.css';

type View = 'grid' | 'config';

/**
 * AIProvidersSettings — painel de gerenciamento de providers de IA.
 *
 * Fluxo estilo OpenRouter/OpenCode:
 *  1. Grid de cards com todos os providers do catálogo
 *  2. Cada card mostra: nome, tier (local/free/paid), status (ativo/configurado)
 *  3. Clicar no card abre a config: inputs de apiKey/baseUrl, botão Testar, botão Usar
 *  4. Provider ativo fica destacado no grid
 */
export function AIProvidersSettings() {
  const [providers, setProviders] = useState<ProviderCatalogStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('grid');
  const [selected, setSelected] = useState<ProviderCatalogStatus | null>(null);

  // Estado da config do provider selecionado
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProviders();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar providers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openConfig = (provider: ProviderCatalogStatus) => {
    setSelected(provider);
    setApiKey('');
    setBaseUrl(provider.defaultBaseUrl);
    setTestResult(null);
    setView('config');
  };

  const handleTest = async () => {
    if (!selected) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProvider(selected.id, {
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, detail: err instanceof Error ? err.message : 'Erro ao testar' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveProvider(selected.id, {
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      });
      await activateProvider(selected.id);
      await setDefaultModel(selected.defaultModel);
      await load(); // recarrega o grid
      setView('grid');
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar provider.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseProvider = async (provider: ProviderCatalogStatus) => {
    try {
      await activateProvider(provider.id);
      await setDefaultModel(provider.defaultModel);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ativar provider.');
    }
  };

  const getTierColor = (tier: string): 'success' | 'info' | 'accent' => {
    switch (tier) {
      case 'local': return 'success';
      case 'free': return 'info';
      case 'paid': return 'accent';
      default: return 'info';
    }
  };

  const getTierLabel = (tier: string): string => {
    switch (tier) {
      case 'local': return 'Local';
      case 'free': return 'Gratuito';
      case 'paid': return 'Pago';
      default: return tier;
    }
  };

  if (loading) {
    return (
      <Panel title="Providers de IA">
        <div className="settings__center">
          <Loading variant="spinner" />
        </div>
      </Panel>
    );
  }

  if (error && providers.length === 0) {
    return (
      <Panel title="Providers de IA">
        <Alert variant="danger" title="Erro ao carregar">
          {error}
          <Button variant="ghost" size="sm" onClick={() => void load()} className="retry-btn">
            Tentar novamente
          </Button>
        </Alert>
      </Panel>
    );
  }

  // ── View: Grid de cards ────────────────────────────────────────────────
  if (view === 'grid') {
    return (
      <Panel
        title="Providers de IA"
        actions={
          <Button variant="ghost" size="sm" icon="search" onClick={() => void load()}>
            Atualizar
          </Button>
        }
      >
        {error && (
          <Alert variant="warning" title="Aviso">
            {error}
          </Alert>
        )}

        <div className="providers-grid">
          {providers.map((provider) => {
            const isActive = provider.isEnabled && provider.isRegistered;
            return (
              <button
                key={provider.id}
                type="button"
                className={`provider-card${isActive ? ' provider-card--active' : ''}`}
                onClick={() => openConfig(provider)}
              >
                <div className="provider-card__header">
                  <span className="provider-card__icon">
                    <Icon name={getProviderIcon(provider.icon)} size={24} />
                  </span>
                  <Badge tone={getTierColor(provider.tier)}>
                    {getTierLabel(provider.tier)}
                  </Badge>
                </div>

                <div className="provider-card__body">
                  <h3 className="provider-card__name">{provider.name}</h3>
                  <p className="provider-card__desc">{provider.description}</p>
                </div>

                <div className="provider-card__footer">
                  {isActive ? (
                    <Badge tone="success" dot>Ativo</Badge>
                  ) : provider.hasCredentials ? (
                    <span className="provider-card__status">
                      <Badge tone="info">Configurado</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleUseProvider(provider); }}
                      >
                        Usar
                      </Button>
                    </span>
                  ) : provider.requiresApiKey ? (
                    <span className="provider-card__status">
                      <span className="provider-card__action">Configurar</span>
                    </span>
                  ) : (
                    <span className="provider-card__status">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleUseProvider(provider); }}
                      >
                        Usar
                      </Button>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>
    );
  }

  // ── View: Config do provider selecionado ───────────────────────────────
  return (
    <Panel
      title={`Configurar ${selected?.name ?? ''}`}
      actions={
        <Button variant="ghost" size="sm" onClick={() => { setView('grid'); setSelected(null); }}>
          ← Voltar
        </Button>
      }
    >
      {selected && (
        <div className="provider-config">
          <div className="provider-config__info">
            <Icon name={getProviderIcon(selected.icon)} size={32} />
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>
            </div>
          </div>

          {selected.requiresApiKey && (
            <div className="provider-config__field">
              <label className="provider-config__label">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selected.apiKeyPlaceholder ?? 'Sua API key'}
              />
            </div>
          )}

          {selected.baseUrlEditable && (
            <div className="provider-config__field">
              <label className="provider-config__label">Base URL</label>
              <Input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={selected.baseUrlPlaceholder ?? selected.defaultBaseUrl}
              />
            </div>
          )}

          <div className="provider-config__actions">
            <Button
              variant="secondary"
              onClick={() => void handleTest()}
              disabled={testing || (selected.requiresApiKey && !apiKey)}
            >
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>

            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={saving || (selected.requiresApiKey && !apiKey)}
            >
              {saving ? 'Salvando...' : 'Salvar e Usar'}
            </Button>
          </div>

          {testResult && (
            <Alert variant={testResult.ok ? 'success' : 'danger'} title={testResult.ok ? 'Conexão OK' : 'Falha na conexão'}>
              {testResult.ok
                ? `Provider ${selected.name} está acessível.`
                : testResult.detail ?? 'Não foi possível conectar.'}
            </Alert>
          )}

          {selected.capabilities.length > 0 && (
            <div className="provider-config__caps">
              <span className="provider-config__label">Capacidades:</span>
              <div className="provider-config__cap-list">
                {selected.capabilities.map((cap) => (
                  <Badge key={cap} tone="info">{cap}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="provider-config__model">
            <span className="provider-config__label">Modelo padrão:</span>
            <code>{selected.defaultModel}</code>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Mapeia nome do ícone do catálogo para o nome do componente Icon. */
function getProviderIcon(icon: string): any {
  const map: Record<string, string> = {
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
  return (map[icon] ?? 'agents') as any;
}
