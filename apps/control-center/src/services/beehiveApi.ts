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

// Streaming version using SSE
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

    // Check if the response supports streaming
    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback: read all at once
      const data = await res.json();
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const reply = messages[messages.length - 1];
      const content = typeof reply?.content === 'string' ? reply.content : 'Não consegui gerar uma resposta agora.';
      // Simulate streaming by chunking
      const chunks = content.match(/.{1,10}/g) || [];
      for (const chunk of chunks) {
        onChunk(chunk);
        await new Promise(r => setTimeout(r, 20));
      }
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Try to parse complete JSON objects from buffer
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
        boundary = buffer.indexOf('\n');
      }
    }

    // Handle any remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch {
        // Ignore
      }
    }
  } catch (err) {
    console.error('[beehiveApi] falha no streaming:', err);
    onChunk('Não consegui falar com o servidor de IA agora. Tente de novo em instantes.');
  }
}