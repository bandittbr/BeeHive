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
import fs from 'node:fs';
import {

  listLeads, updateLead, addLead, getLeadsAutomationConfig,
  updateLeadsAutomationConfig, addLeadsAutomationLog, updateLeadsAutomationLog,
  type Lead, type LeadStatus,
} from './store.js';
import {
  identifySegment, generateSampleSite, generateProposalMessage,
} from './executors/leads.js';
import { whatsappSendMessage, whatsappSendImage, whatsappGetStatus } from './executors/whatsapp.js';
import { WORKSPACE_ROOT } from './workspace.js';

let ticking = false;

/**
 * Temas de busca rotativos para o scrape automático.
 * A cada ciclo, a automação escolhe o próximo da lista.
 */
const SEARCH_THEMES = [
  'restaurante em São Paulo SP',
  'salão de beleza em São Paulo SP',
  'oficina mecânica em São Paulo SP',
  'clínica odontológica em São Paulo SP',
  'mercado em São Paulo SP',
  'academia em São Paulo SP',
  'pet shop em São Paulo SP',
  'advocacia em São Paulo SP',
  'padaria em São Paulo SP',
  'consultório médico em São Paulo SP',
  'barbearia em São Paulo SP',
  'pizzaria em São Paulo SP',
  'hotel em São Paulo SP',
  'imobiliária em São Paulo SP',
  'auto elétrica em São Paulo SP',
  'clínica de estética em São Paulo SP',
  'lanchonete em São Paulo SP',
  'farmácia em São Paulo SP',
  'escola em São Paulo SP',
  'construtora em São Paulo SP',
  'restaurante no Rio de Janeiro RJ',
  'salão de beleza no Rio de Janeiro RJ',
  'oficina mecânica no Rio de Janeiro RJ',
  'clínica odontológica no Rio de Janeiro RJ',
  'mercado no Rio de Janeiro RJ',
  'academia no Rio de Janeiro RJ',
  'pet shop no Rio de Janeiro RJ',
  'advocacia no Rio de Janeiro RJ',
  'padaria no Rio de Janeiro RJ',
  'consultório médico no Rio de Janeiro RJ',
  'barbearia no Rio de Janeiro RJ',
  'pizzaria no Rio de Janeiro RJ',
  'hotel no Rio de Janeiro RJ',
  'imobiliária no Rio de Janeiro RJ',
  'auto elétrica no Rio de Janeiro RJ',
  'clínica de estética no Rio de Janeiro RJ',
  'lanchonete no Rio de Janeiro RJ',
  'farmácia no Rio de Janeiro RJ',
  'escola no Rio de Janeiro RJ',
  'construtora no Rio de Janeiro RJ',
];

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

    // Etapa 0: Scrape automático se a fila estiver vazia
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
                name: raw.name,
                address: raw.address,
                phone: raw.phone_number,
                website: raw.website,
                category: raw.category || raw.place_type,
                placeType: raw.place_type,
                introduction: raw.introduction,
                source: 'auto_scrape',
                status: 'new',
              });
              totalAdvanced++;
            } catch (leadErr) {
              totalErrors++;
              console.error(`[leads-auto] Erro ao salvar lead "${raw.name}":`, leadErr);
            }
          }
          // Avança o índice para o próximo tema
          await updateLeadsAutomationConfig({ autoScrapeIndex: themeIndex + 1, autoScrapeLastTerm: searchTerm });
          console.log(`[leads-auto] Scrape concluído: ${rawLeads.length} leads encontrados. Próximo tema: #${themeIndex + 1}`);
        } catch (e) {
          totalErrors++;
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`[scrape] ${msg}`);
          console.error(`[leads-auto] Erro no scrape automático:`, msg);
        }
      }
    }

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

    // Etapa 2: leads 'segment_identified' → gerar previews FODAS (site + redes sociais)
    const identifiedLeads = await listLeads('segment_identified');
    for (const lead of identifiedLeads) {
      try {
        totalProcessed++;
        const segment = lead.segment || lead.category || lead.placeType || 'Negócio';
        console.log(`[leads-auto] Gerando previews FODAS: ${lead.name}`);
        const result = await generateSampleSite(lead.id, lead.name, segment);

        // Armazena o tipo de projeto no lead
        const publicUrl = (process.env.WORKER_PUBLIC_URL ?? 'https://beehive-production-d895.up.railway.app').replace(/\/+$/, '');

        // URL do preview principal
        const mainRelPath = result.mainPng.endsWith('.png')
          ? `sites/leads/${encodeURIComponent(lead.id)}/preview.png`
          : `sites/leads/${encodeURIComponent(lead.id)}/index.html`;
        const sampleUrl = `${publicUrl}/files/${mainRelPath}`;

        // URLs dos posts de redes sociais
        const socialUrls: string[] = [];
        for (let i = 0; i < result.socialPngs.length; i++) {
          const rel = `sites/leads/${encodeURIComponent(lead.id)}/social/post-${i + 1}.png`;
          socialUrls.push(`${publicUrl}/files/${rel}`);
        }

        await updateLead(lead.id, {
          sampleGenerated: true,
          sampleUrl,
          projectType: result.projectType,
          socialMediaUrls: socialUrls,
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
        const message = await generateProposalMessage(lead.name, segment, lead.projectType);
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

              // Envia preview PRINCIPAL do projeto
              const previewPngPath = path.join(WORKSPACE_ROOT, 'sites', 'leads', lead.id, 'preview.png');
              try {
                if (fs.existsSync(previewPngPath)) {
                  await whatsappSendImage(lead.phone, previewPngPath, `✦ Projeto Digital para ${lead.name}`);
                  console.log(`[leads-auto] Preview do projeto enviado para ${lead.name}`);
                }
              } catch (imgErr) {
                console.error(`[leads-auto] Erro ao enviar preview para ${lead.name}:`, imgErr);
              }

              // Envia posts de REDES SOCIAIS (até 3)
              for (let i = 0; i < 3; i++) {
                const socialPngPath = path.join(WORKSPACE_ROOT, 'sites', 'leads', lead.id, 'social', `post-${i + 1}.png`);
                try {
                  if (fs.existsSync(socialPngPath)) {
                    const label = ['📱 Post para Instagram', '🎯 Post para Facebook', '💡 Post de Engajamento'][i] || `Post #${i + 1}`;
                    await whatsappSendImage(lead.phone, socialPngPath, `${label} — ${lead.name}`);
                    console.log(`[leads-auto] Post #${i + 1} enviado para ${lead.name}`);
                  }
                } catch (imgErr) {
                  console.error(`[leads-auto] Erro ao enviar post #${i + 1} para ${lead.name}:`, imgErr);
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
