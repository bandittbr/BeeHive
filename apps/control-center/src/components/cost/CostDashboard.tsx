import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Activity, Calendar, Database, Cpu } from "lucide-react";
import { fetchCosts, type CostDashboardData } from "../../services/cost.service";

const PERIODS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

interface CostDashboardProps {
  project: { id: string };
}

export function CostDashboard({ project }: CostDashboardProps) {
  const [data, setData] = useState<CostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    if (!project?.id) return;
    setLoading(true);
    fetchCosts(project.id, period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [project?.id, period]);

  if (loading) {
    return (
      <div className="cost-dashboard">
        <div className="cost-loading"><div className="spinner" /> Carregando custos...</div>
      </div>
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <div className="cost-dashboard">
        <div className="cost-header">
          <h2><DollarSign size={20} /> Custos</h2>
          <div className="cost-periods">
            {PERIODS.map(p => (
              <button key={p.value} className={`period-btn${period === p.value ? " active" : ""}`} onClick={() => setPeriod(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="cost-empty">
          <DollarSign size={48} />
          <p>Nenhum custo registrado neste período</p>
          <p className="cost-empty-hint">Os custos aparecerão automaticamente conforme os pipelines forem executados.</p>
        </div>
      </div>
    );
  }

  const topModels = Object.entries(data.byModel)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 5);

  const topNodeTypes = Object.entries(data.byNodeType)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 5);

  const dateEntries = Object.entries(data.byDate).sort(([a], [b]) => a.localeCompare(b));
  const maxDailyCost = Math.max(...dateEntries.map(([, v]) => v.cost), 0.001);

  return (
    <div className="cost-dashboard">
      <div className="cost-header">
        <h2><DollarSign size={20} /> Custos</h2>
        <div className="cost-periods">
          {PERIODS.map(p => (
            <button key={p.value} className={`period-btn${period === p.value ? " active" : ""}`} onClick={() => setPeriod(p.value)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="cost-summary">
        <div className="cost-card total">
          <div className="cost-card-icon"><DollarSign size={24} /></div>
          <div className="cost-card-body">
            <span className="cost-card-label">Custo Total</span>
            <span className="cost-card-value">${data.summary.totalCost.toFixed(4)}</span>
          </div>
        </div>
        <div className="cost-card">
          <div className="cost-card-icon"><Activity size={24} /></div>
          <div className="cost-card-body">
            <span className="cost-card-label">Total de Tokens</span>
            <span className="cost-card-value">{data.summary.totalTokens.toLocaleString()}</span>
          </div>
        </div>
        <div className="cost-card">
          <div className="cost-card-icon"><Database size={24} /></div>
          <div className="cost-card-body">
            <span className="cost-card-label">Requisições</span>
            <span className="cost-card-value">{data.summary.recordCount}</span>
          </div>
        </div>
        <div className="cost-card">
          <div className="cost-card-icon"><BarChart3 size={24} /></div>
          <div className="cost-card-body">
            <span className="cost-card-label">Custo Médio</span>
            <span className="cost-card-value">${(data.summary.totalCost / Math.max(data.summary.recordCount, 1)).toFixed(6)}</span>
          </div>
        </div>
      </div>

      <div className="cost-charts">
        <div className="cost-chart-section">
          <h3><Cpu size={16} /> Por Modelo</h3>
          <div className="cost-bar-list">
            {topModels.map(([model, info]) => (
              <div key={model} className="cost-bar-row">
                <div className="cost-bar-label">
                  <span className="cost-bar-name">{model}</span>
                  <span className="cost-bar-value">${info.cost.toFixed(4)}</span>
                </div>
                <div className="cost-bar-track">
                  <div
                    className="cost-bar-fill"
                    style={{ width: `${(info.cost / data.summary.totalCost) * 100}%` }}
                  />
                </div>
                <div className="cost-bar-meta">{info.tokens.toLocaleString()} tokens / {info.count}x</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cost-chart-section">
          <h3><Activity size={16} /> Por Tipo de Nó</h3>
          <div className="cost-bar-list">
            {topNodeTypes.map(([nt, info]) => (
              <div key={nt} className="cost-bar-row">
                <div className="cost-bar-label">
                  <span className="cost-bar-name">{nt}</span>
                  <span className="cost-bar-value">${info.cost.toFixed(4)}</span>
                </div>
                <div className="cost-bar-track">
                  <div
                    className="cost-bar-fill node-type"
                    style={{ width: `${(info.cost / data.summary.totalCost) * 100}%` }}
                  />
                </div>
                <div className="cost-bar-meta">{info.tokens.toLocaleString()} tokens / {info.count}x</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cost-timeline-section">
        <h3><Calendar size={16} /> Custos Diários</h3>
        <div className="cost-timeline">
          {dateEntries.map(([date, info]) => (
            <div key={date} className="cost-timeline-bar-wrapper">
              <div className="cost-timeline-bar" style={{ height: `${(info.cost / maxDailyCost) * 100}%` }} title={`${date}: $${info.cost.toFixed(4)}`} />
              <span className="cost-timeline-label">{date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cost-recents">
        <h3>Atividades Recentes</h3>
        <div className="cost-records-list">
          {data.records.slice(0, 10).map(r => (
            <div key={r.id} className="cost-record-row">
              <div className="cost-record-left">
                <span className="cost-record-type">{r.nodeType || "N/A"}</span>
                <span className="cost-record-model">{r.model || "—"}</span>
              </div>
              <div className="cost-record-tokens">{r.totalTokens.toLocaleString()} tokens</div>
              <div className="cost-record-cost">${r.costUsd.toFixed(6)}</div>
              <div className="cost-record-date">{new Date(r.createdAt).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
