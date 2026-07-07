import type { ChatTurn } from '../intelligence/types';

/**
 * Agente Estrategista de Conteúdo (Área Business).
 *
 * Um "executor especializado": dado um nicho e uma marca, monta o contexto
 * para a inteligência gerar um plano de conteúdo. Não conhece o provedor de IA
 * — apenas produz as mensagens; quem chama usa a abstração (P7).
 */
export interface ContentPlanInput {
  niche: string;
  brand?: string;
}

const SYSTEM_PROMPT = `Você é um estrategista de conteúdo especialista em marketing digital e redes sociais, em português do Brasil.
A partir de um nicho e uma marca, você cria um plano de conteúdo prático, específico e acionável.
Responda em Markdown, organizado e objetivo, sem enrolação.`;

export function buildContentPlanMessages({ niche, brand }: ContentPlanInput): ChatTurn[] {
  const userPrompt = `Nicho: ${niche}
Marca: ${brand && brand.trim() ? brand : '(ainda não definida)'}

Crie um plano de conteúdo inicial contendo:
1. Posicionamento e tom de voz
2. Três pilares de conteúdo
3. Sete ideias de posts (com o formato sugerido: reels, carrossel, imagem, etc.)
4. Sugestão de frequência de publicação

Seja específico para o nicho e prático.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
