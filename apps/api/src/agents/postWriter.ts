import type { ChatTurn } from '../intelligence/types';

/**
 * Agente Redator de Posts (Área Business).
 *
 * A partir do nicho, da marca e (opcionalmente) do plano de conteúdo já gerado,
 * escreve posts prontos para publicar. Como todo agente, só monta o contexto —
 * a inteligência vem pela abstração (P7).
 */
export interface PostsInput {
  niche: string;
  brand?: string;
  plan?: string;
}

const SYSTEM_PROMPT = `Você é um redator publicitário (copywriter) especialista em redes sociais, em português do Brasil.
Escreve legendas prontas para publicar: naturais, envolventes e adequadas ao nicho e ao tom da marca.
Responda em Markdown, organizado e objetivo.`;

export function buildPostsMessages({ niche, brand, plan }: PostsInput): ChatTurn[] {
  const planBlock = plan && plan.trim() ? `\n\nPlano de conteúdo de referência:\n${plan}` : '';

  const userPrompt = `Nicho: ${niche}
Marca / tom de voz: ${brand && brand.trim() ? brand : '(não definido)'}${planBlock}

Escreva 5 posts prontos para publicar. Numere de 1 a 5. Para cada post, inclua:
- **Formato**: reels, carrossel, imagem única ou story
- **Legenda**: pronta para copiar e colar (com quebras de linha e emojis quando fizer sentido)
- **Hashtags**: de 5 a 10, relevantes ao nicho

Varie os formatos e os pilares. Seja específico para o nicho.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
