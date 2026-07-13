import { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from '@/components/ui';
import './ProviderSelector.css';

const API = '/api/providers';

interface Provider {
  id: string;
  name: string;
  tier: 'free' | 'paid';
  connected: boolean;
  models?: string[];
}

const FREE_PROVIDERS: Omit<Provider, 'connected'>[] = [
  { id: 'gemini', name: 'Gemini Flash', tier: 'free' },
  { id: 'groq', name: 'Groq', tier: 'free' },
  { id: 'openrouter', name: 'OpenRouter :free', tier: 'free' },
];

const PAID_PROVIDERS: Omit<Provider, 'connected'>[] = [
  { id: 'openai', name: 'OpenAI', tier: 'paid' },
  { id: 'anthropic', name: 'Anthropic', tier: 'paid' },
  { id: 'together', name: 'Together AI', tier: 'paid' },
  { id: 'nvidia', name: 'NVIDIA', tier: 'paid' },
  { id: 'ollama', name: 'Ollama (Local)', tier: 'paid' },
  { id: 'opencode', name: 'OpenCode', tier: 'paid' },
  { id: 'custom', name: 'Custom', tier: 'paid' },
];

interface ProviderSelectorProps {
  selectedProviderId: string;
  onSelect: (providerId: string) => void;
}

export function ProviderSelector({ selectedProviderId, onSelect }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then((data: any[]) => {
        const connected = new Set(data.filter((p: any) => p.active).map((p: any) => p.id));
        const all = [...FREE_PROVIDERS, ...PAID_PROVIDERS].map(p => ({
          ...p,
          connected: connected.has(p.id),
        }));
        setProviders(all);
      })
      .catch(() => {
        setProviders([...FREE_PROVIDERS, ...PAID_PROVIDERS].map(p => ({ ...p, connected: false })));
      });
  }, []);

  return (
    <div className="provider-selector">
      <h3 className="provider-selector__title">🧠 Provider de IA</h3>
      <p className="provider-selector__subtitle">Escolha qual provider usar pra análise de cortes</p>

      <div className="provider-selector__group">
        <div className="provider-selector__group-header">
          <span className="provider-selector__group-icon">🆓</span>
          <span className="provider-selector__group-label">Gratuitos</span>
        </div>
        <div className="provider-selector__grid">
          {providers.filter(p => p.tier === 'free').map(provider => (
            <button
              key={provider.id}
              className={`provider-selector__card ${selectedProviderId === provider.id ? 'provider-selector__card--selected' : ''}`}
              onClick={() => onSelect(provider.id)}
            >
              <div className="provider-selector__card-header">
                <span className="provider-selector__card-name">{provider.name}</span>
                <Badge tone="success">GRÁTIS</Badge>
              </div>
              <div className="provider-selector__card-status">
                <Badge tone={provider.connected ? 'success' : 'neutral'} dot>
                  {provider.connected ? 'Conectado' : 'Não configurado'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="provider-selector__group">
        <div className="provider-selector__group-header">
          <span className="provider-selector__group-icon">💎</span>
          <span className="provider-selector__group-label">Pagos</span>
        </div>
        <div className="provider-selector__grid">
          {providers.filter(p => p.tier === 'paid').map(provider => (
            <button
              key={provider.id}
              className={`provider-selector__card ${selectedProviderId === provider.id ? 'provider-selector__card--selected' : ''}`}
              onClick={() => onSelect(provider.id)}
            >
              <div className="provider-selector__card-header">
                <span className="provider-selector__card-name">{provider.name}</span>
                <Badge tone="accent">PAGO</Badge>
              </div>
              <div className="provider-selector__card-status">
                <Badge tone={provider.connected ? 'success' : 'neutral'} dot>
                  {provider.connected ? 'Conectado' : 'Não configurado'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
