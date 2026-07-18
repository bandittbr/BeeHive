// Backend real do BeeHive — já está no ar no Railway, rodando um kernel/provider
// system completo (nào faz parte deste repositório; ver PROJECT log de 2026-07-18
// sobre a investigaçào de onde esse código mora). Usado aqui só para o Chat
// responder de verdade (modelo grátis, opencode:big-pickle) em vez de simular
// uma resposta com setTimeout.
//
// Contrato confirmado na mào (o servidor nào expõe OpenAPI/docs):
//   POST /api/conversation/respond
//   body:  { message: { role: "user", content: string } }
//   resp:  { messages: [{ role: "assistant", content: string }] }

const BEEHIVE_API_URL = 'https://beehive-production-d934.up.railway.app';

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
    return typeof reply?.content === 'string' ? reply.content : 'Nào consegui gerar uma resposta agora.';
  } catch (err) {
    console.error('[beehiveApi] falha ao chamar o backend real:', err);
    return 'Nào consegui falar com o servidor de IA agora (o backend do Railway pode estar fora do ar). Tente de novo em instantes.';
  }
}

