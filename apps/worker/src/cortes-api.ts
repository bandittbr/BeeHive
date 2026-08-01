// Cortes API Routes - Gerencia projetos, canais, contas sociais e configurações
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const router = Router();
const DATA_DIR = process.env.CORTES_DATA_DIR || path.join(process.cwd(), 'data', 'cortes');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions
function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filepath)) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8')) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function writeJsonFile(filename: string, data: any) {
  const filepath = path.join(DATA_DIR, filename);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ── Canais ────────────────────────────────────────────────────────────────────

router.get('/channels', (_req, res) => {
  const channels = readJsonFile<CorteChannel[]>('channels.json', []);
  res.json(channels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/channels', (req, res) => {
  const { name, category, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const channels = readJsonFile<CorteChannel[]>('channels.json', []);
  const channel: CorteChannel = {
    id: `ch_${Date.now()}`,
    name: name.trim(),
    category: category?.trim() || null,
    description: description?.trim() || null,
    socialAccountIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  channels.push(channel);
  writeJsonFile('channels.json', channels);
  res.json(channel);
});

router.patch('/channels/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  let channels = readJsonFile<CorteChannel[]>('channels.json', []);
  
  const index = channels.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Canal não encontrado' });
  
  channels[index] = { ...channels[index], ...updates, updatedAt: new Date().toISOString() };
  writeJsonFile('channels.json', channels);
  res.json(channels[index]);
});

router.delete('/channels/:id', (req, res) => {
  const { id } = req.params;
  let channels = readJsonFile<CorteChannel[]>('channels.json', []);
  channels = channels.filter(c => c.id !== id);
  writeJsonFile('channels.json', channels);
  res.json({ ok: true });
});

// ── Redes Sociais ─────────────────────────────────────────────────────────────

router.get('/social-accounts', (_req, res) => {
  const accounts = readJsonFile<CorteSocialAccount[]>('social-accounts.json', []);
  res.json(accounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/social-accounts', (req, res) => {
  const { platform, accountId, displayName, handle } = req.body;
  if (!platform || !accountId) return res.status(400).json({ error: 'Platform e accountId são obrigatórios' });
  
  const accounts = readJsonFile<CorteSocialAccount[]>('social-accounts.json', []);
  
  // Check for duplicate
  const existing = accounts.find(a => a.platform === platform && a.accountId === accountId);
  if (existing) return res.status(409).json({ error: 'Conta já cadastrada' });
  
  const account: CorteSocialAccount = {
    id: `sa_${Date.now()}`,
    platform,
    accountId,
    displayName: displayName?.trim() || null,
    handle: handle?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channelIds: [],
  };
  accounts.push(account);
  writeJsonFile('social-accounts.json', accounts);
  res.json(account);
});

router.delete('/social-accounts/:id', (req, res) => {
  const { id } = req.params;
  const accounts = readJsonFile<CorteSocialAccount[]>('social-accounts.json', []);
  const filtered = accounts.filter(a => a.id !== id);
  writeJsonFile('social-accounts.json', filtered);
  res.json({ ok: true });
});

// ── Projetos ──────────────────────────────────────────────────────────────────

router.get('/projects', (_req, res) => {
  const projects = readJsonFile<CorteProject[]>('projects.json', []);
  res.json(projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.get('/projects/:id', (req, res) => {
  const { id } = req.params;
  const projects = readJsonFile<CorteProject[]>('projects.json', []);
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
  
  const projects = readJsonFile<CorteProject[]>('projects.json', []);
  const project: CorteProject = {
    id: `cp_${Date.now()}`,
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
  writeJsonFile('projects.json', projects);
  res.json(project);
});

router.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  let projects = readJsonFile<CorteProject[]>('projects.json', []);
  
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  writeJsonFile('projects.json', projects);
  res.json(projects[index]);
});

router.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  let projects = readJsonFile<CorteProject[]>('projects.json', []);
  projects = projects.filter(p => p.id !== id);
  writeJsonFile('projects.json', projects);
  res.json({ ok: true });
});

// ── Gerar Cortes (via gerador existente) ─────────────────────────────────────

router.post('/generate', (req, res) => {
  const { projectId, url, duration, format, autoCaptions } = req.body;
  
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
  if (!projectId) return res.status(400).json({ error: 'projectId é obrigatório' });
  
  // Update project to GENERATING status
  let projects = readJsonFile<CorteProject[]>('projects.json', []);
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  
  projects[projectIndex] = {
    ...projects[projectIndex],
    status: 'GENERATING',
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile('projects.json', projects);
  
  const GENERATOR_PATH = process.env.CORTES_GENERATOR_PATH || 'E:/BeeHive/AI-Youtube-Shorts-Generator';
  
  try {
    const numClips = Math.max(1, Number(duration) && Number(duration) > 0 ? Math.round(120 / (duration || 15)) : 3);
    
    // Execute Python generator
    const result = execSync(
      `python main.py "${url}" --num-clips ${numClips} --aspect-ratio ${format || '9:16'}`,
      {
        cwd: GENERATOR_PATH,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 600000, // 10 minutes timeout
      }
    );
    
    // Update project status
    projects = readJsonFile<CorteProject[]>('projects.json', []);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        status: 'READY',
        updatedAt: new Date().toISOString(),
      };
      writeJsonFile('projects.json', projects);
    }
    
    res.json({ jobId: projectId, status: 'completed', output: result });
  } catch (error: any) {
    // Update project to ERROR status
    projects = readJsonFile<CorteProject[]>('projects.json', []);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        status: 'ERROR',
        error: error.message,
        updatedAt: new Date().toISOString(),
      };
      writeJsonFile('projects.json', projects);
    }
    res.status(500).json({ error: error.message });
  }
});

// ── Configurações ────────────────────────────────────────────────────────────

router.get('/settings', (_req, res) => {
  let settings = readJsonFile<CorteSettings | null>('settings.json', null);
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
    writeJsonFile('settings.json', settings);
  }
  res.json(settings);
});

router.post('/settings', (req, res) => {
  const updates = req.body;
  let settings = readJsonFile<CorteSettings | null>('settings.json', null);
  
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
  
  writeJsonFile('settings.json', settings);
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
