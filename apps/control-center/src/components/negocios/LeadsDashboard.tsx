import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Send, MessageCircle, CheckCircle2, XCircle,
  Target, BarChart3, Loader2, RefreshCw, Globe,
} from 'lucide-react';
import { getLeadsDashboard, leadStatusColor, leadStatusLabel } from '../../services/leadsService';
import type { LeadsDashboard as DashboardData } from '../../types';

type TabView = 'dashboard' | 'scraper' | 'leads';

export function LeadsDashboard({ onNavigate }: { onNavigate: (tab: TabView) => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getLeadsDashboard();
      setDashboard(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="leads-loading">
        <Loader2 size={24} className="spin" />
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leads-error">
        <XCircle size={24} />
        <p>{error}</p>
        <button className="btn-primary" onClick={load}><RefreshCw size={14} /> Tentar novamente</button>
      </div>
    );
  }

  const d = dashboard || { total: 0, byStatus: {}, byCategory: {}, newToday: 0, proposalSent: 0, responded: 0, converted: 0 };

  const statusEntries = Object.entries(d.byStatus).sort((a, b) => b[1] - a[1]);
  const categoryEntries = Object.entries(d.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="leads-dashboard">
      {/* Cards principais */}
      <div className="leads-stats-grid">
        <div className="leads-stat-card" style={{ '--stat-color': '#3b82f6' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#3b82f61f', color: '#3b82f6' }}><Users size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{d.total}</span>
            <span className="leads-stat-label">Total de Leads</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#f59e0b' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#f59e0b1f', color: '#f59e0b' }}><TrendingUp size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{d.newToday}</span>
            <span className="leads-stat-label">Novos Hoje</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#ec4899' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#ec48991f', color: '#ec4899' }}><Send size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{d.proposalSent}</span>
            <span className="leads-stat-label">Propostas Enviadas</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#14b8a6' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#14b8a61f', color: '#14b8a6' }}><MessageCircle size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{d.responded}</span>
            <span className="leads-stat-label">Responderam</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#22c55e' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#22c55e1f', color: '#22c55e' }}><CheckCircle2 size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{d.converted}</span>
            <span className="leads-stat-label">Convertidos</span>
          </div>
        </div>
      </div>

      <div className="leads-dashboard-grid">
        {/* Status Breakdown */}
        <div className="leads-panel">
          <div className="leads-panel-header">
            <BarChart3 size={16} />
            <h3>Status</h3>
          </div>
          <div className="leads-panel-body">
            {statusEntries.length === 0 ? (
              <p className="leads-empty-text">Nenhum lead ainda</p>
            ) : (
              <div className="leads-status-list">
                {statusEntries.map(([status, count]) => (
                  <div key={status} className="leads-status-row">
                    <span className="leads-status-dot" style={{ background: leadStatusColor(status as any) }} />
                    <span className="leads-status-name">{leadStatusLabel(status as any)}</span>
                    <span className="leads-status-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="leads-panel">
          <div className="leads-panel-header">
            <Target size={16} />
            <h3>Categorias</h3>
          </div>
          <div className="leads-panel-body">
            {categoryEntries.length === 0 ? (
              <p className="leads-empty-text">Nenhuma categoria</p>
            ) : (
              <div className="leads-category-list">
                {categoryEntries.map(([cat, count]) => (
                  <div key={cat} className="leads-category-row">
                    <span className="leads-category-name">{cat}</span>
                    <div className="leads-category-bar-bg">
                      <div
                        className="leads-category-bar"
                        style={{ width: `${Math.min(100, (count / Math.max(...categoryEntries.map(([, c]) => c))) * 100)}%` }}
                      />
                    </div>
                    <span className="leads-category-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="leads-quick-actions">
        <button className="btn-primary" onClick={() => onNavigate('scraper')}>
          <Globe size={16} /> Novo Scraping
        </button>
        <button className="btn-secondary" onClick={() => onNavigate('leads')}>
          <Users size={16} /> Ver Todos os Leads
        </button>
        <button className="btn-ghost" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
    </div>
  );
}
