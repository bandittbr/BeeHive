import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const MOCK_REVENUE = [
  { month: 'Jan', value: 12400 },
  { month: 'Fev', value: 15200 },
  { month: 'Mar', value: 13800 },
  { month: 'Abr', value: 18600 },
  { month: 'Mai', value: 16200 },
  { month: 'Jun', value: 21400 },
];

export default function FinancePage() {
  const totalRevenue = MOCK_REVENUE.reduce((s, m) => s + m.value, 0);
  const maxVal = Math.max(...MOCK_REVENUE.map((d) => d.value));

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Finance</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div className="stat-card">
              <span className="stat-label">Receita total</span>
              <span className="stat-value">R${(totalRevenue / 1000).toFixed(1)}K</span>
              <span className="stat-delta up">+18%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Despesas</span>
              <span className="stat-value">R$3.2K</span>
              <span className="stat-delta" style={{ color: 'var(--danger)' }}>-5%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Lucro líquido</span>
              <span className="stat-value">R${((totalRevenue - 3200) / 1000).toFixed(1)}K</span>
              <span className="stat-delta up">+22%</span>
            </div>
          </div>

          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div className="chat-panel-header">
              <h2 className="chat-title">Receita Mensal</h2>
              <TrendingUp size={16} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 16 }}>
              {MOCK_REVENUE.map((d) => (
                <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>R${(d.value / 1000).toFixed(1)}K</span>
                  <div
                    style={{
                      width: '100%',
                      height: `${(d.value / maxVal) * 120}px`,
                      background: 'var(--gradient)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      minHeight: 4,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
