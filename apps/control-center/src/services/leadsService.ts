/**
 * Serviço de Leads — comunicação com a API do worker.
 */
import type { Lead, LeadStatus, LeadsDashboard } from '../types';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '') || 'http://localhost:4000';
const WORKER_TOKEN = import.meta.env.VITE_WORKER_TOKEN ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (WORKER_TOKEN) h['Authorization'] = `Bearer ${WORKER_TOKEN}`;
  return h;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${WORKER_URL}${path}`;
  const res = await fetch(url, { ...options, headers: { ...headers(), ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export interface LeadsListResponse {
  leads: Lead[];
}

export interface LeadResponse {
  lead: Lead;
}

export async function listLeads(status?: LeadStatus, category?: string, search?: string): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await api<LeadsListResponse>(`/api/leads${qs ? `?${qs}` : ''}`);
  return res.leads;
}

export async function getLead(id: string): Promise<Lead> {
  const res = await api<LeadResponse>(`/api/leads/${encodeURIComponent(id)}`);
  return res.lead;
}

export async function updateLead(id: string, fields: Partial<Lead>): Promise<Lead> {
  const res = await api<LeadResponse>(`/api/leads/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return res.lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const res = await api<{ ok: boolean }>(`/api/leads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function scrapeLeads(search: string, total: number = 20, categories?: string): Promise<{ ok: boolean; message: string }> {
  return api('/api/leads/scrape', {
    method: 'POST',
    body: JSON.stringify({ search, total, categories }),
  });
}

export async function getLeadsDashboard(): Promise<LeadsDashboard> {
  return api<LeadsDashboard>('/api/leads/dashboard');
}

export async function identifySegment(id: string): Promise<{ segment: string }> {
  return api<{ segment: string }>(`/api/leads/${encodeURIComponent(id)}/identify-segment`, {
    method: 'POST',
  });
}

export async function generateSampleSite(id: string): Promise<{ sampleUrl: string; format?: string }> {
  return api<{ sampleUrl: string; format?: string }>(`/api/leads/${encodeURIComponent(id)}/generate-sample`, {
    method: 'POST',
  });
}

// ---- Automação ----

export interface LeadsAutomationConfig {
  enabled: boolean;
  intervalMs: number;
  autoProcess: boolean;
  autoCloseDays: number;
  autoSendWhatsApp: boolean;
  updatedAt: number;
}

export interface LeadsAutomationLog {
  id: string;
  runAt: number;
  processedCount: number;
  advancedCount: number;
  errorCount: number;
  details?: string;
  status: 'running' | 'done' | 'error';
  finishedAt?: number;
}

export async function getLeadsAutomationConfig(): Promise<LeadsAutomationConfig> {
  return api<LeadsAutomationConfig>('/api/leads/automation/config');
}

export async function updateLeadsAutomationConfig(fields: Partial<LeadsAutomationConfig>): Promise<LeadsAutomationConfig> {
  return api<LeadsAutomationConfig>('/api/leads/automation/config', {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export async function triggerLeadsAutomationTick(): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>('/api/leads/automation/tick', {
    method: 'POST',
  });
}

export async function listLeadsAutomationLogs(limit = 20): Promise<LeadsAutomationLog[]> {
  return api<LeadsAutomationLog[]>(`/api/leads/automation/logs?limit=${limit}`);
}

// ---- WhatsApp Web ----

export interface WhatsAppStatus {
  connected: boolean;
  connectedAt?: number;
  phone?: string;
  lastCheckAt?: number;
  error?: string;
  waitingQr?: boolean;
  qrWaitStartedAt?: number;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return api<WhatsAppStatus>('/api/whatsapp/status');
}

export async function connectWhatsApp(headless: boolean = true): Promise<{
  ok: boolean; message: string; waitingQr?: boolean; qrPath?: string;
}> {
  return api<{ ok: boolean; message: string; waitingQr?: boolean; qrPath?: string }>(
    '/api/whatsapp/connect',
    { method: 'POST', body: JSON.stringify({ headless }) },
  );
}

/** URL completa para a imagem do QR Code (modo headless, com cache-busting) */
export function getQrImageUrl(): string {
  return `${WORKER_URL}/api/whatsapp/qr-image?t=${Date.now()}`;
}

export async function disconnectWhatsApp(): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>('/api/whatsapp/disconnect', { method: 'POST' });
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>('/api/whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
}

export async function sendWhatsAppImage(phone: string, imagePath: string, caption?: string): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>('/api/whatsapp/send-image', {
    method: 'POST',
    body: JSON.stringify({ phone, imagePath, caption }),
  });
}

/** Gera link WhatsApp com a proposta do lead */
export function waLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const wa = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export async function sendProposal(id: string): Promise<{ message: string }> {
  return api<{ message: string }>(`/api/leads/${encodeURIComponent(id)}/send-proposal`, {
    method: 'POST',
  });
}

export async function respondLead(id: string, responseType: 'interested' | 'not_interested' | 'no_answer'): Promise<Lead> {
  const res = await api<LeadResponse>(`/api/leads/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ responseType }),
  });
  return res.lead;
}

/**
 * Retorna o rótulo em português para cada status do lead.
 */
export function leadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    new: 'Novo',
    analyzing: 'Analisando',
    segment_identified: 'Segmento Identificado',
    sample_generated: 'Amostra Gerada',
    proposal_sent: 'Proposta Enviada',
    responded: 'Respondeu',
    converted: 'Convertido',
    closed: 'Fechado',
  };
  return labels[status] || status;
}

/**
 * Retorna a cor associada a cada status.
 */
export function leadStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    new: '#6b7280',
    analyzing: '#f59e0b',
    segment_identified: '#3b82f6',
    sample_generated: '#8b5cf6',
    proposal_sent: '#ec4899',
    responded: '#14b8a6',
    converted: '#22c55e',
    closed: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

export function leadResponseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    interested: 'Interessado',
    not_interested: 'Não Interessado',
    no_answer: 'Sem Resposta',
  };
  return labels[type] || type;
}
