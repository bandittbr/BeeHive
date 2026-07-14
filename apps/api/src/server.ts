import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runtime } from './runtimeConfig';
import { createOllamaProvider } from './intelligence/ollamaProvider';
import { createOpenAIProvider } from './intelligence/openaiProvider';
import { createBeeHiveRouter } from './intelligence/routerFactory';
import { createConversationOrchestrator } from './core/conversationOrchestrator';
import { createPollinationsProvider } from './media/imageProvider';
import { createBeeHiveRuntime } from './beehiveRuntime';
import { attachRuntimeEventsSocket, mountRuntimeHttpRoutes } from './runtimeRoutes';
import { mountConversationRoutes } from './routes/conversationRoutes';
import { mountBusinessRoutes } from './routes/businessRoutes';
import { mountMediaRoutes } from './routes/mediaRoutes';
import { mountSystemRoutes } from './routes/systemRoutes';
import { mountProjectRoutes } from './routes/projectRoutes';
import { mountAffiliatesRoutes } from './routes/affiliatesRoutes';
import { mountProviderRoutes } from './routes/providerRoutes';
import { mountShortsAgentRoutes } from './routes/shortsAgentRoutes';
import { mountShortsPipelineRoutes } from './routes/shortsPipelineRoutes';
import { mountShortsPublishRoutes } from './routes/shortsPublishRoutes';
import { mountBrowserRoutes } from './routes/browserRoutes';
import { bootstrapWorker } from './affiliates';
import { DatabaseManager } from '@beehive/platform/server';

/**
 * Servidor do BeeHive (Core).
 *
 * A inteligência é injetada por abstração. Suporta:
 *  - 'llmrouter': múltiplos providers free com failover automático
 *  - 'openai': um único provider OpenAI-compatível
 *  - 'ollama': Ollama local (fallback)
 */
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Database (SQLite) ---
const db = new DatabaseManager({ dbPath: 'data/beehive.db' });

// --- Rotas de Projetos (sempre disponíveis, independente do provider) ---
mountProjectRoutes(app, db);

// --- Rotas de Afiliados (sempre disponíveis) ---
mountAffiliatesRoutes(app, db);

// --- Rotas de Cortes Youtube (agentes e publish sempre disponíveis) ---
mountShortsAgentRoutes(app, db);
mountShortsPublishRoutes(app, db);

// --- Worker de Afiliados (BullMQ + Redis) ---
bootstrapWorker(db);

// --- Escolha do provedor de IA ---
let providerName = 'nenhum';

if (config.aiProvider === 'llmrouter') {
  const routerResult = createBeeHiveRouter();
  if (routerResult) {
    providerName = `llmrouter [${routerResult.activeProviders.join(', ')}]`;
    const firstProvider = routerResult.activeProviders[0];
    const [id, model] = firstProvider.split(':');
    const cfg = {
      apiKey: (config as any)[id]?.apiKey ?? config.openai.apiKey,
      baseUrl: (config as any)[id]?.baseUrl ?? config.openai.baseUrl,
      model: model ?? config.openai.model,
      providerName: id,
    };
    const provider = createOpenAIProvider(cfg);
    const orchestrator = createConversationOrchestrator(provider);
    const imageProvider = createPollinationsProvider();
    const beehiveRuntime = await createBeeHiveRuntime({ useRouter: true });
    mountRuntimeHttpRoutes(app, beehiveRuntime);
    mountProviderRoutes(app, beehiveRuntime);
    mountSystemRoutes(app, provider, { model: runtime.model, status: beehiveRuntime.status });
    mountConversationRoutes(app, orchestrator);
    mountBusinessRoutes(app, provider);
    mountMediaRoutes(app, imageProvider);
    mountShortsPipelineRoutes(app, db, beehiveRuntime);
    mountBrowserRoutes(app, db);
    const httpServer = createServer(app);
    attachRuntimeEventsSocket(httpServer, beehiveRuntime);
    httpServer.listen(config.port, () => {
      console.log(`[BeeHive API] ouvindo em http://localhost:${config.port} — inteligência: ${providerName} — Runtime: ${beehiveRuntime.status}`);
    });
  } else {
    console.error('[BeeHive API] Nenhuma chave de API configurada para llmrouter. Configure GROQ_API_KEY ou OPENROUTER_API_KEY no .env');
    process.exit(1);
  }
} else {
  const provider = config.aiProvider === 'openai'
    ? createOpenAIProvider()
    : createOllamaProvider();
  providerName = provider.name;
  const orchestrator = createConversationOrchestrator(provider);
  const imageProvider = createPollinationsProvider();
  const beehiveRuntime = await createBeeHiveRuntime();
  mountRuntimeHttpRoutes(app, beehiveRuntime);
  mountProviderRoutes(app, beehiveRuntime);
  mountSystemRoutes(app, provider, { model: runtime.model, status: beehiveRuntime.status });
  mountConversationRoutes(app, orchestrator);
  mountBusinessRoutes(app, provider);
  mountMediaRoutes(app, imageProvider);
mountShortsPipelineRoutes(app, db, beehiveRuntime);
    mountBrowserRoutes(app, db);
    const httpServer = createServer(app);
  attachRuntimeEventsSocket(httpServer, beehiveRuntime);
  httpServer.listen(config.port, () => {
    console.log(
      `[BeeHive API] ouvindo em http://localhost:${config.port} — inteligência: ${providerName} — Runtime: ${beehiveRuntime.status}`,
    );
  });
}
