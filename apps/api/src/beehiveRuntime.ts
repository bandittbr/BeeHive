// Subpath dedicado (não o `.` raiz): `RuntimeManager` é o valor que carrega o
// Tool System inteiro (incluindo `node:fs` via `FilesystemTool`). O `.` raiz
// só expõe isto como TIPO, para não quebrar o bundle do navegador (`apps/web`)
// — só `apps/api` (Node) precisa do valor de verdade.
import { RuntimeManager } from '@beehive/platform/runtime';
import { ProviderManager } from '@beehive/platform/server';
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

  // Carrega o ProviderManager + SQLite para suportar os comandos /api/providers
  // (provider.list, save, test, activate, etc.), independente do fluxo de
  // provider ativo. O provider efetivamente usado pelo runtime só é definido
  // a partir daqui quando NÃO é o fluxo legado (useRouter).
  let provider: any = undefined;
  let providerManager: ProviderManager | undefined;
  let db: any;

  try {
    const { default: Database } = await import('better-sqlite3');
    const dbPath = 'data/beehive.db';

    // Garante que o diretório existe
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    providerManager = new ProviderManager({ logger: undefined });
    await providerManager.autoLoad(db);

    // Se há um provider habilitado e NÃO é o fluxo legado, usa ele como ativo
    if (!options?.useRouter) {
      const active = providerManager.activeProvider();
      if (active) {
        provider = active;
        const model = providerManager.getDefaultModel();
        console.log(`[BeeHive Runtime] ProviderManager ativo: ${active.id} (${active.name}), modelo: ${model ?? '(padrão do provider)'}`);
      } else {
        console.log('[BeeHive Runtime] Nenhum provider habilitado no ProviderManager. Usando fallback.');
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    console.warn(`[BeeHive Runtime] ProviderManager não pôde carregar: ${detail}. Usando fallback.`);
  }

  // Fallback: fluxo legado (LLMRouter ou OpenAI direto)
  if (!provider) {
    if (config.aiProvider === 'llmrouter') {
      const { createBeeHiveRouter } = await import('./intelligence/routerFactory');
      const routerResult = createBeeHiveRouter();
      if (routerResult) {
        provider = routerResult.router;
        console.log(`[BeeHive Runtime] LLMRouter ativo: ${routerResult.activeProviders.join(', ')}`);
      }
    } else if (config.aiProvider === 'openai' && config.openai.apiKey) {
      const { createOpenAIProvider } = await import('@beehive/platform');
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

  // Registra os comandos de provider (provider.list, save, test, etc.) no
  // Kernel, para que as rotas /api/providers funcionem. Só é possível DEPOIS
  // de runtime.start(), pois o contexto/kernel só existe a partir daí.
  if (providerManager && db) {
    try {
      const { registerProviderCommands } = await import('@beehive/platform/server');
      registerProviderCommands(runtime.context.kernel.context, providerManager, db);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      console.warn(`[BeeHive Runtime] Falha ao registrar comandos de provider: ${detail}`);
    }
  }

  return runtime;
}
