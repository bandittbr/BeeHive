import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runtime } from './runtimeConfig';
import { createOllamaProvider } from './intelligence/ollamaProvider';
import { createConversationOrchestrator } from './core/conversationOrchestrator';
import { createPollinationsProvider } from './media/imageProvider';
import { createBeeHiveRuntime } from './beehiveRuntime';
import { attachRuntimeEventsSocket, mountRuntimeHttpRoutes } from './runtimeRoutes';
import { mountConversationRoutes } from './routes/conversationRoutes';
import { mountBusinessRoutes } from './routes/businessRoutes';
import { mountMediaRoutes } from './routes/mediaRoutes';
import { mountSystemRoutes } from './routes/systemRoutes';

/**
 * Servidor do BeeHive (Core).
 *
 * Expõe a Conversa por HTTP. A inteligência é injetada por abstração: hoje
 * Ollama, amanhã qualquer outro provedor, sem mudar este arquivo além da
 * linha de criação do provider.
 */
const app = express();
app.use(cors());
app.use(express.json());

const provider = createOllamaProvider();
const orchestrator = createConversationOrchestrator(provider);
const imageProvider = createPollinationsProvider();

// BeeHive Runtime (Sprint 12): Kernel + Tools + Providers + Services + Modules
// passam a viver neste processo. Expõe status/health/snapshot/logs/comandos
// por HTTP e eventos por WebSocket — a Web é só um cliente (ver apps/web/src/app).
const beehiveRuntime = await createBeeHiveRuntime();
mountRuntimeHttpRoutes(app, beehiveRuntime);

mountSystemRoutes(app, provider, { model: runtime.model, status: beehiveRuntime.status });
mountConversationRoutes(app, orchestrator);
mountBusinessRoutes(app, provider);
mountMediaRoutes(app, imageProvider);

const httpServer = createServer(app);
attachRuntimeEventsSocket(httpServer, beehiveRuntime);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[BeeHive API] ouvindo em http://localhost:${config.port} — inteligência: ${provider.name} — Runtime: ${beehiveRuntime.status}`,
  );
});
