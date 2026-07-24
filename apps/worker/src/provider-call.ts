// Chamada real de IA (chat completion) e teste de conexão para qualquer
// provider BYOK do usuário. Roda no servidor (worker) — evita os problemas de
// CORS que provider fetch teria direto do navegador, e mantém a api key
// longe do cliente depois de salva.
export interface ChatMessage { role: string; content: string }
export interface CompletionResult { content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
export interface TestResult { success: boolean; error?: string; latency?: number; models?: string[] }

const OPENAI_COMPAT_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  perplexity: 'https://api.perplexity.ai',
  xai: 'https://api.x.ai/v1',
  github: 'https://models.inference.ai.azure.com',
  nvidia: 'https://integrate.api.nvidia.com/v1',
};

function resolveBaseUrl(providerType: string, baseUrl?: string | null): string {
  if (providerType === 'custom' || providerType === 'ollama') {
    return (baseUrl || (providerType === 'ollama' ? 'http://localhost:11434' : '')).replace(/\/+$/, '');
  }
  return OPENAI_COMPAT_BASE[providerType] || (baseUrl || '').replace(/\/+$/, '');
}

async function openAICompatCall(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[]): Promise<CompletionResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, messages }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const usage = data?.usage ?? {};
  return {
    content: data?.choices?.[0]?.message?.content ?? '',
    usage: { promptTokens: usage.prompt_tokens ?? 0, completionTokens: usage.completion_tokens ?? 0, totalTokens: usage.total_tokens ?? 0 },
  };
}

async function anthropicCall(apiKey: string, model: string, messages: ChatMessage[]): Promise<CompletionResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 4096, messages }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const usage = data?.usage ?? {};
  return {
    content: Array.isArray(data?.content) ? data.content.map((c: any) => c.text ?? '').join('') : '',
    usage: { promptTokens: usage.input_tokens ?? 0, completionTokens: usage.output_tokens ?? 0, totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) },
  };
}

async function googleCall(apiKey: string, model: string, messages: ChatMessage[]): Promise<CompletionResult> {
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const usage = data?.usageMetadata ?? {};
  return {
    content: data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '',
    usage: { promptTokens: usage.promptTokenCount ?? 0, completionTokens: usage.candidatesTokenCount ?? 0, totalTokens: usage.totalTokenCount ?? 0 },
  };
}

export async function callProviderCompletion(
  providerType: string, apiKey: string, baseUrl: string | undefined, model: string, messages: ChatMessage[],
): Promise<CompletionResult> {
  if (providerType === 'anthropic') return anthropicCall(apiKey, model, messages);
  if (providerType === 'google') return googleCall(apiKey, model, messages);
  const base = resolveBaseUrl(providerType, baseUrl);
  if (!base) throw new Error(`Sem endpoint configurado para o provider "${providerType}"`);
  return openAICompatCall(base, apiKey, model, messages);
}

export async function testProviderConnection(providerType: string, apiKey: string, baseUrl?: string | null): Promise<TestResult> {
  const start = Date.now();
  try {
    if (providerType === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      });
      if (!res.ok) { const err = await res.text(); return { success: false, error: `Anthropic ${res.status}: ${err}`, latency: Date.now() - start }; }
      return { success: true, latency: Date.now() - start, models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] };
    }
    if (providerType === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) { const err = await res.text(); return { success: false, error: `${res.status}: ${err}`, latency: Date.now() - start }; }
      const data: any = await res.json();
      const models = (data.models || []).map((m: any) => String(m.name || '').replace('models/', ''));
      return { success: true, latency: Date.now() - start, models };
    }
    const base = resolveBaseUrl(providerType, baseUrl);
    if (!base) return { success: false, error: 'Sem endpoint configurado', latency: Date.now() - start };
    const url = providerType === 'ollama' ? `${base}/api/tags` : `${base}/models`;
    const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { const err = await res.text(); return { success: false, error: `${res.status}: ${err}`, latency: Date.now() - start }; }
    const data: any = await res.json();
    const list = data.data || data.models || [];
    const models = list.map((m: any) => m.id || m.name).filter(Boolean);
    return { success: true, latency: Date.now() - start, models };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed', latency: Date.now() - start };
  }
}
