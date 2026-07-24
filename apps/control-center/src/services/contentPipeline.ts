// Pipeline de geração de conteúdo (Fase 4 — Negócios).
// Dado o tipo do negócio + nicho + descrição, gera um pacote de conteúdo real
// (ideia/tendência, roteiro, título, descrição e hashtags) via IA.
// Próximos passos (fora deste arquivo): montar o vídeo e postar via API.

import { askBeeHive } from './beehiveApi';
import type { ContentPackage } from '../types';

type BizType = 'cortes' | 'conteudo' | 'afiliados';

function extractJson(text: string): any | null {
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

function briefFor(type: BizType): string {
  switch (type) {
    case 'cortes':
      return 'Você cria CORTES para redes sociais (vídeos curtos verticais, 30-60s, a partir de trechos marcantes). Foque num gancho forte nos 3 primeiros segundos.';
    case 'afiliados':
      return 'Você cria conteúdo de AFILIADOS: apresenta um produto do nicho, mostra benefícios e chama para ação com o link de afiliado. Tom persuasivo mas honesto.';
    case 'conteudo':
    default:
      return 'Você cria conteúdo ORIGINAL do zero (canal dark/faceless): vídeos curtos verticais narrados sobre o nicho (histórias, curiosidades, fitness, culinária, terror, etc). Roteiro envolvente do início ao fim.';
  }
}

/**
 * Gera um pacote de conteúdo pronto para virar vídeo/post.
 * Nunca lança: em falha, retorna um pacote com aviso no roteiro.
 */
export async function generateContentPackage(input: {
  type: BizType;
  niche: string;
  description?: string;
}): Promise<ContentPackage> {
  const prompt = `${briefFor(input.type)}

Nicho: ${input.niche || '(não informado)'}
${input.description ? `Diretrizes: ${input.description}` : ''}

Gere UMA ideia de conteúdo pronta para produção. Responda SOMENTE com JSON válido:
{
  "idea": "tema/ângulo específico da postagem (1 frase)",
  "script": "roteiro completo da narração, pronto para gravar (com quebras de linha)",
  "title": "título chamativo para a postagem",
  "description": "descrição/legenda para a rede social",
  "hashtags": ["hashtag1", "hashtag2", "..."]
}

Regras: título curto e com gancho; hashtags relevantes ao nicho (sem #, só a palavra); roteiro em português. JSON apenas.`;

  const base: ContentPackage = {
    id: 'ct_' + Math.random().toString(36).slice(2, 9),
    createdAt: new Date().toISOString(),
    idea: '',
    script: '',
    title: '',
    description: '',
    hashtags: [],
    status: 'gerado',
  };

  try {
    const raw = await askBeeHive(prompt);
    const p = extractJson(raw);
    if (!p) return { ...base, idea: 'Falha ao gerar', script: raw.slice(0, 2000) };
    return {
      ...base,
      idea: String(p.idea ?? '').trim(),
      script: String(p.script ?? '').trim(),
      title: String(p.title ?? '').trim(),
      description: String(p.description ?? '').trim(),
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((h: unknown) => String(h).replace(/^#/, '')) : [],
    };
  } catch {
    return { ...base, idea: 'Falha ao gerar', script: 'Não consegui gerar o conteúdo agora. Tente novamente.' };
  }
}
