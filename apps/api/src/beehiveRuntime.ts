// Subpath dedicado (não o `.` raiz): `RuntimeManager` é o valor que carrega o
// Tool System inteiro (incluindo `node:fs` via `FilesystemTool`). O `.` raiz
// só expõe isto como TIPO, para não quebrar o bundle do navegador (`apps/web`)
// — só `apps/api` (Node) precisa do valor de verdade.
import { RuntimeManager } from '@beehive/platform/runtime';
import { ProviderManager } from '@beehive/platform';
import { config } from './config';

export interface CreateRuntimeOptions {
  /** Se true, ignora o autoLoad e usa o provider legado (compatibilidade). */
  useRouter?: boolean;
}

/**
 * Boot do BeeHive Runtime dentro do apps/api.
 *
 * Novo fluxo (ProviderManager unificado):
 *  1. Cria o ProviderManager
 *  2. autoLoad: carrega providers do catálogo com credenciais salvas no SQLite
 *  3. O primeiro provider habilitado vira o ativo
 *  4. Modelo padrão: BigPickle (se nada configurado)
 *
 * Fluxo legado (useRouter=true ou sem banco):
 *  - Mantém o comportamento anterior com LLMRouter/openaiProvider
 */
export async function createBeeHiveRuntime(options?: CreateRuntimeOptions): Promise<RuntimeManager> {
  const runtime = new RuntimeManager();

  // Tenta usar o novo ProviderManager com autoLoad
  let provider: any = undefined;

  if (!options?.useRouter) {
    try {
      const Database = require('better-sqlite3');
      const dbPath = 'data/beehive.db';

      // Garante que o diretório existe
      const fs = require('node:fs');
      const path = require('node:path');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const db = new Database(dbPath);
      const manager = new ProviderManager({ logger: undefined });
      manager.autoLoad(db);

      // Se há um provider habilitado, usa ele
      const active = manager.activeProvider();
      if (active) {
        provider = active;
        const model = manager.getDefaultModel();
        console.log(`[BeeHive Runtime] ProviderManager ativo: ${active.id} (${active.name}), modelo: ${model ?? '(padrão do provider)'}`);
      } else {
        console.log('[BeeHive Runtime] Nenhum provider habilitado no ProviderManager. Usando fallback.');
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      console.warn(`[BeeHive Runtime] ProviderManager não pôde carregar: ${detail}. Usando fallback.`);
    }
  }

  // Fallback: fluxo legado (LLMRouter ou OpenAI direto)
  if (!provider) {
    if (config.aiProvider === 'llmrouter') {
      const { createBeeHiveRouter } = require('./intelligence/routerFactory');
      const routerResult = createBeeHiveRouter();
      if (routerResult) {
        provider = routerResult.router;
        console.log(`[BeeHive Runtime] LLMRouter ativo: ${routerResult.activeProviders.join(', ')}`);
      }
    } else if (config.aiProvider === 'openai' && config.openai.apiKey) {
      const { createOpenAIProvider } = require('@beehive/platform');
      provider = createOpenAIProvider({
        apiKey: config.openai.apiKey,
        baseUrl: config.openai.baseUrl,
        model: config.openai.model,
        providerName: config.openai.providerName,
      });
    }
  }

  try {
    await runtime.start({ provider });
    console.log('[BeeHive Runtime] em execução dentro do apps/api.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    console.error(`[BeeHive Runtime] falhou ao iniciar: ${detail}`);
  }
  return runtime;
}
