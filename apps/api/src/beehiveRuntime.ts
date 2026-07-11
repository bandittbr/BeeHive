// Subpath dedicado (não o `.` raiz): `RuntimeManager` é o valor que carrega o
// Tool System inteiro (incluindo `node:fs` via `FilesystemTool`). O `.` raiz
// só expõe isto como TIPO, para não quebrar o bundle do navegador (`apps/web`)
// — só `apps/api` (Node) precisa do valor de verdade.
import { RuntimeManager } from '@beehive/platform/runtime';
import { createOpenAIProvider } from '@beehive/platform';
import type { AIProvider } from '@beehive/platform';
import { config } from './config';
import { createBeeHiveRouter } from './intelligence/routerFactory';

export interface CreateRuntimeOptions {
  /** Se true, usa o LLMRouter com failover automático entre providers */
  useRouter?: boolean;
}

/**
 * Boot do BeeHive Runtime dentro do apps/api.
 *
 * O provedor de IA é escolhido com base em config.aiProvider:
 *  - 'llmrouter': múltiplos providers free com failover automático
 *  - 'openai': usa a API cloud configurada (OpenAI, OpenRouter, etc.)
 *  - 'ollama': usa Ollama local
 */
export async function createBeeHiveRuntime(options?: CreateRuntimeOptions): Promise<RuntimeManager> {
  const runtime = new RuntimeManager();

  // Escolhe o provedor baseado na configuração
  let provider: AIProvider | undefined;

  if (options?.useRouter || config.aiProvider === 'llmrouter') {
    const routerResult = createBeeHiveRouter();
    if (routerResult) {
      provider = routerResult.router;
      // eslint-disable-next-line no-console
      console.log(`[BeeHive Runtime] LLMRouter ativo: ${routerResult.activeProviders.join(', ')}`);
    }
  } else if (config.aiProvider === 'openai' && config.openai.apiKey) {
    provider = createOpenAIProvider({
      apiKey: config.openai.apiKey,
      baseUrl: config.openai.baseUrl,
      model: config.openai.model,
      providerName: config.openai.providerName,
    });
  }

  try {
    await runtime.start({ provider });
    // eslint-disable-next-line no-console
    console.log('[BeeHive Runtime] em execução dentro do apps/api.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    // eslint-disable-next-line no-console
    console.error(`[BeeHive Runtime] falhou ao iniciar: ${detail}`);
  }
  return runtime;
}
