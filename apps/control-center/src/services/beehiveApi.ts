// Backend real do BeeHive — já está no ar no Railway, rodando um kernel/provider
// system completo (não faz parte deste repositório; ver PROJECT log de 2026-07-18
// sobre a investigação de onde esse código mora). Usado aqui só para o Chat
// responder de verdade (modelo grátis, opencode:big-pickle) em vez de simular
// uma resposta com setTimeout.
//
// Contrato confirmado na mão (o servidor não expõe OpenAPI/docs):
//   POST /api/conversation/respond
//   body:  { message: { role: "user", content: string } }
//   resp:  { messages: [{ role: "assistant", content: string }] }
//
// OBS: O backend NÃO suporta SSE/streaming nativo — retorna JSON completo.
// O streaming no frontend é simulado via chunking da resposta completa.

const BEEHIVE_API_URL = 'https://beehive-production-d934.up.railway.app';

// Non-streaming version (for backwards compatibility)
export async function askBeeHive(content: string): Promise<string> {
  try {
    const res = await fetch(`${BEEHIVE_API_URL}/api/conversation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { role: 'user', content } }),
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
    console.error('[beehiveApi] falha ao chamar o backend real:', err);
    return 'Não consegui falar com o servidor de IA agora (o backend do Railway pode estar fora do ar). Tente de novo em instantes.';
  }
}

// Streaming version — simulated chunking (backend não suporta SSE nativo)
export async function askBeeHiveStream(
  content: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const res = await fetch(`${BEEHIVE_API_URL}/api/conversation/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { role: 'user', content } }),
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
      accumulated += word;
      onChunk(accumulated);
      // Variable delay for more natural feel: 20-80ms per chunk
      await new Promise(r => setTimeout(r, 20 + Math.random() * 60));
    }
  } catch (err) {
    console.error('[beehiveApi] falha no streaming:', err);
    onChunk('Não consegui falar com o servidor de IA agora. Tente de novo em instantes.');
  }
}