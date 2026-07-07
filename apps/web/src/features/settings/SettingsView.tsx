import { useCallback, useEffect, useState } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { Alert, Badge, Button, EmptyState, Loading, Panel } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import { listModels, setActiveModel } from '@/services/settings/settingsService';
import { KernelCheck } from './components/KernelCheck';
import './SettingsView.css';

/**
 * Área Configurações — por enquanto, o seletor de modelo de inteligência.
 *
 * Lista os modelos instalados no Ollama (via Core) e permite trocar o ativo
 * com um clique. A troca vale para as próximas mensagens.
 */
export function SettingsView() {
  const [models, setModels] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await listModels();
      setModels(info.models);
      setCurrent(info.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar modelos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (model: string) => {
    if (model === current || saving) return;
    setSaving(model);
    setError(null);
    try {
      const applied = await setActiveModel(model);
      setCurrent(applied);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao trocar o modelo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AreaPage
      icon="gear"
      title="Configurações"
      description="Preferências do BeeHive e escolha da inteligência."
      state="Ativo"
    >
      <Panel
        title="Modelo de Inteligência"
        actions={
          <Button variant="ghost" size="sm" icon="search" onClick={() => void load()}>
            Atualizar
          </Button>
        }
      >
        {loading ? (
          <div className="settings__center">
            <Loading variant="spinner" />
          </div>
        ) : error ? (
          <Alert variant="danger" title="Não foi possível falar com o Ollama">
            {error} Verifique se o Ollama está em execução.
          </Alert>
        ) : models.length === 0 ? (
          <EmptyState
            icon="info"
            title="Nenhum modelo instalado"
            description="Baixe um modelo no Ollama (ex.: ollama pull qwen3.5:4b) e clique em Atualizar."
          />
        ) : (
          <>
            <div className="model-list">
              {models.map((model) => {
                const isCurrent = model === current;
                return (
                  <button
                    key={model}
                    type="button"
                    className={`model-row${isCurrent ? ' model-row--active' : ''}`}
                    onClick={() => void choose(model)}
                    disabled={saving !== null}
                  >
                    <span className="model-row__icon" aria-hidden>
                      <Icon name="agents" size={18} />
                    </span>
                    <span className="model-row__name">{model}</span>
                    {saving === model ? (
                      <Loading variant="spinner" />
                    ) : isCurrent ? (
                      <Badge tone="success" dot>
                        Em uso
                      </Badge>
                    ) : (
                      <span className="model-row__action">Usar</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="settings__note">
              A troca afeta as próximas mensagens e vale até reiniciar o servidor. Para um padrão
              fixo, ajuste <code>OLLAMA_MODEL</code> no <code>.env</code>.
            </p>
          </>
        )}
      </Panel>

      <div className="settings__section">
        <KernelCheck />
      </div>
    </AreaPage>
  );
}
