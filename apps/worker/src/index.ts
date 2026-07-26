// BeeHive Cowork Nuvem — servidor do worker.
// Jobs (shell/files/git/browser/cortes/publish) + AGENDADOR + OAuth multi-conta.
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { ensureWorkspace, WORKSPACE_ROOT, resolveInWorkspace } from './workspace.js';
import { runShell } from './executors/shell.js';
import { writeFile, readFile } from './executors/files.js';
import { runGit } from './executors/git.js';
import { runBrowser } from './executors/browser.js';
import { runYtFetch, runClip } from './executors/media.js';
import { runPublishYoutube } from './executors/publish.js';
import { runPublishInstagram, runPublishFacebook } from './executors/publishMeta.js';
import { runPublishTiktok, refreshTiktok, publishTiktokWithToken } from './executors/publishTiktok.js';
import { buildAuthUrl, exchangeCode } from './oauth.js';
import {
  getYoutubeCreds, setYoutubeCreds, hasYoutubeCreds,
  getPlatformCreds, setPlatformCreds, hasPlatformCreds,
  getOauthApp, setOauthApp, hasOauthApp,
  listAccounts, getAccount, upsertAccount, updateAccountTokens, removeAccount,
  listPosts, getDuePosts, addPost, updatePost, removePost, storageMode,
  getUserByEmail, getUserById, createUser, setCurrentSelection,
  listProviders, getProvider, addProvider, updateProviderTestResult, removeProvider,
  listConversations, getConversation, createConversation, updateConversation, deleteConversation,
  listMessages, addMessage,
  listPilots, createPilot, updatePilot, deletePilot,
  listClipChannels, addClipChannel, removeClipChannel, listClipHistory,
  type ScheduledPost, type PlatformId,
} from './store.js';
import { autoclipTick, runPilotNow } from './autoclip.js';
import { leadsAutomationTick } from './leads-automation.js';
import {
  runScraper, identifySegment, generateProposalMessage, generateSampleSite,
} from './executors/leads.js';
import {
  whatsappConnect, whatsappSendMessage, whatsappSendImage,
  whatsappGetStatus, whatsappDisconnect, whatsappGetQrImagePath,
  getDebugLogs,
} from './executors/whatsapp.js';
import {
  listLeads, getLead, addLead, addLeadsBatch, updateLead, deleteLead, getLeadsDashboard,
  getLeadsAutomationConfig, updateLeadsAutomationConfig,
  listLeadsAutomationLogs, addLeadsAutomationLog,
  type LeadStatus, type Lead, type LeadsAutomationConfig, type LeadsAutomationLog,
} from './store.js';
import type { JobEvent, JobRecord, JobRequest } from './types.js';
import { bootKernel, executeCapability, listCapabilities } from './kernel-bridge.js';
import { hashPassword, verifyPassword, signToken, verifyToken, isValidEmail } from './auth.js';
import { encryptSecret, decryptSecret, maskSecret } from './key-crypto.js';
import { callProviderCompletion, testProviderConnection } from './provider-call.js';

const PORT = Number(process.env.PORT ?? 4000);
const AUTH_TOKEN = process.env.WORKER_TOKEN ?? '';
const PUBLIC_URL = (process.env.WORKER_PUBLIC_URL ?? '').replace(/\/+$/, '');
const PLATFORMS: PlatformId[] = ['youtube', 'instagram', 'facebook', 'tiktok'];

ensureWorkspace();

// Boot kernel com plugins (assíncrono, não bloqueia o listen)
bootKernel().catch((err) => console.error('[kernel] boot failed:', err));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = new Map<string, JobRecord>();
const listeners = new Map<string, Set<(e: JobEvent) => void>>();
const pendingStates = new Set<string>();

function emit(jobId: string, e: Omit<JobEvent, 'jobId' | 'ts'>) {
  const evt: JobEvent = { jobId, ts: Date.now(), ...e };
  const rec = jobs.get(jobId);
  if (rec && (e.kind === 'stdout' || e.kind === 'stderr')) rec.output += e.data ?? '';
  listeners.get(jobId)?.forEach((fn) => fn(evt));
}

function authOk(req: express.Request): boolean {
  if (!AUTH_TOKEN) return true;
  return (req.header('authorization') ?? '') === `Bearer ${AUTH_TOKEN}`;
}

// --- Sessão de usuário (login por email/senha, distinto do WORKER_TOKEN acima) ---
async function currentUser(req: express.Request) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  return getUserById(payload.userId);
}

function requireUser(
  handler: (req: express.Request, res: express.Response, user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) => Promise<void>,
) {
  return async (req: express.Request, res: express.Response) => {
    const user = await currentUser(req);
    if (!user) { res.status(401).json({ error: 'não autenticado' }); return; }
    try {
      await handler(req, res, user);
    } catch (e) {
      console.error('[auth] erro na rota:', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'erro interno' });
    }
  };
}

function page(title: string, msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
    `<body style="font-family:system-ui,sans-serif;padding:48px;text-align:center;background:#0b0b0f;color:#eee">` +
    `<h2>${title}</h2><p style="color:#aaa">${msg}</p>` +
    `<script>try{window.opener&&window.opener.postMessage({beehiveOauth:true},'*')}catch(e){}setTimeout(function(){window.close()},1500)</script></body>`;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beehive-worker', workspace: WORKSPACE_ROOT, jobs: jobs.size, storage: storageMode() });
});

app.get('/files/:name(*)', (req, res) => {
  const q = typeof req.query.t === 'string' ? req.query.t : '';
  const ok = !AUTH_TOKEN || req.header('authorization') === `Bearer ${AUTH_TOKEN}` || q === AUTH_TOKEN;
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const abs = resolveInWorkspace((req.params as Record<string, string>).name);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'not found' });
    res.sendFile(abs);
  } catch { res.status(400).json({ error: 'bad path' }); }
});

// --- Sites/páginas geradas (cada landing page vira uma pasta única em
// sites/<timestamp>/index.html — ver runOnWorker no control-center). Como
// isso vive no disco do worker (Railway) e não tem limpeza automática, essa
// listagem existe pra dar visibilidade e permitir apagar o que acumular. ---
interface GeneratedSite {
  id: string;
  path: string;
  title: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

function siteUrl(req: express.Request, relPath: string): string {
  const base = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const token = AUTH_TOKEN ? `?t=${encodeURIComponent(AUTH_TOKEN)}` : '';
  return `${base}/files/${encodeURIComponent(relPath)}${token}`;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title>([^<]{1,120})<\/title>/i);
  return m ? m[1].trim() : null;
}

function listGeneratedSites(req: express.Request): GeneratedSite[] {
  const sitesDir = resolveInWorkspace('sites');
  if (!fs.existsSync(sitesDir)) return [];
  const entries = fs.readdirSync(sitesDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  const sites: GeneratedSite[] = [];
  for (const entry of entries) {
    const indexPath = path.join(sitesDir, entry.name, 'index.html');
    if (!fs.existsSync(indexPath)) continue;
    const stat = fs.statSync(indexPath);
    let title = entry.name;
    try {
      title = extractTitle(fs.readFileSync(indexPath, 'utf8').slice(0, 5000)) || title;
    } catch { /* ignore */ }
    const relPath = `sites/${entry.name}/index.html`;
    sites.push({ id: entry.name, path: relPath, title, sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), url: siteUrl(req, relPath) });
  }
  return sites.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function deleteGeneratedSite(id: string): boolean {
  if (!/^[0-9]+$/.test(id)) return false; // só timestamps — evita path traversal
  const dir = resolveInWorkspace(`sites/${id}`);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

app.get('/api/generated-sites', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  try {
    res.json({ sites: listGeneratedSites(req) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro interno' });
  }
});
app.delete('/api/generated-sites/:id', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: deleteGeneratedSite((req.params as Record<string, string>).id) });
});

// --- credenciais YouTube ---
app.post('/creds/youtube', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { clientId?: string; clientSecret?: string; refreshToken?: string; privacyStatus?: string };
  if (!b?.clientId || !b?.clientSecret || !b?.refreshToken) return res.status(400).json({ error: 'clientId, clientSecret e refreshToken são obrigatórios' });
  const privacyStatus = ['public', 'unlisted', 'private'].includes(String(b.privacyStatus)) ? (b.privacyStatus as 'public' | 'unlisted' | 'private') : 'public';
  await setYoutubeCreds({ clientId: b.clientId, clientSecret: b.clientSecret, refreshToken: b.refreshToken, privacyStatus });
  res.json({ ok: true });
});
app.get('/creds/youtube', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasYoutubeCreds() });
});

// --- config do app OAuth por rede (client_id/secret) ---
app.post('/oauth/apps/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = (req.params as Record<string, string>).platform;
  const b = req.body as { clientId?: string; clientSecret?: string; scopes?: string };
  if (!b?.clientId || !b?.clientSecret) return res.status(400).json({ error: 'clientId e clientSecret são obrigatórios' });
  await setOauthApp(platform, { clientId: b.clientId, clientSecret: b.clientSecret, scopes: b.scopes });
  res.json({ ok: true });
});
app.get('/oauth/apps/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasOauthApp((req.params as Record<string, string>).platform) });
});

// --- início do fluxo OAuth (redireciona para a rede) ---
app.get('/oauth/:platform/start', async (req, res) => {
  const q = typeof req.query.t === 'string' ? req.query.t : '';
  if (AUTH_TOKEN && q !== AUTH_TOKEN) return res.status(401).send('unauthorized');
  const platform = (req.params as Record<string, string>).platform;
  if (!PUBLIC_URL) return res.status(500).send('WORKER_PUBLIC_URL não configurado');
  const oapp = await getOauthApp(platform);
  if (!oapp) return res.status(400).send('App OAuth não configurado para ' + platform);
  const redirectUri = `${PUBLIC_URL}/oauth/${platform}/callback`;
  const state = nanoid();
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 600000);
  try {
    res.redirect(buildAuthUrl(platform, oapp, redirectUri, state));
  } catch (e) {
    res.status(400).send(String(e instanceof Error ? e.message : e));
  }
});

// --- callback OAuth (a rede chama aqui; sem auth) ---
app.get('/oauth/:platform/callback', async (req, res) => {
  const platform = (req.params as Record<string, string>).platform;
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const err = typeof req.query.error === 'string' ? req.query.error : '';
  if (err) return res.status(400).send(page('Autorização negada', err));
  if (!code) return res.status(400).send(page('Erro', 'Código de autorização ausente.'));
  if (!PUBLIC_URL) return res.status(500).send('WORKER_PUBLIC_URL não configurado');
  const oapp = await getOauthApp(platform);
  if (!oapp) return res.status(400).send(page('Erro', 'App OAuth não configurado.'));
  const redirectUri = `${PUBLIC_URL}/oauth/${platform}/callback`;
  try {
    const r = await exchangeCode(platform, oapp, redirectUri, code);
    const id = `${platform}:${r.accountId}`;
    await upsertAccount({
      id, platform, accountId: r.accountId, displayName: r.displayName,
      accessToken: r.accessToken, refreshToken: r.refreshToken,
      expiresAt: r.expiresIn ? Date.now() + r.expiresIn * 1000 : undefined,
    });
    pendingStates.delete(state);
    res.send(page('Conta conectada', `${r.displayName || r.accountId} conectada com sucesso.`));
  } catch (e) {
    res.status(400).send(page('Falha ao conectar', String(e instanceof Error ? e.message : e)));
  }
});

// --- contas conectadas ---
app.get('/accounts', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
  const accs = await listAccounts(platform);
  res.json({ accounts: accs.map((a) => ({ id: a.id, platform: a.platform, accountId: a.accountId, displayName: a.displayName })) });
});
app.delete('/accounts/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const ok = await removeAccount((req.params as Record<string, string>).id);
  res.json({ ok });
});

// Cadastro manual de conta (youtube/instagram/facebook — credenciais coladas
// direto, sem popup OAuth; tiktok continua pelo fluxo /oauth/tiktok/start).
// Permite múltiplas contas por rede: cada uma vira uma linha em beehive_accounts.
app.post('/accounts', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = String(req.body?.platform ?? '').trim();
  const displayName = String(req.body?.displayName ?? '').trim();
  if (!platform || !displayName) return res.status(400).json({ error: 'platform e displayName são obrigatórios' });
  const accountId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let account: { id: string; platform: string; accountId: string; displayName: string; accessToken?: string; refreshToken?: string; extra?: Record<string, unknown> };
  if (platform === 'youtube') {
    const { clientId, clientSecret, refreshToken, privacyStatus } = req.body ?? {};
    if (!clientId || !clientSecret || !refreshToken) return res.status(400).json({ error: 'clientId, clientSecret e refreshToken são obrigatórios' });
    account = { id: `youtube:${accountId}`, platform: 'youtube', accountId, displayName, refreshToken: String(refreshToken), extra: { clientId: String(clientId), clientSecret: String(clientSecret), privacyStatus: privacyStatus ? String(privacyStatus) : 'public' } };
  } else if (platform === 'instagram') {
    const { igUserId, accessToken } = req.body ?? {};
    if (!igUserId || !accessToken) return res.status(400).json({ error: 'igUserId e accessToken são obrigatórios' });
    account = { id: `instagram:${accountId}`, platform: 'instagram', accountId, displayName, accessToken: String(accessToken), extra: { igUserId: String(igUserId) } };
  } else if (platform === 'facebook') {
    const { pageId, accessToken } = req.body ?? {};
    if (!pageId || !accessToken) return res.status(400).json({ error: 'pageId e accessToken são obrigatórios' });
    account = { id: `facebook:${accountId}`, platform: 'facebook', accountId, displayName, accessToken: String(accessToken), extra: { pageId: String(pageId) } };
  } else {
    return res.status(400).json({ error: `cadastro manual não suportado para ${platform}` });
  }

  await upsertAccount(account);
  res.json({ account: { id: account.id, platform: account.platform, accountId: account.accountId, displayName: account.displayName } });
});

// --- credenciais genéricas por rede (compat: instagram/facebook/tiktok) ---
app.post('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = (req.params as Record<string, string>).platform;
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'corpo deve ser um objeto' });
  await setPlatformCreds(platform, data as Record<string, unknown>);
  res.json({ ok: true });
});
app.get('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasPlatformCreds((req.params as Record<string, string>).platform) });
});

// --- agendamento ---
app.post('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { file?: string; title?: string; description?: string; tags?: unknown; at?: number; platform?: string; accountId?: string };
  if (!b?.file || !b?.at) return res.status(400).json({ error: 'file e at são obrigatórios' });
  const platform = (PLATFORMS as string[]).includes(String(b.platform)) ? (b.platform as PlatformId) : 'youtube';
  const post = await addPost({
    platform,
    file: String(b.file),
    title: String(b.title ?? 'Novo vídeo').slice(0, 100),
    description: String(b.description ?? ''),
    tags: Array.isArray(b.tags) ? (b.tags as unknown[]).map((t) => String(t)).slice(0, 25) : [],
    at: Number(b.at),
    accountId: b.accountId ? String(b.accountId) : undefined,
  });
  res.json({ ok: true, post });
});
app.get('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ posts: await listPosts() });
});
app.delete('/schedule/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: await removePost((req.params as Record<string, string>).id) });
});

// --- Piloto automático de cortes (múltiplos pilotos independentes: nicho +
// canais fonte + contas-alvo escolhidas dentre as cadastradas em /accounts) ---
app.get('/api/autoclip/pilots', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ pilots: await listPilots() });
});
app.post('/api/autoclip/pilots', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  try {
    const pilot = await createPilot({
      name,
      niche: req.body?.niche ? String(req.body.niche) : undefined,
      description: req.body?.description ? String(req.body.description) : undefined,
      postsPerDay: Math.max(1, Math.min(20, Number(req.body?.postsPerDay) || 1)),
      times: req.body?.times ? String(req.body.times) : undefined,
      accountIds: Array.isArray(req.body?.accountIds) ? req.body.accountIds.map(String) : [],
      discoveryMode: !!req.body?.discoveryMode,
      minDurationMin: req.body?.minDurationMin !== undefined ? Math.max(1, Number(req.body.minDurationMin) || 60) : undefined,
    });
    res.json({ pilot });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
app.put('/api/autoclip/pilots/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const b = req.body ?? {};
  const fields: Record<string, unknown> = {};
  if (b.name !== undefined) fields.name = String(b.name);
  if (b.niche !== undefined) fields.niche = String(b.niche);
  if (b.description !== undefined) fields.description = String(b.description);
  if (b.active !== undefined) fields.active = !!b.active;
  if (b.postsPerDay !== undefined) fields.postsPerDay = Math.max(1, Math.min(20, Number(b.postsPerDay) || 1));
  if (b.times !== undefined) fields.times = String(b.times);
  if (b.accountIds !== undefined) fields.accountIds = Array.isArray(b.accountIds) ? b.accountIds.map(String) : [];
  if (b.discoveryMode !== undefined) fields.discoveryMode = !!b.discoveryMode;
  if (b.minDurationMin !== undefined) fields.minDurationMin = Math.max(1, Number(b.minDurationMin) || 60);
  const pilot = await updatePilot(id, fields);
  if (!pilot) return res.status(404).json({ error: 'piloto não encontrado' });
  res.json({ pilot });
});
app.delete('/api/autoclip/pilots/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: await deletePilot((req.params as Record<string, string>).id) });
});

app.get('/api/autoclip/pilots/:id/channels', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ channels: await listClipChannels((req.params as Record<string, string>).id) });
});
app.post('/api/autoclip/pilots/:id/channels', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const pilotId = (req.params as Record<string, string>).id;
  const channelUrl = String(req.body?.channelUrl ?? '').trim();
  if (!/^https?:\/\//i.test(channelUrl)) return res.status(400).json({ error: 'channelUrl inválido' });
  const label = req.body?.label ? String(req.body.label) : undefined;
  res.json({ channel: await addClipChannel({ pilotId, channelUrl, label }) });
});
app.delete('/api/autoclip/channels/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: await removeClipChannel((req.params as Record<string, string>).id) });
});

app.get('/api/autoclip/pilots/:id/history', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ history: await listClipHistory((req.params as Record<string, string>).id, 30) });
});
app.post('/api/autoclip/pilots/:id/run-now', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: true, started: true });
  runPilotNow((req.params as Record<string, string>).id).catch((e) => console.error('[autoclip] run-now falhou:', e));
});

// --- Leads (Google Maps Scraper + Prospecção) ---
app.post('/api/leads/scrape', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const search = String(req.body?.search ?? '').trim();
  const total = Math.max(1, Math.min(200, Number(req.body?.total) || 20));
  const categories = req.body?.categories ? String(req.body.categories) : undefined;

  if (!search) return res.status(400).json({ error: 'search é obrigatório' });

  // Responde imediatamente e roda em segundo plano
  res.json({ ok: true, message: 'Scraping iniciado em segundo plano' });

  // Executa o scraper em background
  (async () => {
    try {
      const rawLeads = await runScraper({ search, total, categories, headless: true });
      const batch = rawLeads.map((r) => ({
        name: r.name,
        address: r.address,
        website: r.website,
        phone: r.phone_number,
        category: r.place_type,
        placeType: r.place_type,
        reviewsCount: r.reviews_count,
        reviewsAverage: r.reviews_average,
        introduction: r.introduction,
        opensAt: r.opens_at,
        scrapeQuery: search,
        scrapedAt: Date.now(),
      }));
      const count = await addLeadsBatch(batch);
      console.log(`[leads] Scraping concluído: ${count} leads adicionados (query: "${search}")`);
    } catch (e) {
      console.error('[leads] Erro no scraping:', e);
    }
  })();
});

app.get('/api/leads', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const status = typeof req.query.status === 'string' ? req.query.status as LeadStatus : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const leads = await listLeads(status, category, search);
  res.json({ leads });
});

app.get('/api/leads/dashboard', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const dashboard = await getLeadsDashboard();
  res.json(dashboard);
});

app.get('/api/leads/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const lead = await getLead((req.params as Record<string, string>).id);
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });
  res.json({ lead });
});

app.put('/api/leads/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const b = req.body ?? {};
  const fields: Record<string, unknown> = {};
  if (b.status !== undefined) fields.status = String(b.status);
  if (b.notes !== undefined) fields.notes = String(b.notes);
  if (b.segment !== undefined) fields.segment = String(b.segment);
  if (b.email !== undefined) fields.email = String(b.email);
  if (b.sampleGenerated !== undefined) fields.sampleGenerated = !!b.sampleGenerated;
  if (b.sampleUrl !== undefined) fields.sampleUrl = String(b.sampleUrl);
  if (b.proposalSent !== undefined) fields.proposalSent = !!b.proposalSent;
  if (b.proposalMessage !== undefined) fields.proposalMessage = String(b.proposalMessage);
  if (b.responseReceived !== undefined) fields.responseReceived = !!b.responseReceived;
  if (b.responseType !== undefined) fields.responseType = String(b.responseType);
  const lead = await updateLead(id, fields as any);
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });
  res.json({ lead });
});

app.delete('/api/leads/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: await deleteLead((req.params as Record<string, string>).id) });
});

// Identificar segmento do lead via IA
app.post('/api/leads/:id/identify-segment', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const lead = await getLead(id);
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });

  try {
    const segment = await identifySegment(lead.name, lead.category || lead.placeType || '', lead.introduction || '');
    await updateLead(id, { segment, status: 'segment_identified' });
    res.json({ segment });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro ao identificar segmento' });
  }
});

// Gerar preview em PNG do site de amostra para o lead
app.post('/api/leads/:id/generate-sample', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const lead = await getLead(id);
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });
  const segment = lead.segment || lead.category || lead.placeType || 'Negócio';

  try {
    // Gera HTML + converte para PNG
    const pngPath = await generateSampleSite(id, lead.name, segment);

    const token = AUTH_TOKEN ? `?t=${encodeURIComponent(AUTH_TOKEN)}` : '';
    const base = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;

    // Se for PNG, retorna a URL do PNG; se falhou, retorna a URL do HTML como fallback
    const isPng = pngPath.endsWith('.png');
    const relPath = isPng
      ? `sites/leads/${encodeURIComponent(id)}/preview.png`
      : `sites/leads/${encodeURIComponent(id)}/index.html`;
    const sampleUrl = `${base}/files/${relPath}${token}`;

    await updateLead(id, { sampleGenerated: true, sampleUrl, status: 'sample_generated' });
    res.json({ sampleUrl, format: isPng ? 'png' : 'html' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro ao gerar amostra' });
  }
});

// Enviar proposta para o lead (gera mensagem + registra envio)
app.post('/api/leads/:id/send-proposal', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const lead = await getLead(id);
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });

  const segment = lead.segment || lead.category || lead.placeType || 'Negócio';

  try {
    const message = await generateProposalMessage(lead.name, segment);
    await updateLead(id, {
      proposalSent: true,
      proposalSentAt: Date.now(),
      proposalMessage: message,
      status: 'proposal_sent',
    });
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro ao gerar proposta' });
  }
});

// Registrar resposta do lead
app.post('/api/leads/:id/respond', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = (req.params as Record<string, string>).id;
  const responseType = String(req.body?.responseType ?? '').trim();
  if (!['interested', 'not_interested', 'no_answer'].includes(responseType)) {
    return res.status(400).json({ error: 'responseType deve ser: interested, not_interested ou no_answer' });
  }
  const lead = await updateLead(id, {
    responseReceived: true,
    responseAt: Date.now(),
    responseType: responseType as Lead['responseType'],
    status: responseType === 'interested' ? 'converted' : 'closed',
  });
  if (!lead) return res.status(404).json({ error: 'lead não encontrado' });
  res.json({ lead });
});

// --- Automação de Leads (config + logs) ---

// GET /api/leads/automation/config
app.get('/api/leads/automation/config', async (req, res): Promise<void> => {
  try {
    const cfg = await getLeadsAutomationConfig();
    res.json(cfg);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// PUT /api/leads/automation/config
app.put('/api/leads/automation/config', async (req, res): Promise<void> => {
  if (!authOk(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  try {
    const cfg = await updateLeadsAutomationConfig(req.body || {});
    res.json(cfg);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// POST /api/leads/automation/tick — executa um tick manual
app.post('/api/leads/automation/tick', async (req, res): Promise<void> => {
  if (!authOk(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  void leadsAutomationTick();
  res.json({ ok: true, message: 'Tick iniciado em background' });
});

// GET /api/leads/automation/logs
app.get('/api/leads/automation/logs', async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query?.limit) || 20, 100);
    const logs = await listLeadsAutomationLogs(limit);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// --- WhatsApp (conexão via navegador + envio) ---

// GET /api/whatsapp/status
app.get('/api/whatsapp/status', async (req, res): Promise<void> => {
  try {
    const status = await whatsappGetStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// GET /api/debug/logs — últimas mensagens de debug do módulo WhatsApp
app.get('/api/debug/logs', (_req, res): void => {
  const logs = getDebugLogs();
  res.type('text/plain; charset=utf-8');
  res.send(logs.join('\n') || '(no debug logs yet)');
});

// GET /api/whatsapp/qr-image — serve o screenshot do QR Code (modo headless)
app.get('/api/whatsapp/qr-image', (req, res): void => {
  const qrPath = whatsappGetQrImagePath();
  if (!qrPath) {
    res.status(404).json({ error: 'QR Code não disponível. Conecte primeiro.' });
    return;
  }
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(qrPath);
});

// POST /api/whatsapp/connect — modo headless (Railway) ou visível (PC local)
app.post('/api/whatsapp/connect', async (req, res): Promise<void> => {
  try {
    const headless = req.body?.headless !== false; // default true
    const timeout = req.body?.timeout ? Number(req.body.timeout) : 120000;
    const result = await whatsappConnect({ headless, timeout });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// POST /api/whatsapp/disconnect — limpa a sessão
app.post('/api/whatsapp/disconnect', async (req, res): Promise<void> => {
  try {
    await whatsappDisconnect();
    res.json({ ok: true, message: 'WhatsApp desconectado' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// POST /api/whatsapp/send — envia mensagem de texto
app.post('/api/whatsapp/send', async (req, res): Promise<void> => {
  if (!authOk(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  const { phone, message } = req.body || {};
  if (!phone || !message) { res.status(400).json({ error: 'phone e message são obrigatórios' }); return; }
  try {
    const result = await whatsappSendMessage(String(phone), String(message));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// POST /api/whatsapp/send-image — envia imagem com legenda
app.post('/api/whatsapp/send-image', async (req, res): Promise<void> => {
  if (!authOk(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  const { phone, imagePath, caption } = req.body || {};
  if (!phone || !imagePath) { res.status(400).json({ error: 'phone e imagePath são obrigatórios' }); return; }
  try {
    const result = await whatsappSendImage(String(phone), String(imagePath), caption ? String(caption) : undefined);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'erro' });
  }
});

// --- jobs ---
app.post('/jobs', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const request = req.body as JobRequest;
  if (!request || !request.type) return res.status(400).json({ error: 'type é obrigatório' });
  const id = nanoid();
  const rec: JobRecord = { id, request, status: 'queued', createdAt: Date.now(), output: '' };
  jobs.set(id, rec);
  void execute(rec);
  res.json({ id, status: rec.status });
});
app.get('/jobs/:id', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get((req.params as Record<string, string>).id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});
app.get('/jobs/:id/events', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get((req.params as Record<string, string>).id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e: JobEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  send({ jobId: rec.id, kind: 'status', status: rec.status, ts: Date.now() });
  if (rec.output) send({ jobId: rec.id, kind: 'stdout', data: rec.output, ts: Date.now() });
  const set = listeners.get(rec.id) ?? new Set();
  set.add(send);
  listeners.set(rec.id, set);
  req.on('close', () => set.delete(send));
});

async function execute(rec: JobRecord) {
  rec.status = 'running';
  emit(rec.id, { kind: 'status', status: 'running' });
  const onChunk = (kind: 'stdout' | 'stderr', data: string) => emit(rec.id, { kind, data });
  try {
    switch (rec.request.type) {
      case 'shell': { const out = await runShell(rec.request, onChunk); rec.exitCode = out.exitCode; rec.result = out.result; if (out.exitCode !== 0) throw new Error(`exit code ${out.exitCode}`); break; }
      case 'git': { const out = await runGit(rec.request, onChunk); rec.exitCode = out.exitCode; rec.result = out.result; if (out.exitCode !== 0) throw new Error(`git exit code ${out.exitCode}`); break; }
      case 'writeFile': rec.result = (await writeFile(rec.request)).result; break;
      case 'readFile': rec.result = (await readFile(rec.request)).result; break;
      case 'browser': rec.result = (await runBrowser(rec.request, onChunk)).result; break;
      case 'ytFetch': rec.result = (await runYtFetch(rec.request, onChunk)).result; break;
      case 'clip': rec.result = (await runClip(rec.request, onChunk)).result; break;
      case 'publishYoutube': rec.result = (await runPublishYoutube(rec.request, onChunk)).result; break;
      case 'publishInstagram': rec.result = (await runPublishInstagram(rec.request, onChunk)).result; break;
      case 'publishFacebook': rec.result = (await runPublishFacebook(rec.request, onChunk)).result; break;
      case 'publishTiktok': rec.result = (await runPublishTiktok(rec.request, onChunk)).result; break;
      case 'leadsScrape': {
        const req = rec.request.payload as { search: string; total?: number; categories?: string; headless?: boolean };
        const rawLeads = await runScraper(req, onChunk);
        rec.result = { leads: rawLeads };
        break;
      }
      default: throw new Error(`tipo de job desconhecido: ${(rec.request as JobRequest).type}`);
    }
    rec.status = 'done'; rec.finishedAt = Date.now();
    emit(rec.id, { kind: 'result', result: rec.result });
    emit(rec.id, { kind: 'status', status: 'done' });
  } catch (err) {
    rec.status = 'error'; rec.error = err instanceof Error ? err.message : String(err); rec.finishedAt = Date.now();
    emit(rec.id, { kind: 'stderr', data: rec.error });
    emit(rec.id, { kind: 'status', status: 'error' });
  }
}

// --- AGENDADOR ---
function buildCaption(post: ScheduledPost): string {
  const tags = post.tags.map((t) => `#${t}`).join(' ');
  return [post.title, post.description, tags].filter(Boolean).join('\n\n').slice(0, 2200);
}

async function publishPost(post: ScheduledPost): Promise<{ url?: string }> {
  const noop = () => {};
  if (post.platform === 'youtube') {
    let clientId = '', clientSecret = '', refreshToken = '', privacyStatus = 'public';
    const acc = post.accountId ? await getAccount(post.accountId) : null;
    if (acc) {
      clientId = String((acc.extra as any)?.clientId ?? '');
      clientSecret = String((acc.extra as any)?.clientSecret ?? '');
      refreshToken = acc.refreshToken ?? '';
      privacyStatus = String((acc.extra as any)?.privacyStatus ?? 'public');
    } else {
      const c = await getYoutubeCreds();
      if (!c) throw new Error('Credenciais do YouTube não configuradas');
      clientId = c.clientId; clientSecret = c.clientSecret; refreshToken = c.refreshToken; privacyStatus = c.privacyStatus ?? 'public';
    }
    const out = await runPublishYoutube({ type: 'publishYoutube', payload: { file: post.file, title: post.title, description: post.description, tags: post.tags, privacyStatus, clientId, clientSecret, refreshToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'instagram') {
    let igUserId = '', accessToken = '';
    const acc = post.accountId ? await getAccount(post.accountId) : null;
    if (acc) {
      igUserId = String((acc.extra as any)?.igUserId ?? '');
      accessToken = acc.accessToken ?? '';
    } else {
      const c = await getPlatformCreds('instagram');
      if (!c) throw new Error('Credenciais do Instagram não configuradas');
      igUserId = String(c.igUserId ?? ''); accessToken = String(c.accessToken ?? '');
    }
    const out = await runPublishInstagram({ type: 'publishInstagram', payload: { file: post.file, caption: buildCaption(post), igUserId, accessToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'facebook') {
    let pageId = '', accessToken = '';
    const acc = post.accountId ? await getAccount(post.accountId) : null;
    if (acc) {
      pageId = String((acc.extra as any)?.pageId ?? '');
      accessToken = acc.accessToken ?? '';
    } else {
      const c = await getPlatformCreds('facebook');
      if (!c) throw new Error('Credenciais do Facebook não configuradas');
      pageId = String(c.pageId ?? ''); accessToken = String(c.accessToken ?? '');
    }
    const out = await runPublishFacebook({ type: 'publishFacebook', payload: { file: post.file, caption: buildCaption(post), pageId, accessToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'tiktok') {
    if (post.accountId) {
      const acc = await getAccount(post.accountId);
      if (!acc || !acc.refreshToken) throw new Error('Conta TikTok não encontrada ou sem token');
      const oapp = await getOauthApp('tiktok');
      if (!oapp) throw new Error('App OAuth do TikTok não configurado');
      const tok = await refreshTiktok(oapp.clientId, oapp.clientSecret, acc.refreshToken);
      await updateAccountTokens(acc.id, { accessToken: tok.accessToken, refreshToken: tok.refreshToken ?? acc.refreshToken, expiresAt: tok.expiresIn ? Date.now() + tok.expiresIn * 1000 : undefined });
      const r = await publishTiktokWithToken(tok.accessToken, { file: post.file, title: buildCaption(post), privacyLevel: (acc.extra as any)?.privacyLevel, cwd: undefined }, noop);
      return { url: r.url };
    }
    const c = await getPlatformCreds('tiktok');
    if (!c) throw new Error('Credenciais do TikTok não configuradas');
    const out = await runPublishTiktok({ type: 'publishTiktok', payload: { file: post.file, title: buildCaption(post), clientKey: c.clientKey, clientSecret: c.clientSecret, refreshToken: c.refreshToken, privacyLevel: c.privacyLevel } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  throw new Error(`Publicação em ${post.platform} ainda não suportada`);
}

let ticking = false;
async function schedulerTick() {
  if (ticking) return;
  ticking = true;
  try {
    const due = await getDuePosts(Date.now());
    for (const post of due) {
      await updatePost(post.id, { status: 'publishing' });
      try {
        const r = await publishPost(post);
        await updatePost(post.id, { status: 'done', url: r?.url });
        console.log(`[scheduler] publicado ${post.platform} ${post.id} → ${r?.url ?? ''}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await updatePost(post.id, { status: 'error', error: msg });
        console.error(`[scheduler] erro em ${post.id}: ${msg}`);
      }
    }
  } catch (e) {
    console.error('[scheduler] tick falhou:', e instanceof Error ? e.message : e);
  } finally {
    ticking = false;
  }
}
setInterval(() => { schedulerTick().catch(() => {}); }, 30000);

// --- Piloto automático de cortes: roda a cada 15min, gera no máximo o que
// faltar pra bater posts/dia (checa isso no início do tick). ---
setInterval(() => { autoclipTick().catch((e) => console.error('[autoclip] tick falhou:', e)); }, 15 * 60 * 1000);

// --- Automação de Leads: processa leads automaticamente a cada 5min ---
setInterval(() => { leadsAutomationTick().catch((e) => console.error('[leads-auto] tick falhou:', e)); }, 5 * 60 * 1000);
// Tick inicial após 30s (dá tempo do servidor subir)
setTimeout(() => { leadsAutomationTick().catch((e) => console.error('[leads-auto] tick inicial falhou:', e)); }, 30000);

// --- Auth (login por email/senha) ---
app.post('/api/auth/signup', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!isValidEmail(email)) return res.status(400).json({ error: 'email inválido' });
  if (password.length < 8) return res.status(400).json({ error: 'senha precisa ter pelo menos 8 caracteres' });
  const existing = await getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'já existe uma conta com esse email' });
  const { hash, salt } = await hashPassword(password);
  const user = await createUser(email, hash, salt);
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'email ou senha inválidos' });
  const ok = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!ok) return res.status(401).json({ error: 'email ou senha inválidos' });
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, currentProviderId: user.currentProviderId ?? null, currentModel: user.currentModel ?? null } });
});

app.get('/api/auth/me', requireUser(async (_req, res, user) => {
  res.json({ user: { id: user.id, email: user.email, currentProviderId: user.currentProviderId ?? null, currentModel: user.currentModel ?? null } });
}));

// --- Providers de IA por usuário (BYOK, chave criptografada em repouso) ---
app.get('/api/providers', requireUser(async (_req, res, user) => {
  const rows = await listProviders(user.id);
  res.json({
    providers: rows.map((p) => ({
      id: p.id, providerType: p.providerType, name: p.name, baseUrl: p.baseUrl ?? null,
      status: p.status, lastTestedAt: p.lastTestedAt ?? null, lastTestedError: p.lastTestedError ?? null,
      models: p.models, isCurrent: p.id === user.currentProviderId,
    })),
    currentProviderId: user.currentProviderId ?? null,
    currentModel: user.currentModel ?? null,
  });
}));

app.post('/api/providers', requireUser(async (req, res, user) => {
  const providerType = String(req.body?.providerType ?? '').trim();
  const apiKey = String(req.body?.apiKey ?? '');
  const baseUrl = req.body?.baseUrl ? String(req.body.baseUrl) : undefined;
  const name = String(req.body?.name ?? providerType);
  if (!providerType) return res.status(400).json({ error: 'providerType é obrigatório' });
  if (!apiKey && providerType !== 'ollama') return res.status(400).json({ error: 'apiKey é obrigatório' });

  const { encrypted, iv, tag } = encryptSecret(apiKey || '');
  const row = await addProvider({ userId: user.id, providerType, name, encryptedKey: encrypted, keyIv: iv, keyTag: tag, baseUrl });

  // testa em segundo plano e atualiza status/modelos
  testProviderConnection(providerType, apiKey, baseUrl).then((result) => {
    updateProviderTestResult(row.id, { status: result.success ? 'connected' : 'error', lastTestedError: result.error ?? null, models: result.models ?? [] }).catch(() => {});
  }).catch(() => {});

  res.json({ provider: { id: row.id, providerType: row.providerType, name: row.name, baseUrl: row.baseUrl ?? null, status: row.status, maskedApiKey: maskSecret(apiKey || '') } });
}));

app.post('/api/providers/:id/test', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const row = await getProvider(id, user.id);
  if (!row) return res.status(404).json({ error: 'provider não encontrado' });
  const apiKey = decryptSecret(row.encryptedKey, row.keyIv, row.keyTag);
  const result = await testProviderConnection(row.providerType, apiKey, row.baseUrl);
  await updateProviderTestResult(id, { status: result.success ? 'connected' : 'error', lastTestedError: result.error ?? null, models: result.models ?? [] });
  res.json(result);
}));

app.post('/api/providers/:id/select', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const model = req.body?.model ? String(req.body.model) : null;
  const row = await getProvider(id, user.id);
  if (!row) return res.status(404).json({ error: 'provider não encontrado' });
  await setCurrentSelection(user.id, id, model);
  res.json({ ok: true, currentProviderId: id, currentModel: model });
}));

app.delete('/api/providers/:id', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const ok = await removeProvider(id, user.id);
  if (user.currentProviderId === id) await setCurrentSelection(user.id, null, null);
  res.json({ ok });
}));

// --- Conversas + mensagens (persistência real do chat) ---
app.get('/api/conversations', requireUser(async (req, res, user) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const rows = await listConversations(user.id, projectId);
  const conversations = await Promise.all(rows.map(async (c) => {
    const msgs = await listMessages(c.id, user.id);
    const last = msgs[msgs.length - 1];
    return {
      id: c.id, title: c.title, projectId: c.projectId ?? null, model: c.model ?? null,
      reasoningEffort: c.reasoningEffort ?? 'default', createdAt: c.createdAt, updatedAt: c.updatedAt,
      messageCount: msgs.length,
      lastMessage: last ? { role: last.role, content: last.content, createdAt: last.createdAt } : null,
    };
  }));
  res.json({ conversations });
}));

app.post('/api/conversations', requireUser(async (req, res, user) => {
  const title = String(req.body?.title ?? 'Nova conversa');
  const projectId = req.body?.projectId ? String(req.body.projectId) : undefined;
  const model = req.body?.model ? String(req.body.model) : undefined;
  const reasoningEffort = req.body?.reasoningEffort ? String(req.body.reasoningEffort) : 'default';
  const row = await createConversation({ userId: user.id, projectId, title, model, reasoningEffort });
  res.json({ conversation: { id: row.id, title: row.title, projectId: row.projectId ?? null, model: row.model ?? null, reasoningEffort: row.reasoningEffort ?? 'default', createdAt: row.createdAt, updatedAt: row.updatedAt, messageCount: 0, lastMessage: null } });
}));

app.put('/api/conversations/:id', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const fields: { title?: string; model?: string; reasoningEffort?: string } = {};
  if (req.body?.title !== undefined) fields.title = String(req.body.title);
  if (req.body?.model !== undefined) fields.model = String(req.body.model);
  if (req.body?.reasoningEffort !== undefined) fields.reasoningEffort = String(req.body.reasoningEffort);
  const row = await updateConversation(id, user.id, fields);
  if (!row) return res.status(404).json({ error: 'conversa não encontrada' });
  res.json({ conversation: { id: row.id, title: row.title, projectId: row.projectId ?? null, model: row.model ?? null, reasoningEffort: row.reasoningEffort ?? 'default', createdAt: row.createdAt, updatedAt: row.updatedAt } });
}));

app.delete('/api/conversations/:id', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const ok = await deleteConversation(id, user.id);
  res.json({ ok });
}));

app.get('/api/conversations/:id/messages', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const rows = await listMessages(id, user.id);
  res.json({ messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, model: m.model ?? undefined, reasoningEffort: m.reasoningEffort ?? undefined, createdAt: m.createdAt })) });
}));

app.post('/api/conversations/:id/messages', requireUser(async (req, res, user) => {
  const id = (req.params as Record<string, string>).id;
  const conv = await getConversation(id, user.id);
  if (!conv) return res.status(404).json({ error: 'conversa não encontrada' });
  const role = String(req.body?.role ?? '');
  const content = String(req.body?.content ?? '');
  if (!role || !content) return res.status(400).json({ error: 'role e content são obrigatórios' });
  const model = req.body?.model ? String(req.body.model) : undefined;
  const reasoningEffort = req.body?.reasoningEffort ? String(req.body.reasoningEffort) : undefined;
  const row = await addMessage({ conversationId: id, userId: user.id, role, content, model, reasoningEffort });
  res.json({ message: { id: row.id, role: row.role, content: row.content, model: row.model ?? undefined, reasoningEffort: row.reasoningEffort ?? undefined, createdAt: row.createdAt } });
}));

// --- Chat (compat: frontend usa POST /api/conversation/respond) ---
app.post('/api/conversation/respond', async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg || msg.role !== 'user' || !msg.content) {
      return res.status(400).json({ error: 'formato: { message: { role: "user", content: string } }' });
    }
    const user = await currentUser(req);
    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : undefined;

    // Se a conversa existe e pertence ao usuário, manda o histórico real pro
    // modelo (não só a última mensagem) e persiste os dois lados no Supabase.
    let history: { role: string; content: string }[] = [{ role: 'user', content: msg.content }];
    let conv: Awaited<ReturnType<typeof getConversation>> = null;
    if (user && conversationId) {
      conv = await getConversation(conversationId, user.id);
      if (conv) {
        const prior = await listMessages(conversationId, user.id);
        history = [...prior.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: msg.content }].slice(-30);
        await addMessage({ conversationId, userId: user.id, role: 'user', content: msg.content });
      }
    }

    // Usuário logado com um provider BYOK selecionado → usa a chave dele, direto.
    if (user?.currentProviderId) {
      const provider = await getProvider(user.currentProviderId, user.id);
      if (provider) {
        // Prioriza o modelo salvo em Settings > Providers (selectCurrent) sobre o
        // seletor genérico do chat — o dropdown do chat hoje lista modelos do
        // gateway OpenRouter padrão, que podem não existir no provider BYOK do usuário.
        const model = user.currentModel || (typeof req.body?.model === 'string' && req.body.model) || provider.models[0] || '';
        try {
          const apiKey = decryptSecret(provider.encryptedKey, provider.keyIv, provider.keyTag);
          const result = await callProviderCompletion(provider.providerType, apiKey, provider.baseUrl, model, history);
          const content = result.content || 'Não consegui gerar uma resposta agora.';
          if (conv) await addMessage({ conversationId: conv.id, userId: user.id, role: 'assistant', content, model });
          return res.json({ messages: [{ role: 'assistant', content }], model, provider: provider.providerType });
        } catch (e) {
          console.error('[chat] erro no provider BYOK do usuário:', e);
          const content = `Não consegui falar com ${provider.name} agora (${e instanceof Error ? e.message : 'erro'}).`;
          return res.json({ messages: [{ role: 'assistant', content }] });
        }
      }
    }

    // Sem usuário/provider BYOK → gateway padrão global (OpenCode Zen, grátis por
    // padrão; cai pra OpenRouter se só essa chave estiver configurada), com OmniRouter opcional.
    const model = typeof req.body?.model === 'string' && req.body.model
      ? req.body.model
      : (process.env.AI_MODEL ?? 'big-pickle');
    const omnirouter = req.body?.omnirouter === true;
    const result = await executeCapability('ai.complete', {
      messages: history,
      model,
      omnirouter,
    }) as { outputs?: { content?: string; modelUsed?: string } };
    const content = typeof result?.outputs?.content === 'string'
      ? result.outputs.content
      : 'Não consegui gerar uma resposta agora.';
    const modelUsed = result?.outputs?.modelUsed ?? model;
    if (conv && user) await addMessage({ conversationId: conv.id, userId: user.id, role: 'assistant', content, model: modelUsed });
    res.json({ messages: [{ role: 'assistant', content }], model: modelUsed });
  } catch (e) {
    console.error('[chat] erro:', e);
    res.json({ messages: [{ role: 'assistant', content: 'Não consegui falar com o servidor de IA agora.' }] });
  }
});

// --- Plugin Capabilities (kernel) ---
app.get('/api/plugins', (_req, res) => {
  try {
    const caps = listCapabilities().map((e) => ({ id: e.capability.id, name: e.capability.name, pluginId: e.pluginId }));
    res.json({ capabilities: caps });
  } catch (e) {
    res.status(503).json({ error: 'kernel not ready', detail: String(e instanceof Error ? e.message : e) });
  }
});

app.post('/api/plugins/:capability', async (req, res) => {
  try {
    const capId = (req.params as Record<string, string>).capability;
    const input = req.body ?? {};
    const result = await executeCapability(capId, input);
    res.json({ ok: true, capability: capId, result });
  } catch (e) {
    res.status(400).json({ error: String(e instanceof Error ? e.message : e) });
  }
});

app.listen(PORT, () => {
  console.log(`[beehive-worker] porta ${PORT} · storage=${storageMode()} · public=${PUBLIC_URL ? 'on' : 'off'} · agendador on`);
});
