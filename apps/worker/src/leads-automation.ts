/**
 * Motor de Automação de Leads
 * ============================
 * Roda em segundo plano e processa leads automaticamente:
 *
 * Fluxo:  new → segment_identified → sample_generated → proposal_sent
 *
 * A cada tick:
 * 1. Pega leads 'new' → identifica segmento → salva
 * 2. Pega leads 'segment_identified' → gera preview PNG → salva
 * 3. Pega leads 'sample_generated' → gera proposta → salva
 * 4. Pega leads 'proposal_sent' há >7 dias sem resposta → marca 'no_answer'
 */

import path from 'node:path';
import {
  listLeads, updateLead, getLeadsAutomationConfig,
  addLeadsAutomationLog, updateLeadsAutomationLog,
  type Lead, type LeadStatus,
} from './store.js';
import {
  identifySegment, generateSampleSite, generateProposalMessage,
} from './executors/leads.js';
import { whatsappSendMessage, whatsappSendImage, whatsappGetStatus } from './executors/whatsapp.js';
import { WORKSPACE_ROOT } from './workspace.js';

let ticking = false;

/**
 * Tick principal da automação. Chamado pelo scheduler no index.ts.
 */
export async function leadsAutomationTick(): Promise<void> {
  if (ticking) return;
  ticking = true;

  const logEntry = await addLeadsAutomationLog({
    runAt: Date.now(),
    processedCount: 0,
    advancedCount: 0,
    errorCount: 0,
    status: 'running',
  });

  try {
    const config = await getLeadsAutomationConfig();
    if (!config.enabled || !config.autoProcess) {
      await updateLeadsAutomationLog(logEntry.id, { status: 'done', finishedAt: Date.now(), details: 'Automação desabilitada' });
      return;
    }

    let totalProcessed = 0;
    let totalAdvanced = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    // Etapa 1: leads 'new' → identificar segmento
    const newLeads = await listLeads('new');
    for (const lead of newLeads) {
      try {
        totalProcessed++;
        console.log(`[leads-auto] Identificando segmento: ${lead.name}`);
        const segment = await identifySegment(
          lead.name,
          lead.category || lead.placeType || '',
          lead.introduction || '',
        );
        await updateLead(lead.id, { segment, status: 'segment_identified' });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`[segment] ${lead.name}: ${msg}`);
        console.error(`[leads-auto] Erro ao identificar segmento de ${lead.name}:`, msg);
      }
    }

    // Etapa 2: leads 'segment_identified' → gerar preview PNG
    const identifiedLeads = await listLeads('segment_identified');
    for (const lead of identifiedLeads) {
      try {
        totalProcessed++;
        const segment = lead.segment || lead.category || lead.placeType || 'Negócio';
        console.log(`[leads-auto] Gerando preview PNG: ${lead.name}`);
        const pngPath = await generateSampleSite(lead.id, lead.name, segment);
        await updateLead(lead.id, {
          sampleGenerated: true,
          status: 'sample_generated',
        });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`[sample] ${lead.name}: ${msg}`);
        console.error(`[leads-auto] Erro ao gerar preview de ${lead.name}:`, msg);
      }
    }

    // Etapa 3: leads 'sample_generated' → gerar proposta
    const sampleLeads = await listLeads('sample_generated');
    for (const lead of sampleLeads) {
      try {
        totalProcessed++;
        const segment = lead.segment || lead.category || lead.placeType || 'Negócio';
        console.log(`[leads-auto] Gerando proposta: ${lead.name}`);
        const message = await generateProposalMessage(lead.name, segment);
        await updateLead(lead.id, {
          proposalSent: true,
          proposalSentAt: Date.now(),
          proposalMessage: message,
          status: 'proposal_sent',
        });
        totalAdvanced++;
      } catch (e) {
        totalErrors++;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`[proposal] ${lead.name}: ${msg}`);
        console.error(`[leads-auto] Erro ao gerar proposta para ${lead.name}:`, msg);
      }
    }

    // Etapa 3.5: leads 'proposal_sent' com WhatsApp configurado → enviar mensagem
    if (config.autoSendWhatsApp) {
      const waStatus = await whatsappGetStatus();
      if (waStatus.connected) {
        const unsentProposals = await listLeads('proposal_sent');
        for (const lead of unsentProposals) {
          if (lead.whatsappSent || !lead.phone || !lead.proposalMessage) continue;
          try {
            totalProcessed++;
            console.log(`[leads-auto] Enviando WhatsApp para ${lead.name} (${lead.phone})`);

            // Envia a mensagem de proposta
            const result = await whatsappSendMessage(lead.phone, lead.proposalMessage);
            if (result.ok) {
              await updateLead(lead.id, {
                whatsappSent: true,
                whatsappSentAt: Date.now(),
              });
              totalAdvanced++;
              console.log(`[leads-auto] WhatsApp enviado para ${lead.name}`);

              // Se tiver preview PNG, envia também
              if (lead.sampleUrl) {
                const pngPath = path.join(WORKSPACE_ROOT, lead.sampleUrl.replace('/files/', ''));
                if (pngPath.endsWith('.png')) {
                  try {
                    await whatsappSendImage(lead.phone, pngPath, `Preview do site para ${lead.name}`);
                  } catch (imgErr) {
                    console.error(`[leads-auto] Erro ao enviar imagem para ${lead.name}:`, imgErr);
                  }
                }
              }
            } else {
              errors.push(`[whatsapp] ${lead.name}: ${result.message}`);
              console.error(`[leads-auto] Falha WhatsApp para ${lead.name}: ${result.message}`);
            }
          } catch (e) {
            totalErrors++;
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`[whatsapp] ${lead.name}: ${msg}`);
            console.error(`[leads-auto] Erro WhatsApp para ${lead.name}:`, msg);
          }
        }
      } else {
        console.log('[leads-auto] WhatsApp não conectado. Pulando envio automático.');
      }
    } else {
      console.log('[leads-auto] Envio automático WhatsApp desligado nas configurações.');
    }

    // Etapa 4: leads 'proposal_sent' sem resposta há > autoCloseDays → fechar
    const proposalLeads = await listLeads('proposal_sent');
    const now = Date.now();
    const autoCloseMs = config.autoCloseDays * 24 * 60 * 60 * 1000;
    for (const lead of proposalLeads) {
      if (lead.proposalSentAt && (now - lead.proposalSentAt) > autoCloseMs && !lead.responseReceived) {
        try {
          totalProcessed++;
          await updateLead(lead.id, {
            responseReceived: true,
            responseAt: now,
            responseType: 'no_answer',
            status: 'closed',
          });
          totalAdvanced++;
          console.log(`[leads-auto] Fechando lead sem resposta: ${lead.name}`);
        } catch (e) {
          totalErrors++;
          console.error(`[leads-auto] Erro ao fechar lead ${lead.name}:`, e);
        }
      }
    }

    // Atualiza o log
    const details = errors.length > 0
      ? `Erros: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (+${errors.length - 5})` : ''}`
      : undefined;
    await updateLeadsAutomationLog(logEntry.id, {
      status: 'done',
      finishedAt: Date.now(),
      processedCount: totalProcessed,
      advancedCount: totalAdvanced,
      errorCount: totalErrors,
      details,
    });

    if (totalProcessed > 0) {
      console.log(`[leads-auto] Tick concluído: ${totalProcessed} processados, ${totalAdvanced} avançaram, ${totalErrors} erros`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[leads-auto] Tick falhou:', msg);
    await updateLeadsAutomationLog(logEntry.id, {
      status: 'error',
      finishedAt: Date.now(),
      details: msg,
    });
  } finally {
    ticking = false;
  }
}
