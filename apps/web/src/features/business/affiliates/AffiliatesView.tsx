import { useState, useEffect, useCallback } from 'react';
import { Button, Card, EmptyState, Modal, Input, Alert, Loading } from '@/components/ui';
import type { DiscoveryRule, AutomationSettings, AffiliateProvider } from '@beehive/platform';
import './affiliates.css';

const API_BASE = '/api/affiliates';

/**
 * View de Afiliados — gerencia regras de discovery e configurações de automação.
 *
 * Inspirado no AchadosPro: o usuário define nichos/categorias para buscar
 * produtos em programas de afiliados (Mercado Livre, Shopee) e o worker
 * descobre produtos, gera conteúdo e publica automaticamente.
 */
export function AffiliatesView() {
  const [rules, setRules] = useState<DiscoveryRule[]>([]);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCategory, setFormCategory] = useState('');
  const [formMinPrice, setFormMinPrice] = useState('0');
  const [formMaxPrice, setFormMaxPrice] = useState('10000');
  const [formCommission, setFormCommission] = useState('5');
  const [formRating, setFormRating] = useState('0');
  const [formProviders, setFormProviders] = useState<AffiliateProvider[]>(['mercado_livre']);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/discovery-rules`),
        fetch(`${API_BASE}/automation-settings`),
      ]);
      if (!rulesRes.ok) throw new Error(`Erro ao carregar regras: ${rulesRes.status}`);
      if (!settingsRes.ok) throw new Error(`Erro ao carregar configurações: ${settingsRes.status}`);
      const rulesData = await rulesRes.json();
      const settingsData = await settingsRes.json();
      setRules(rulesData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRule = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/discovery-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          minPrice: Number(formMinPrice),
          maxPrice: Number(formMaxPrice),
          minCommissionRate: Number(formCommission),
          minRating: Number(formRating),
          affiliateProviders: formProviders,
        }),
      });
      if (!res.ok) throw new Error(`Erro ao criar regra: ${res.status}`);
      const newRule = await res.json();
      setRules((prev) => [...prev, newRule]);
      setShowCreateRule(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/discovery-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) throw new Error(`Erro ao atualizar regra: ${res.status}`);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, active: !active } : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar regra');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/discovery-rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Erro ao deletar regra: ${res.status}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar regra');
    }
  };

  const handleToggleKillSwitch = async () => {
    if (!settings) return;
    try {
      const res = await fetch(`${API_BASE}/automation-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killSwitchActive: !settings.killSwitchActive }),
      });
      if (!res.ok) throw new Error(`Erro ao atualizar configurações: ${res.status}`);
      setSettings((prev) => prev ? { ...prev, killSwitchActive: !prev.killSwitchActive } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const resetForm = () => {
    setFormCategory('');
    setFormMinPrice('0');
    setFormMaxPrice('10000');
    setFormCommission('5');
    setFormRating('0');
    setFormProviders(['mercado_livre']);
  };

  if (loading) return <Loading label="Carregando configurações de afiliados..." />;

  return (
    <div className="affiliates">
      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {/* Kill Switch + Configurações */}
      {settings && (
        <Card className="affiliates__settings">
          <div className="affiliates__settings-header">
            <h3>Automação</h3>
            <div className="affiliates__kill-switch">
              <span className="affiliates__kill-label">
                {settings.killSwitchActive ? '⏸️ Pausado' : '▶️ Ativo'}
              </span>
              <button
                className={`affiliates__kill-btn ${settings.killSwitchActive ? 'kill--active' : ''}`}
                onClick={handleToggleKillSwitch}
                title={settings.killSwitchActive ? 'Ativar automação' : 'Pausar automação'}
              >
                {settings.killSwitchActive ? 'ATIVAR' : 'PAUSAR'}
              </button>
            </div>
          </div>
          <div className="affiliates__settings-info">
            <span>Posts/dia: <strong>{settings.postsPerDay}</strong></span>
            <span>Vídeo: <strong>{settings.videoEnabled ? 'Sim' : 'Não'}</strong></span>
          </div>
        </Card>
      )}

      {/* Regras de Discovery */}
      <div className="affiliates__section-header">
        <h3>Regras de Discovery ({rules.length})</h3>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setShowCreateRule(true)}>
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nenhuma regra de discovery"
          description="Crie regras para encontrar produtos em programas de afiliados automaticamente."
          action={
            <Button variant="primary" icon="plus" onClick={() => setShowCreateRule(true)}>
              Criar Regra
            </Button>
          }
        />
      ) : (
        <div className="affiliates__rules">
          {rules.map((rule) => (
            <Card key={rule.id} className="affiliates__rule">
              <div className="affiliates__rule-head">
                <div className="affiliates__rule-info">
                  <span className="affiliates__rule-category">{rule.category}</span>
                  <span className="affiliates__rule-detail">
                    R$ {rule.minPrice} — R$ {rule.maxPrice}
                    {' | '}Comissão ≥ {rule.minCommissionRate}%
                    {' | '}Rating ≥ {rule.minRating}
                  </span>
                  <span className="affiliates__rule-providers">
                    {rule.affiliateProviders.join(', ')}
                  </span>
                </div>
                <div className="affiliates__rule-actions">
                  <button
                    className={`affiliates__rule-toggle ${rule.active ? 'toggle--on' : 'toggle--off'}`}
                    onClick={() => handleToggleRule(rule.id, rule.active)}
                  >
                    {rule.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    className="affiliates__rule-delete"
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Remover regra"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação de regra */}
      <Modal
        open={showCreateRule}
        title="Nova Regra de Discovery"
        onClose={() => { setShowCreateRule(false); resetForm(); }}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowCreateRule(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRule}
              disabled={saving || !formCategory.trim()}
            >
              {saving ? 'Salvando...' : 'Criar Regra'}
            </Button>
          </>
        }
      >
        <div className="affiliates__form">
          <div className="form-group">
            <label>Categoria / Nicho</label>
            <Input
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Ex.: eletrônicos, moda, casa..."
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Preço Mínimo (R$)</label>
              <Input
                type="number"
                value={formMinPrice}
                onChange={(e) => setFormMinPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Preço Máximo (R$)</label>
              <Input
                type="number"
                value={formMaxPrice}
                onChange={(e) => setFormMaxPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Comissão Mínima (%)</label>
              <Input
                type="number"
                value={formCommission}
                onChange={(e) => setFormCommission(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Rating Mínimo</label>
              <Input
                type="number"
                step="0.1"
                value={formRating}
                onChange={(e) => setFormRating(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Providers de Afiliados</label>
            <div className="affiliates__provider-checkboxes">
              {(['mercado_livre', 'shopee'] as AffiliateProvider[]).map((p) => (
                <label key={p} className="affiliates__checkbox">
                  <input
                    type="checkbox"
                    checked={formProviders.includes(p)}
                    onChange={() => {
                      setFormProviders((prev) =>
                        prev.includes(p)
                          ? prev.filter((x) => x !== p)
                          : [...prev, p],
                      );
                    }}
                  />
                  <span>{p === 'mercado_livre' ? 'Mercado Livre' : 'Shopee'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
