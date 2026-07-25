// "Processo de pensamento" — log compacto e colapsável do que o BeeHive já
// fez nesta resposta (uma etapa por linha) + a ação ao vivo em andamento,
// estilo Claude Code. Fica acima do painel "Progresso" (TaskPlan), que é o
// checklist completo — aqui é só o resumo em prosa.
import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { PlanStep } from '../../services/orchestrator';
import './ThinkingLog.css';

function summarizeStep(step: PlanStep): string {
  const base: Record<string, string> = {
    research: 'Pesquisou informações',
    content: 'Escreveu o conteúdo',
    image: 'Gerou as imagens',
    video: 'Gerou o vídeo',
    coding: 'Escreveu o código',
    browser: 'Testou no navegador',
    marketing: 'Planejou a campanha',
    social: 'Publicou o conteúdo',
    analytics: 'Levantou as métricas',
    seo: 'Otimizou para SEO',
    sales: 'Preparou o contato de vendas',
    legal: 'Revisou o texto jurídico',
    chat: 'Respondeu',
  };
  if (step.status === 'error') return `Falhou: ${step.title}`;
  if (step.status === 'blocked') return `Bloqueado: ${step.title}`;
  return base[step.agent] ?? step.title;
}

export function ThinkingLog({ steps, currentLabel }: { steps: PlanStep[]; currentLabel?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const finished = steps.filter((s) => s.status === 'done' || s.status === 'error' || s.status === 'blocked');
  const running = steps.find((s) => s.status === 'running');
  if (finished.length === 0 && !running) return null;

  return (
    <div className="thinking-log">
      <button className="tl-header" onClick={() => setCollapsed((v) => !v)}>
        <ChevronDown size={13} className={`tl-chevron${collapsed ? ' collapsed' : ''}`} />
        <span>Processo de pensamento</span>
      </button>
      {!collapsed && (
        <div className="tl-body">
          {finished.map((s) => (
            <div key={s.id} className={`tl-line tl-${s.status}`}>{summarizeStep(s)}</div>
          ))}
          {running && (
            <div className="tl-line tl-live">
              <Sparkles size={12} className="tl-live-icon" />
              {currentLabel ?? summarizeStep(running)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
