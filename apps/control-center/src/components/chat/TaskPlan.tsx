// Painel de progresso ao vivo do orquestrador.
// Mostra as etapas planejadas pelo cérebro do BeeHive e o status de cada uma.
import { CheckCircle2, Circle, Loader2, Lock, XCircle, Bot } from 'lucide-react';
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
      return <Loader2 size={15} className="tp-spin" />;
    case 'done':
      return <CheckCircle2 size={15} className="tp-done" />;
    case 'blocked':
      return <Lock size={15} className="tp-blocked" />;
    case 'error':
      return <XCircle size={15} className="tp-error" />;
    default:
      return <Circle size={15} className="tp-pending" />;
  }
}

export function TaskPlan({ intent, steps }: { intent: string; steps: PlanStep[] }) {
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.status === 'done').length;
  const total = steps.length;

  return (
    <div className="task-plan">
      <div className="tp-header">
        <div className="tp-title"><Bot size={15} /> Plano do BeeHive</div>
        <span className="tp-progress">{done}/{total}</span>
      </div>
      <div className="tp-intent">{intent}</div>
      <div className="tp-track"><div className="tp-track-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      <ol className="tp-steps">
        {steps.map((s) => (
          <li key={s.id} className={`tp-step ${s.status}`}>
            <span className="tp-step-icon"><StatusIcon step={s} /></span>
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
    </div>
  );
}
