/**
 * Modelos Virtuais — Automação de Postagem
 * =========================================
 * A cada tick:
 * 1. Para cada modelo ativo, verifica se precisa postar
 * 2. Escolhe foto aleatória não usada
 * 3. Gera legenda via IA
 * 4. Publica nas contas conectadas
 * 5. Marca foto como usada
 */

import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_ROOT } from './workspace.js';
import { executeCapability } from './kernel-bridge.js';
import { debugLog } from './debug-log.js';

// Import store functions dynamically to avoid circular deps if any
import {
  listModels, getModel, updateModel,
  listUnusedPhotos, addModelLog, updateModelLog, listModelLogs,
  addPost, type ScheduledPost, type PlatformId,
  type VirtualModel, type VirtualModelLog,
} from './store.js';

let ticking = false;

export async function modelosAutomationTick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  debugLog('[modelos] Tick iniciado');

  try {
    const models = await listModels();
    const activeModels = models.filter((m) => m.active);
    
    if (activeModels.length === 0) {
      debugLog('[modelos] Nenhum modelo ativo');
      return;
    }

    for (const model of activeModels) {
      try {
        await processModel(model);
      } catch (e) {
        debugLog(`[modelos] Erro processando modelo "${model.name}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    debugLog(`[modelos] Tick concluído: ${activeModels.length} modelo(s)`);
  } catch (e) {
    debugLog(`[modelos] Tick falhou: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    ticking = false;
  }
}

async function processModel(model: VirtualModel): Promise<void> {
  const logs = await listModelLogs(model.id, 10);
  
  // Check how many posts today
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayPosts = logs.filter((l) => l.runAt >= todayStart.getTime() && l.status === 'done');
  
  if (todayPosts.length >= model.postsPerDay) {
    debugLog(`[modelos] "${model.name}": ${todayPosts.length}/${model.postsPerDay} hoje, pulando`);
    return;
  }

  // Find unused photos
  const unused = await listUnusedPhotos(model.id);
  if (unused.length === 0) {
    debugLog(`[modelos] "${model.name}": sem fotos disponíveis (${model.photoDir})`);
    return;
  }

  // Pick random photo
  const photoFile = unused[Math.floor(Math.random() * unused.length)];
  const photoPath = path.join(model.photoDir, photoFile);
  
  debugLog(`[modelos] "${model.name}": postando "${photoFile}" (${unused.length - 1} restantes)`);

  // Create log entry
  const logEntry = await addModelLog({
    modelId: model.id,
    runAt: Date.now(),
    photoFile,
    status: 'pending',
  });

  try {
    // Generate caption via AI
    const caption = await generateCaption(model.name);
    
    // Publish to each connected account
    const publishedTo: string[] = [];
    for (const acc of model.accounts) {
      try {
        await publishToPlatform(photoPath, caption, acc.platform, acc.accountId);
        publishedTo.push(acc.platform);
      } catch (pubErr) {
        debugLog(`[modelos] "${model.name}": erro publicando em ${acc.platform}: ${pubErr instanceof Error ? pubErr.message : String(pubErr)}`);
      }
    }

    await updateModelLog(logEntry.id, {
      status: publishedTo.length > 0 ? 'done' : 'error',
      finishedAt: Date.now(),
      caption,
      publishedTo,
    });

    debugLog(`[modelos] "${model.name}": publicado em ${publishedTo.join(', ') || 'nenhuma plataforma'}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateModelLog(logEntry.id, { status: 'error', finishedAt: Date.now(), error: msg });
    debugLog(`[modelos] "${model.name}": erro: ${msg}`);
  }
}

async function generateCaption(modelName: string): Promise<string> {
  const prompt = `Você é um social media manager. Crie uma legenda curta e atraente para uma postagem de foto 
da modelo/modelo virtual "${modelName}" no Instagram/TikTok.

A legenda deve:
- Ter no máximo 150 caracteres
- Ser descontraída e jovem
- Incluir 3-5 hashtags relevantes no final
- Estar em português brasileiro

Responda APENAS com o texto da legenda.`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    return content.replace(/^["']|["']$/g, '').trim() || `✨ Novo post de ${modelName}! 🌟 #modelo #foto #estilo`;
  } catch {
    return `✨ Novo post de ${modelName}! 🌟 #modelo #foto #estilo`;
  }
}

async function publishToPlatform(
  photoPath: string,
  caption: string,
  platform: string,
  accountId?: string,
): Promise<void> {
  // Schedule the post via the existing post scheduler
  await addPost({
    file: photoPath,
    title: caption.slice(0, 100),
    description: caption,
    tags: caption.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [],
    at: Date.now() + 60000, // 1 minute from now (give time to process)
    platform: platform as PlatformId,
    accountId,
    origin: 'modelos',
  });
  
  debugLog(`[modelos] Post agendado: ${platform} @ ${new Date(Date.now() + 60000).toLocaleTimeString('pt-BR')}`);
}
