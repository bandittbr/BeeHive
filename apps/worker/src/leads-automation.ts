/**
 * Motor de Automação de Leads — AGORA COM MODO DIÁRIO
 * ====================================================
 *
 * MODO DIÁRIO (dailyMode=true):
 *   Das 08:00 às 20:00, processa 1 lead COMPLETO por tick.
 *   Às 08:00 faz scrape automático de 50 leads de um tema aleatório.
 *   Pipeline: scrap → segmento → serviços → validação → previews → proposta → WhatsApp
 *
 * MODO CONTÍNUO (dailyMode=false, legado):
 *   Processa leads em lote por etapa a cada tick.
 */

import path from 'node:path';
import fs from 'node:fs';
import {
  listLeads, updateLead, addLead, getLeadsAutomationConfig,
  updateLeadsAutomationConfig, addLeadsAutomationLog, updateLeadsAutomationLog,
  type Lead, type LeadStatus,
} from './store.js';
import {
  identifySegment, identifyServices, validateLead, runScraper,
  generateSampleSite, generateProposalMessage,
} from './executors/leads.js';
import { whatsappSendMessage, whatsappSendImage, whatsappGetStatus } from './executors/whatsapp-baileys.js';
import { WORKSPACE_ROOT } from './workspace.js';

let ticking = false;

/** Temas de busca para scrape automático */
const SEARCH_THEMES = [
  // ── São Paulo ──
  'restaurante em São Paulo SP', 'salão de beleza em São Paulo SP',
  'oficina mecânica em São Paulo SP', 'clínica odontológica em São Paulo SP',
  'mercado em São Paulo SP', 'academia em São Paulo SP',
  'pet shop em São Paulo SP', 'advocacia em São Paulo SP',
  'padaria em São Paulo SP', 'consultório médico em São Paulo SP',
  'barbearia em São Paulo SP', 'pizzaria em São Paulo SP',
  'hotel em São Paulo SP', 'imobiliária em São Paulo SP',
  'auto elétrica em São Paulo SP', 'clínica de estética em São Paulo SP',
  'lanchonete em São Paulo SP', 'farmácia em São Paulo SP',
  'escola em São Paulo SP', 'construtora em São Paulo SP',
  // ── Rio de Janeiro ──
  'restaurante no Rio de Janeiro RJ', 'salão de beleza no Rio de Janeiro RJ',
  'oficina mecânica no Rio de Janeiro RJ', 'clínica odontológica no Rio de Janeiro RJ',
  'mercado no Rio de Janeiro RJ', 'academia no Rio de Janeiro RJ',
  'pet shop no Rio de Janeiro RJ', 'advocacia no Rio de Janeiro RJ',
  'padaria no Rio de Janeiro RJ', 'consultório médico no Rio de Janeiro RJ',
  'barbearia no Rio de Janeiro RJ', 'pizzaria no Rio de Janeiro RJ',
  'hotel no Rio de Janeiro RJ', 'imobiliária no Rio de Janeiro RJ',
  'auto elétrica no Rio de Janeiro RJ', 'clínica de estética no Rio de Janeiro RJ',
  'lanchonete no Rio de Janeiro RJ', 'farmácia no Rio de Janeiro RJ',
  'escola no Rio de Janeiro RJ', 'construtora no Rio de Janeiro RJ',
  // ── Belo Horizonte ──
  'restaurante em Belo Horizonte MG', 'salão de beleza em Belo Horizonte MG',
  'oficina mecânica em Belo Horizonte MG', 'clínica odontológica em Belo Horizonte MG',
  'academia em Belo Horizonte MG', 'barbearia em Belo Horizonte MG',
  'pizzaria em Belo Horizonte MG', 'imobiliária em Belo Horizonte MG',
  'pet shop em Belo Horizonte MG', 'lanchonete em Belo Horizonte MG',
  // ── Curitiba ──
  'restaurante em Curitiba PR', 'salão de beleza em Curitiba PR',
  'oficina mecânica em Curitiba PR', 'clínica odontológica em Curitiba PR',
  'academia em Curitiba PR', 'barbearia em Curitiba PR',
  'mercado em Curitiba PR', 'imobiliária em Curitiba PR',
];

// ──────────────────────────────────────────────────────────────
//  MODO DIÁRIO — Processa 1 lead COMPLETO por tick
// ──────────────────────────────────────────────────────────────

/**
 * Inicia o batch diário: escolhe tema aleatório, faz scrape de 50 leads.
 */
async function startDailyBatch(config: LeadsAutomationConfig, today: string): Promise<void> {
  // Escolhe tema aleatório
  const themeIndex = Math.floor(Math.random() * SEARCH_THEMES.length);
  const searchTerm = SEARCH_THEMES[themeIndex];
  console.log(`[leads-auto] 🚀 INÍCIO DO DIA ${today} — Tema: "${searchTerm}"`);

  try {
    const rawLeads = await runScraper({ search: searchTerm, total: 50, headless: true });
    let saved = 0;
    for (const raw of rawLeads) {
      try {
        await addLead({
          name: raw.name, address: raw.address, phone: raw.phone_number,
          website: raw.website, category: raw.category || raw.place_type,
          placeType: raw.place_type, introduction: raw.introduction,
          status: 'new',
        });
        saved++;
      } catch { /* ignore duplicados */ }
    }
    console.log(`[leads-auto] Batch diário: ${saved} leads salvos de "${searchTerm}"`);
    await updateLeadsAutomationConfig({
      dailyDate: today, dailyProcessed: 0, dailyThemeIndex: themeIndex,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[leads-auto] ERRO no batch diário: ${msg}`);
  }
}

/**
 * Processa 1 lead COMPLETAMENTE: segmento → serviços → validação → previews → proposta → WhatsApp.
 * Retorna true se processou, false se não havia lead disponível.
 */
async function processOneLeadCompletely(config: LeadsAutomationConfig): Promise<boolean> {
  // Pega o próximo lead 'new'
  const newLeads = await listLeads('new');
  if (newLeads.length === 0) return false;

  const lead = newLeads[0];
  const slug = lead.name.slice(0, 40);
  console.log(`[leads-auto] 🎯 Processando lead completo: "${slug}"`);

  try {
    // ── 1. SEGMENTO ──
    const segment = await identifySegment(
      lead.name, lead.category || lead.placeType || '', lead.introduction || '',
    );
    await updateLead(lead.id, { segment, status: 'segment_identified' });
    console.log(`[leads-auto]   ✓ Segmento: ${segment}`);

    // ── 2. SERVIÇOS/PRODUTOS ──
    const services = await identifyServices(lead.name, segment);
    await updateLead(lead.id, { notes: services });
    console.log(`[leads-auto]   ✓ Serviços identificados`);

    // ── 3. VALIDAÇÃO ──
    const validation = await validateLead(lead);
    if (!validation.valid) {
      console.log(`[leads-auto]   ✗ Inválido: ${validation.reason}`);
      await updateLead(lead.id, { status: 'closed', notes: `Inválido: ${validation.reason}` });
      return true;
    }
    console.log(`[leads-auto]   ✓ Lead válido`);

    // ── 4. PREVIEWS (site + redes sociais) ──
    const result = await generateSampleSite(lead.id, lead.name, segment);
    const publicUrl = (process.env.WORKER_PUBLIC_URL ?? 'https://beehive-production-d895.up.railway.app').replace(/\/+$/, '');
    const mainRelPath = result.mainPng.endsWith('.png')
      ? `sites/leads/${encodeURIComponent(lead.id)}/preview.png`
      : `sites/leads/${encodeURIComponent(lead.id)}/index.html`;
    const sampleUrl = `${publicUrl}/files/${mainRelPath}`;
    const socialUrls: string[] = result.socialPngs.map((_, i) =>
      `${publicUrl}/files/sites/leads/${encodeURIComponent(lead.id)}/social/post-${i + 1}.png`,
    );
    await updateLead(lead.id, {
      sampleGenerated: true, sampleUrl, projectType: result.projectType,
      socialMediaUrls: socialUrls, status: 'sample_generated',
    });
    console.log(`[leads-auto]   ✓ Previews gerados (${result.socialPngs.length} posts)`);

    // ── 5. PROPOSTA ──
    const message = await generateProposalMessage(lead.name, segment, result.projectType);
    await updateLead(lead.id, {
      proposalSent: true, proposalSentAt: Date.now(), proposalMessage: message,
      status: 'proposal_sent',
    });
    console.log(`[leads-auto]   ✓ Proposta gerada`);

    // ── 6. WHATSAPP ──
    if (config.autoSendWhatsApp && lead.phone) {
      const waStatus = await whatsappGetStatus();
      if (waStatus.connected) {
        const waResult = await whatsappSendMessage(lead.phone, message);
        if (waResult.ok) {
          await updateLead(lead.id, { whatsappSent: true, whatsappSentAt: Date.now() });
          console.log(`[leads-auto]   ✓ WhatsApp enviado para ${lead.phone}`);

          // Envia preview principal
          const mainPng = path.join(WORKSPACE_ROOT, 'sites', 'leads', lead.id, 'preview.png');
          if (fs.existsSync(mainPng)) {
            await whatsappSendImage(lead.phone, mainPng, `✦ Projeto Digital para ${lead.name}`);
          }
          // Envia posts sociais
          for (let i = 0; i < result.socialPngs.length; i++) {
            const sp = result.socialPngs[i];
            if (fs.existsSync(sp)) {
              await whatsappSendImage(lead.phone, sp, `📱 Post #${i + 1} — ${lead.name}`);
            }
          }
          console.log(`[leads-auto]   ✓ Imagens enviadas`);
        } else {
          console.error(`[leads-auto]   ✗ Falha WhatsApp: ${waResult.message}`);
        }
      } else {
        console.log('[leads-auto]   ⚠ WhatsApp desconectado, pulando envio');
      }
    } else {
      console.log(`[leads-auto]   ⚠ Envio WhatsApp desligado ou sem telefone`);
    }

    // Incrementa contador diário
    await updateLeadsAutomationConfig({ dailyProcessed: (config.dailyProcessed || 0) + 1 });
    console.log(`[leads-auto] ✅ Lead concluído! (${(config.dailyProcessed || 0) + 1}/${config.dailyTarget} hoje)`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[leads-auto] ❌ Erro processando lead "${slug}": ${msg}`);
    // Marca como erro, mas não bloqueia
    await updateLead(lead.id, { status: 'new' }).catch(() => {});
    return true;
  }
}

// ──────────────────────────────────────────────────────────────
//  TICK PRINCIPAL
// ──────────────────────────────────────────────────────────────

/**
 * Tick principal da automação. Chamado pelo scheduler no index.ts.
 * Roteia entre MODO DIÁRIO e MODO CONTÍNUO (legado).
 */
export async function leadsAutomationTick(): Promise<void> {
  if (ticking) return;
  ticking = true;

  const logEntry = await addLeadsAutomationLog({
    runAt: Date.now(), processedCount: 0, advancedCount: 0, errorCount: 0, status: 'running',
  });

  try {
    const config = await getLeadsAutomationConfig();
    if (!config.enabled || !config.autoProcess) {
      await updateLeadsAutomationLog(logEntry.id, { status: 'done', finishedAt: Date.now(), details: 'Automação desabilitada' });
      return;
    }

    // ── Auto-reconnect WhatsApp se houver sessão salva ──
    if (config.autoSendWhatsApp) {
      const waStatus = await whatsappGetStatus();
      const authDir = path.join(WORKSPACE_ROOT, '.wwebjs_auth');
      const hasSession = fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;
      if (!waStatus.connected && !waStatus.waitingQr && hasSession) {
        console.log('[leads-auto] Sessão WhatsApp encontrada, reconectando...');
        try {
          const { whatsappConnect } = await import('./executors/whatsapp-baileys.js');
          const result = await whatsappConnect({ headless: true });
          if (result.waitingQr) {
            console.log('[leads-auto] WhatsApp aguardando QR Code — escaneie no painel');
          } else if (result.ok) {
            console.log('[leads-auto] WhatsApp reconectado com sucesso');
          }
        } catch (e) {
          console.error('[leads-auto] Falha ao reconectar WhatsApp:', e);
        }
      }
    }

    // ── MODO DIÁRIO ──────────────────────────────────────────────
    if (config.dailyMode) {
      const now = new Date();
      const hour = now.getHours();
      const today = now.toISOString().slice(0, 10);

      // Novo dia? Inicia batch
      if (config.dailyDate !== today && hour >= config.dailyStartHour) {
        await startDailyBatch(config, today);
        // Recarrega config atualizada
        const updated = await getLeadsAutomationConfig();
        await updateLeadsAutomationLog(logEntry.id, {
          status: 'done', finishedAt: Date.now(),
          processedCount: 1, details: `Batch diário iniciado — tema #${updated.dailyThemeIndex}`,
        });
        return;
      }

      // Fora do horário?
      if (hour < config.dailyStartHour || hour >= config.dailyEndHour) {
        await updateLeadsAutomationLog(logEntry.id, { status: 'done', finishedAt: Date.now(), details: 'Fora do horário (08:00-20:00)' });
        return;
      }

      // Meta diária já atingida?
      if ((config.dailyProcessed || 0) >= config.dailyTarget) {
        await updateLeadsAutomationLog(logEntry.id, { status: 'done', finishedAt: Date.now(), details: `Meta de ${config.dailyTarget} leads atingida hoje` });
        return;
      }

      // Processa 1 lead COMPLETO
      const processed = await processOneLeadCompletely(config);
      await updateLeadsAutomationLog(logEntry.id, {
        status: 'done', finishedAt: Date.now(),
        processedCount: processed ? 1 : 0,
        details: processed
          ? `Lead processado (${(config.dailyProcessed || 0) + 1}/${config.dailyTarget})`
          : 'Nenhum lead disponível na fila',
      });
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  MODO CONTÍNUO (LEGADO) — processa em lote por etapa
    // ══════════════════════════════════════════════════════════

    let totalProcessed = 0;
    let totalAdvanced = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    // Etapa 0: Scrape automático se fila vazia
    if (config.autoScrape) {
      const allLeads = await listLeads();
      const pipelineStatuses: LeadStatus[] = ['new', 'segment_identified', 'sample_generated', 'proposal_sent'];
      const inPipeline = allLeads.filter((l) => pipelineStatuses.includes(l.status));
      if (inPipeline.length === 0) {
        const themeIndex = config.autoScrapeIndex % SEARCH_THEMES.length;
        const searchTerm = SEARCH_THEMES[themeIndex];
        console.log(`[leads-auto] Fila vazia. Scrapeando tema #${themeIndex}: "${searchTerm}"`);
        try {
          totalProcessed++;
          const rawLeads = await runScraper({ search: searchTerm, total: 25, headless: true });
          for (const raw of rawLeads) {
            try {
              await addLead({
                name: raw.name, address: raw.address, phone: raw.phone_number,
                website: raw.website, category: raw.category || raw.place_type,
                placeType: raw.place_type, introduction: raw.introduction,
                status: 'new',
              });
              totalAdvanced++;
            } catch { totalErrors++; }
          }
          await updateLeadsAutomationConfig({ autoScrapeIndex: themeIndex + 1, autoScrapeLastTerm: searchTerm });
          console.log(`[leads-auto] Scrape concluído: ${rawLeads.length} leads`);
        } catch (e) {
          totalErrors++;
          errors.push(`[scrape] ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Etapa 1: 'new' → segmento
    for (const lead of await listLeads('new')) {
      try {
        totalProcessed++;
        const segment = await identifySegment(lead.name, lead.category || lead.placeType || '', lead.introduction || '');
        await updateLead(lead.id, { segment, status: 'segment_identified' });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        errors.push(`[segment] ${lead.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Etapa 2: 'segment_identified' → previews
    for (const lead of await listLeads('segment_identified')) {
      try {
        totalProcessed++;
        const segment = lead.segment || lead.category || lead.placeType || 'Negócio';
        const result = await generateSampleSite(lead.id, lead.name, segment);
        const publicUrl = (process.env.WORKER_PUBLIC_URL ?? 'https://beehive-production-d895.up.railway.app').replace(/\/+$/, '');
        const sampleUrl = `${publicUrl}/files/${result.mainPng.endsWith('.png') ? `sites/leads/${encodeURIComponent(lead.id)}/preview.png` : `sites/leads/${encodeURIComponent(lead.id)}/index.html`}`;
        const socialUrls = result.socialPngs.map((_, i) =>
          `${publicUrl}/files/sites/leads/${encodeURIComponent(lead.id)}/social/post-${i + 1}.png`,
        );
        await updateLead(lead.id, {
          sampleGenerated: true, sampleUrl, projectType: result.projectType,
          socialMediaUrls: socialUrls, status: 'sample_generated',
        });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        errors.push(`[sample] ${lead.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Etapa 3: 'sample_generated' → proposta
    for (const lead of await listLeads('sample_generated')) {
      try {
        totalProcessed++;
        const segment = lead.segment || lead.category || lead.placeType || 'Negócio';
        const message = await generateProposalMessage(lead.name, segment, lead.projectType);
        await updateLead(lead.id, {
          proposalSent: true, proposalSentAt: Date.now(), proposalMessage: message, status: 'proposal_sent',
        });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        errors.push(`[proposal] ${lead.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Etapa 3.5: 'proposal_sent' → enviar WhatsApp
    if (config.autoSendWhatsApp) {
      const waStatus = await whatsappGetStatus();
      if (waStatus.connected) {
        for (const lead of await listLeads('proposal_sent')) {
          if (lead.whatsappSent || !lead.phone || !lead.proposalMessage) continue;
          try {
            totalProcessed++;
            const waResult = await whatsappSendMessage(lead.phone, lead.proposalMessage);
            if (waResult.ok) {
              await updateLead(lead.id, { whatsappSent: true, whatsappSentAt: Date.now() });
              totalAdvanced++;

              const mainPng = path.join(WORKSPACE_ROOT, 'sites', 'leads', lead.id, 'preview.png');
              if (fs.existsSync(mainPng)) {
                await whatsappSendImage(lead.phone, mainPng, `✦ Projeto Digital para ${lead.name}`);
              }
              for (let i = 0; i < 3; i++) {
                const sp = path.join(WORKSPACE_ROOT, 'sites', 'leads', lead.id, 'social', `post-${i + 1}.png`);
                if (fs.existsSync(sp)) {
                  await whatsappSendImage(lead.phone, sp, `📱 Post #${i + 1} — ${lead.name}`);
                }
              }
            } else {
              totalErrors++;
              errors.push(`[whatsapp] ${lead.name}: ${waResult.message}`);
            }
          } catch (e) {
            totalErrors++;
            errors.push(`[whatsapp] ${lead.name}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    // Etapa 4: fechar leads sem resposta
    const now = Date.now();
    const autoCloseMs = config.autoCloseDays * 24 * 60 * 60 * 1000;
    for (const lead of await listLeads('proposal_sent')) {
      if (lead.proposalSentAt && (now - lead.proposalSentAt) > autoCloseMs && !lead.responseReceived) {
        try {
          totalProcessed++;
          await updateLead(lead.id, { responseReceived: true, responseAt: now, responseType: 'no_answer', status: 'closed' });
          totalAdvanced++;
        } catch (e) { totalErrors++; }
      }
    }

    // Log
    const details = errors.length > 0
      ? `Erros: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (+${errors.length - 5})` : ''}`
      : undefined;
    await updateLeadsAutomationLog(logEntry.id, {
      status: 'done', finishedAt: Date.now(), processedCount: totalProcessed,
      advancedCount: totalAdvanced, errorCount: totalErrors, details,
    });

    if (totalProcessed > 0) {
      console.log(`[leads-auto] Tick concluído: ${totalProcessed} proc, ${totalAdvanced} avanç, ${totalErrors} err`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[leads-auto] Tick falhou:', msg);
    await updateLeadsAutomationLog(logEntry.id, { status: 'error', finishedAt: Date.now(), details: msg });
  } finally {
    ticking = false;
  }
}
