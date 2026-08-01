// Cortes API Routes - Gerencia projetos, canais, contas sociais e configurações
import { Router } from 'express';

const router = Router();

// Armazenamento em memória (persistente durante runtime do container)
let channels: CorteChannel[] = [];
let socialAccounts: CorteSocialAccount[] = [];
let projects: CorteProject[] = [];
let settings: CorteSettings | null = null;

// Helper functions
function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ── Canais ────────────────────────────────────────────────────────────────────

router.get('/channels', (_req, res) => {
  res.json(channels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/channels', (req, res) => {
  const { name, category, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const channel: CorteChannel = {
    id: generateId('ch'),
    name: name.trim(),
    category: category?.trim() || null,
    description: description?.trim() || null,
    socialAccountIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  channels.push(channel);
  res.json(channel);
});

router.patch('/channels/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = channels.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Canal não encontrado' });
  
  channels[index] = { ...channels[index], ...updates, updatedAt: new Date().toISOString() };
  res.json(channels[index]);
});

router.delete('/channels/:id', (req, res) => {
  const { id } = req.params;
  channels = channels.filter(c => c.id !== id);
  res.json({ ok: true });
});

// ── Redes Sociais ─────────────────────────────────────────────────────────────

router.get('/social-accounts', (_req, res) => {
  res.json(socialAccounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/social-accounts', (req, res) => {
  const { platform, accountId, displayName, handle } = req.body;
  if (!platform || !accountId) return res.status(400).json({ error: 'Platform e accountId são obrigatórios' });
  
  const account: CorteSocialAccount = {
    id: generateId('sa'),
    platform,
    accountId,
    displayName: displayName?.trim() || null,
    handle: handle?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channelIds: [],
  };
  socialAccounts.push(account);
  res.json(account);
});

router.delete('/social-accounts/:id', (req, res) => {
  const { id } = req.params;
  socialAccounts = socialAccounts.filter(a => a.id !== id);
  res.json({ ok: true });
});

// ── Projetos ──────────────────────────────────────────────────────────────────

router.get('/projects', (_req, res) => {
  res.json(projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.get('/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  res.json(project);
});

router.post('/projects', (req, res) => {
  const {
    url, name, channelId, quantity, duration, format,
    autoHighlights, autoCaptions, autoTitle, autoDescription, autoHashtags,
  } = req.body;
  
  if (!url || !name) return res.status(400).json({ error: 'URL e nome são obrigatórios' });
  
  const project: CorteProject = {
    id: generateId('cp'),
    name: name.trim(),
    sourceVideoUrl: url.trim(),
    duration: duration || 15,
    format: format || '9:16',
    quantityRequested: quantity || 3,
    autoHighlights: autoHighlights ?? true,
    autoCaptions: autoCaptions ?? true,
    autoTitle: autoTitle ?? true,
    autoDescription: autoDescription ?? true,
    autoHashtags: autoHashtags ?? true,
    status: 'PENDING',
    clips: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(channelId ? { channelId } : {}),
  };
  projects.push(project);
  res.json(project);
});

router.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  res.json(projects[index]);
});

router.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  projects = projects.filter(p => p.id !== id);
  res.json({ ok: true });
});

// ── Configurações ────────────────────────────────────────────────────────────

router.get('/settings', (_req, res) => {
  if (!settings) {
    settings = {
      id: 'default',
      subtitleFontSize: 24,
      subtitleFontFamily: 'Arial',
      subtitleVerticalPos: 'bottom',
      subtitleMaxChars: 20,
      subtitleColor: '#FFFFFF',
      activeWordColor: 'YELLOW',
      activeWordSize: 110,
      subtitleStyle: 'outline',
      lineSpacing: 120,
      videoQuality: '720p',
      defaultDuration: 15,
      defaultQuantity: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  res.json(settings);
});

router.post('/settings', (req, res) => {
  const updates = req.body;
  if (settings) {
    settings = { ...settings, ...updates, updatedAt: new Date().toISOString() };
  } else {
    settings = {
      id: 'default',
      subtitleFontSize: updates.subtitleFontSize || 24,
      subtitleFontFamily: updates.subtitleFontFamily || 'Arial',
      subtitleVerticalPos: updates.subtitleVerticalPos || 'bottom',
      subtitleMaxChars: updates.subtitleMaxChars || 20,
      subtitleColor: updates.subtitleColor || '#FFFFFF',
      activeWordColor: updates.activeWordColor || 'YELLOW',
      activeWordSize: updates.activeWordSize || 110,
      subtitleStyle: updates.subtitleStyle || 'outline',
      lineSpacing: updates.lineSpacing || 120,
      videoQuality: updates.videoQuality || '720p',
      defaultDuration: updates.defaultDuration || 15,
      defaultQuantity: updates.defaultQuantity || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  res.json(settings);
});

// Types (simple interfaces for this module)
interface CorteChannel {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  socialAccountIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface CorteSocialAccount {
  id: string;
  platform: string;
  accountId: string;
  displayName: string | null;
  handle: string | null;
  createdAt: string;
  updatedAt: string;
  channelIds: string[];
}

interface CorteProject {
  id: string;
  name: string;
  sourceVideoUrl: string;
  duration: number;
  format: string;
  quantityRequested: number;
  autoHighlights: boolean;
  autoCaptions: boolean;
  autoTitle: boolean;
  autoDescription: boolean;
  autoHashtags: boolean;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'ERROR' | 'PUBLISHED';
  error?: string;
  channelId?: string;
  clips: CorteClip[];
  createdAt: string;
  updatedAt: string;
}

interface CorteClip {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  caption: string;
  status: string;
}

interface CorteSettings {
  id: string;
  subtitleFontSize: number;
  subtitleFontFamily: string;
  subtitleVerticalPos: string;
  subtitleMaxChars: number;
  subtitleColor: string;
  activeWordColor: string;
  activeWordSize: number;
  subtitleStyle: string;
  lineSpacing: number;
  videoQuality: string;
  defaultDuration: number;
  defaultQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export default router;
