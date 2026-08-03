// Backend real do BeeHive — apps/worker (Railway, root Dockerfile em pnpm).
// Usado aqui pro Chat responder de verdade via plugin ai-manager
// (executeCapability('ai.complete', ...) em apps/worker/src/index.ts).
//
// Contrato: POST /api/conversation/respond
//   body:  { message: { role: "user", content: string } }
//   resp:  { messages: [{ role: "assistant", content: string }] }
//
// OBS: O backend NÃO suporta SSE/streaming nativo — retorna JSON completo.
// O streaming no frontend é simulado via chunking da resposta completa.
//
// 2026-07-24: corrigido — apontava para um domínio Railway órfão
// (beehive-production-d934), que não pertence a nenhum projeto desta conta
// e só devolvia fallback. O domínio real do serviço @beehive/worker é
// beehive-production-d895.up.railway.app.

import { authHeaders } from './authToken';

export const BEEHIVE_API_URL = 'https://beehive-production-3701.up.railway.app';

// modelID: slug do modelo no OpenRouter (ex.: "deepseek/deepseek-v4-pro").
// Se omitido, o worker usa o padrão do ambiente (AI_MODEL / deepseek-v4-pro).
// omnirouter: quando true, o backend troca de modelo sozinho na cadeia de
// fallback (plugins/ai-manager/src/capabilities/ai.complete.ts) se o modelo
// pedido ficar sem crédito ou bater rate limit.
// conversationId: se informado (e o usuário estiver logado), o worker carrega
// o histórico real da conversa (Supabase) em vez de só a última mensagem, e
// persiste a pergunta + resposta — é isso que faz o chat "lembrar" entre sessões.
export interface AskOptions {
  modelID?: string;
  omnirouter?: boolean;
  conversationId?: string;
  /** Passa o AbortSignal do botão de pausar — cancela o fetch e, no
   * streaming, corta a animação de digitação no meio. */
  signal?: AbortSignal;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// Non-streaming version (for backwards compatibility)
export async function askBeeHive(content: string, opts: AskOptions = {}): Promise<string> {
  try {
    const res = await fetch(`${BEEHIVE_API_URL}/api/conversation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ message: { role: 'user', content }, model: opts.modelID, omnirouter: opts.omnirouter, conversationId: opts.conversationId }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    const reply = messages[messages.length - 1];
    return typeof reply?.content === 'string' ? reply.content : 'Não consegui gerar uma resposta agora.';
  } catch (err) {
    if (isAbortError(err)) throw err; // deixa o chamador tratar o cancelamento
    console.error('[beehiveApi] falha ao chamar o backend real:', err);
    return 'Não consegui falar com o servidor de IA agora (o backend do Railway pode estar fora do ar). Tente de novo em instantes.';
  }
}

// Streaming version — simulated chunking (backend não suporta SSE nativo)
export async function askBeeHiveStream(
  content: string,
  onChunk: (chunk: string) => void,
  opts: AskOptions = {}
): Promise<void> {
  try {
    const res = await fetch(`${BEEHIVE_API_URL}/api/conversation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ message: { role: 'user', content }, model: opts.modelID, omnirouter: opts.omnirouter, conversationId: opts.conversationId }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    const reply = messages[messages.length - 1];
    const fullContent = typeof reply?.content === 'string' ? reply.content : 'Não consegui gerar uma resposta agora.';

    // Simulate streaming by chunking words with realistic timing
    const words = fullContent.split(/(\s+)/).filter(w => w.length > 0);
    let accumulated = '';

    for (const word of words) {
      if (opts.signal?.aborted) return; // usuário clicou em pausar — para a "digitação" no meio
      accumulated += word;
      onChunk(accumulated);
      // Variable delay for more natural feel: 20-80ms per chunk
      await new Promise(r => setTimeout(r, 20 + Math.random() * 60));
    }
  } catch (err) {
    if (isAbortError(err)) return; // cancelado antes mesmo da resposta chegar — não sobrescreve com msg de erro
    console.error('[beehiveApi] falha no streaming:', err);
    onChunk('Não consegui falar com o servidor de IA agora. Tente de novo em instantes.');
  }
}