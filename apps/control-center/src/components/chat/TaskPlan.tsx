// Painel de progresso ao vivo do orquestrador ("Progresso" — estilo Claude
// Code): checklist colapsável com o plano que o cérebro do BeeHive montou.
import { useState } from 'react';
import { Check, ChevronDown, Loader2, Lock, X } from 'lucide-react';
import type { PlanStep, AgentKind } from '../../services/orchestrator';
import './TaskPlan.css';

const AGENT_LABEL: Record<AgentKind, string> = {
  chat: 'Chat',
  research: 'Pesquisa',
  content: 'Conteúdo',
  image: 'Imagem',
  video: 'Vídeo',
  coding: 'Código',
  browser: 'Navegador',
  marketing: 'Marketing',
  social: 'Social',
  analytics: 'Analytics',
  seo: 'SEO',
  sales: 'Vendas',
  legal: 'Jurídico',
};

function StatusIcon({ step }: { step: PlanStep }) {
  switch (step.status) {
    case 'running':
      return <span className="tp-dot tp-dot-running"><Loader2 size={11} className="tp-spin" /></span>;
    case 'done':
      return <span className="tp-dot tp-dot-done"><Check size={11} strokeWidth={3} /></span>;
    case 'blocked':
      return <span className="tp-dot tp-dot-blocked"><Lock size={9} /></span>;
    case 'error':
      return <span className="tp-dot tp-dot-error"><X size={11} strokeWidth={3} /></span>;
    default:
      return <span className="tp-dot tp-dot-pending" />;
  }
}

export function TaskPlan({ intent, steps }: { intent: string; steps: PlanStep[] }) {
  const [collapsed, setCollapsed] = useState(false);
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.status === 'done').length;
  const total = steps.length;

  return (
    <div className="task-plan">
      <button className="tp-header" onClick={() => setCollapsed((v) => !v)}>
        <ChevronDown size={14} className={`tp-chevron${collapsed ? ' collapsed' : ''}`} />
        <span className="tp-title">Progresso</span>
        <span className="tp-progress">{done}/{total}</span>
      </button>
      {!collapsed && (
        <>
          <div className="tp-intent">{intent}</div>
          <ol className="tp-steps">
            {steps.map((s) => (
              <li key={s.id} className={`tp-step ${s.status}`}>
                <StatusIcon step={s} />
                <div className="tp-step-body">
                  <div className="tp-step-line">
                    <span className="tp-step-title">{s.title}</span>
                    <span className="tp-agent-badge">{AGENT_LABEL[s.agent]}</span>
                  </div>
                  {s.detail && <div className="tp-step-detail">{s.detail}</div>}
                  {s.result && <div className="tp-step-result">{s.result}</div>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
