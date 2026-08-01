import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'instagram', label: 'Instagram', icon: '📷', color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2' },
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
  { id: 'tiktok', label: 'TikTok', icon: '♪', color: '#00F2EA' },
];

const BACKEND_URL = 'https://beehive-production-d895.up.railway.app';

interface OauthAppConfig {
  clientId: string;
  clientSecret: string;
  scopes?: string;
}

export function OauthSettingsView() {
  const [configs, setConfigs] = useState<Record<string, OauthAppConfig>>({});
  const [configured, setConfigured] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const configuredPlatforms = await Promise.all(
        PLATFORMS.map(async (p) => {
          try {
            const res = await fetch(`${BACKEND_URL}/oauth/apps/${p.id}`);
            const data = await res.json();
            return data.configured ? p.id : null;
          } catch {
            return null;
          }
        })
      );
      
      const configuredSet = new Set(configuredPlatforms.filter(Boolean));
      setConfigured(configuredSet);
    } catch (e) {
      console.error('Failed to load oauth configs', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(platform: string) {
    const config = configs[platform];
    if (!config?.clientId || !config.clientSecret) {
      alert(`Por favor, preencha o Client ID e Secret do ${platform}`);
      return;
    }

    setSaving(platform);
    try {
      const res = await fetch(`${BACKEND_URL}/oauth/apps/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setConfigured(prev => new Set([...prev, platform]));
      setSaved(platform);
      setTimeout(() => setSaved(null), 3000);
    } catch (e) {
      alert(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(null);
    }
  }

  function updateConfig(platform: string, field: keyof OauthAppConfig, value: string) {
    setConfigs(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  }

  if (loading) {
    return (
      <div className="cortes-loading">
        <Loader2 size={20} className="spin" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="cortes-oauth-settings">
      <div className="cortes-section-header">
        <h2>🔐 Configuração de OAuth</h2>
        <p>Cadastre os Client IDs das redes sociais para habilitar a conexão automática</p>
      </div>

      <div className="cortes-card">
        <div className="cortes-card-body">
          <div className="cortes-warning">
            <AlertCircle size={16} />
            <span>
              Para usar OAuth, você precisa criar um app em cada rede social e obter o <strong>Client ID</strong> e <strong>Client Secret</strong>.
            </span>
          </div>

          <div className="cortes-platforms-grid">
            {PLATFORMS.map(p => {
              const isConfigured = configured.has(p.id);
              const config = configs[p.id] || {};
              const isSaving = saving === p.id;
              const isSaved = saved === p.id;

              return (
                <div key={p.id} className={`cortes-platform-card ${isConfigured ? 'configured' : ''}`}>
                  <div className="cortes-platform-header">
                    <span className="cortes-platform-icon" style={{ color: p.color }}>{p.icon}</span>
                    <span className="cortes-platform-name">{p.label}</span>
                    {isConfigured && <CheckCircle2 size={16} color="var(--success)" />}
                  </div>

                  <div className="cortes-form-group">
                    <label>Client ID</label>
                    <input
                      type="text"
                      placeholder="Ex: 123456789-abc.apps.googleusercontent.com"
                      value={config.clientId || ''}
                      onChange={e => updateConfig(p.id, 'clientId', e.target.value)}
                      disabled={isConfigured}
                    />
                  </div>

                  <div className="cortes-form-group">
                    <label>Client Secret</label>
                    <input
                      type="password"
                      placeholder="Ex: GOCxxx..."
                      value={config.clientSecret || ''}
                      onChange={e => updateConfig(p.id, 'clientSecret', e.target.value)}
                      disabled={isConfigured}
                    />
                  </div>

                  <button
                    className={`btn-primary btn-sm ${isSaved ? 'success' : ''}`}
                    onClick={() => handleSave(p.id)}
                    disabled={isSaving || !config.clientId || !config.clientSecret}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={13} className="spin" /> Salvando...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle2 size={13} /> Salvo!
                      </>
                    ) : (
                      <>
                        <Save size={13} /> {isConfigured ? 'Atualizar' : 'Salvar'}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="cortes-card">
        <div className="cortes-card-body">
          <h3>📋 Como obter as credenciais:</h3>
          
          <div className="cortes-instructions">
            <div className="cortes-instruction">
              <strong>YouTube:</strong>
              <ol>
                <li>Acesse <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                <li>Crie um projeto ou selecione um existente</li>
                <li>Vá em <strong>APIs & Serviços</strong> → <strong>Biblioteca</strong></li>
                <li>Busque por "YouTube Data API v3" e ative</li>
                <li>Vá em <strong>Credenciais</strong> → <strong>Criar Credenciais</strong> → OAuth 2.0 Client ID</li>
                <li>Tipo de aplicação: <strong>Aplicativo da Web</strong></li>
                <li>URI de redirecionamento autorizado: <code>{BACKEND_URL}/oauth/youtube/callback</code></li>
                <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
              </ol>
            </div>

            <div className="cortes-instruction">
              <strong>Instagram/Facebook:</strong>
              <ol>
                <li>Acesse <a href="https://developers.facebook.com/" target="_blank">Facebook Developers</a></li>
                <li>Crie um app do tipo <strong>Consumer</strong></li>
                <li>Adicione o produto <strong>Instagram Basic Display</strong></li>
                <li>Obtenha o <strong>App ID</strong> (Client ID) e <strong>App Secret</strong></li>
                <li>URI de redirecionamento: <code>{BACKEND_URL}/oauth/instagram/callback</code></li>
              </ol>
            </div>

            <div className="cortes-instruction">
              <strong>TikTok:</strong>
              <ol>
                <li>Acesse <a href="https://developers.tiktok.com/" target="_blank">TikTok for Developers</a></li>
                <li>Crie um app no site do desenvolvedor</li>
                <li>Obtenha o <strong>Client Key</strong> e <strong>Client Secret</strong></li>
                <li>Adicione o redirect URI correto</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
