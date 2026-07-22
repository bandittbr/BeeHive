// Orquestrador (o "cérebro" do BeeHive)
// Recebe UM comando em linguagem natural, classifica a intenção e quebra a
// tarefa em etapas executáveis. Cada etapa aponta para um agente/ferramenta.
//
// Fase 1: o planner roda via LLM (backend Railway) e devolve um plano estruturado.
// Etapas de texto/pesquisa são respondidas pelo próprio LLM; etapas que exigem
// execução real (browser, terminal, deploy, postagem) são marcadas como
// "requer runtime" e serão ligadas ao Cowork Nuvem / Agente Local nas próximas fases.

import { askBeeHive } from './beehiveApi';

export type AgentKind =
  | 'chat' // conversa/resposta direta
  | 'research' // pesquisa de informação
  | 'content' // texto/roteiro/copy
  | 'image' // geração de imagem
  | 'video' // geração/edição de vídeo
  | 'coding' // programar / criar app / API
  | 'browser' // navegar, preencher, logar
  | 'marketing' // planejar campanha
  | 'social' // publicar em redes
  | 'analytics' // métricas/relatórios
  | 'seo'
  | 'sales' // CRM, contato, vendas
  | 'legal';

export type StepStatus = 'pending' | 'running' | 'done' | 'blocked' | 'error';

export interface PlanStep {
  id: string;
  title: string;
  agent: AgentKind;
  /** true quando a etapa precisa de execução real (Cowork/agente), ainda não disponível */
  needsRuntime: boolean;
  status: StepStatus;
  detail?: string;
  result?: string;
}

export interface Plan {
  /** resposta direta quando NÃO é uma tarefa multi-etapa (ex.: pergunta simples) */
  conversational: boolean;
  intent: string;
  steps: PlanStep[];
}

const AGENTS: AgentKind[] = [
  'chat', 'research', 'content', 'image', 'video', 'coding',
  'browser', 'marketing', 'social', 'analytics', 'seo', 'sales', 'legal',
];

// Agentes que exigem execução real (ainda não disponível na Fase 1)
const RUNTIME_AGENTS = new Set<AgentKind>([
  'image', 'video', 'coding', 'browser', 'social', 'sales',
]);

const PLANNER_SYSTEM = `Você é o orquestrador do BeeHive, um sistema operacional de produtividade por IA.
Sua função: receber UM comando do usuário e decidir se é (a) uma conversa/pergunta simples, ou (b) uma tarefa que precisa ser quebrada em etapas executadas por agentes especializados.

Agentes disponíveis: ${AGENTS.join(', ')}.

Responda SOMENTE com JSON válido, sem texto fora do JSON, neste formato:
{
  "conversational": boolean,   // true se for só conversa/pergunta direta
  "intent": "resumo curto da intenção do usuário",
  "steps": [
    { "title": "descrição curta da etapa", "agent": "um dos agentes" }
  ]
}

Regras:
- Se for conversa simples (ex.: "oi", "o que é X?", "me explique Y"), retorne conversational=true e steps=[].
- Se for tarefa (ex.: "crie uma landing page e publique", "poste 3 vídeos por dia sobre Direito", "busque contatos no Google Maps e faça marketing"), retorne conversational=false e uma lista ordenada de etapas objetivas.
- Máximo 12 etapas. Cada etapa com um único agente.
- Não invente agentes fora da lista.`;

function newId(): string {
  return 'st_' + Math.random().toString(36).slice(2, 9);
}

function coerceAgent(value: unknown): AgentKind {
  const v = String(value ?? '').toLowerCase().trim() as AgentKind;
  return AGENTS.includes(v) ? v : 'chat';
}

function extractJson(text: string): any | null {
  // tenta bloco ```json ... ``` primeiro, senão o primeiro { ... } balanceado
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Gera um plano a partir de um comando único do usuário.
 * Nunca lança: em caso de falha, devolve um plano conversacional (fallback seguro).
 */
export async function planTask(userMessage: string): Promise<Plan> {
  const prompt = `${PLANNER_SYSTEM}\n\nComando do usuário:\n"""${userMessage}"""\n\nJSON:`;

  let raw = '';
  try {
    raw = await askBeeHive(prompt);
  } catch {
    return { conversational: true, intent: userMessage, steps: [] };
  }

  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== 'object') {
    // não conseguiu planejar → trata como conversa
    return { conversational: true, intent: userMessage, steps: [] };
  }

  const conversational = parsed.conversational !== false && (!Array.isArray(parsed.steps) || parsed.steps.length === 0);
  const stepsRaw: any[] = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 12) : [];

  const steps: PlanStep[] = stepsRaw
    .filter((s) => s && (s.title || s.agent))
    .map((s) => {
      const agent = coerceAgent(s.agent);
      return {
        id: newId(),
        title: String(s.title ?? 'Etapa').trim(),
        agent,
        needsRuntime: RUNTIME_AGENTS.has(agent),
        status: 'pending' as StepStatus,
      };
    });

  return {
    conversational: conversational || steps.length === 0,
    intent: String(parsed.intent ?? userMessage).trim(),
    steps,
  };
}

/**
 * Executa uma etapa individual do plano.
 * Fase 1: agentes de texto (research/content/marketing/analytics/seo/legal/chat)
 * são resolvidos pelo LLM. Agentes que exigem runtime real retornam bloqueado
 * com instrução de qual fase os habilita.
 */
export async function runStep(step: PlanStep, context: { intent: string; previous: PlanStep[] }): Promise<PlanStep> {
  if (step.needsRuntime) {
    return {
      ...step,
      status: 'blocked',
      detail: 'Requer o Cowork (execução real) — em construção. Esta etapa foi planejada e ficará pronta para rodar automaticamente quando o runtime estiver ativo.',
    };
  }

  const prior = context.previous
    .filter((s) => s.result)
    .map((s) => `- ${s.title}: ${s.result}`)
    .join('\n');

  const prompt = `Você é o agente "${step.agent}" do BeeHive trabalhando na tarefa: "${context.intent}".
${prior ? `Contexto das etapas anteriores:\n${prior}\n` : ''}
Etapa atual: ${step.title}

Entregue o resultado desta etapa de forma objetiva e pronta para uso (sem preâmbulo).`;

  try {
    const result = await askBeeHive(prompt);
    return { ...step, status: 'done', result: result.trim() };
  } catch {
    return { ...step, status: 'error', detail: 'Falha ao executar esta etapa.' };
  }
}
