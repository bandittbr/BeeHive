// Cortes API Routes - Gerencia projetos, canais, contas sociais e configurações
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();
const router = Router();

const GENERATOR_PATH = process.env.CORTES_GENERATOR_PATH || 'E:/BeeHive/AI-Youtube-Shorts-Generator';

// ── Canais ────────────────────────────────────────────────────────────────────

router.get('/channels', async (_req, res) => {
  const channels = await prisma.corteChannel.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(channels);
});

router.post('/channels', async (req, res) => {
  const { name, category, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const channel = await prisma.corteChannel.create({
    data: { name: name.trim(), category: category?.trim() || null, description: description?.trim() || null },
  });
  res.json(channel);
});

router.patch('/channels/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const channel = await prisma.corteChannel.update({
    where: { id },
    data: updateData,
  });
  res.json(channel);
});

router.delete('/channels/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.corteChannel.delete({ where: { id } });
  res.json({ ok: true });
});

// ── Redes Sociais ─────────────────────────────────────────────────────────────

router.get('/social-accounts', async (_req, res) => {
  const accounts = await prisma.corteSocialAccount.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
});

router.post('/social-accounts', async (req, res) => {
  const { platform, accountId, displayName, handle } = req.body;
  if (!platform || !accountId) return res.status(400).json({ error: 'Platform e accountId são obrigatórios' });
  
  try {
    const account = await prisma.corteSocialAccount.create({
      data: { 
        platform, 
        accountId, 
        displayName: displayName?.trim() || null, 
        handle: handle?.trim() || null 
      },
    });
    res.json(account);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Conta já cadastrada' });
    throw e;
  }
});

router.delete('/social-accounts/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.corteSocialAccount.delete({ where: { id } });
  res.json({ ok: true });
});

// ── Projetos ──────────────────────────────────────────────────────────────────

router.get('/projects', async (_req, res) => {
  const projects = await prisma.corteProject.findMany({
    include: { clips: { orderBy: { index: 'asc' } }, channel: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

router.get('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const project = await prisma.corteProject.findUnique({
    where: { id },
    include: { clips: { orderBy: { index: 'asc' } }, channel: true },
  });
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  res.json(project);
});

router.post('/projects', async (req, res) => {
  const {
    url, name, channelId, quantity, duration, format,
    autoHighlights, autoCaptions, autoTitle, autoDescription, autoHashtags,
  } = req.body;
  
  if (!url || !name) return res.status(400).json({ error: 'URL e nome são obrigatórios' });
  
  const project = await prisma.corteProject.create({
    data: {
      name: name.trim(),
      sourceVideoUrl: url.trim(),
      channelId: channelId || null,
      quantityRequested: quantity || 3,
      duration: duration || 15,
      format: format || '9:16',
      autoHighlights: autoHighlights ?? true,
      autoCaptions: autoCaptions ?? true,
      autoTitle: autoTitle ?? true,
      autoDescription: autoDescription ?? true,
      autoHashtags: autoHashtags ?? true,
      status: 'PENDING',
    },
  });
  res.json(project);
});

router.patch('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const project = await prisma.corteProject.update({
    where: { id },
    data: updateData,
  });
  res.json(project);
});

router.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.corteProject.delete({ where: { id } });
  res.json({ ok: true });
});

// ── Gerar Cortes (via gerador existente) ─────────────────────────────────────

router.post('/generate', async (req, res) => {
  const { projectId, url, duration, format, autoCaptions } = req.body;
  
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
  if (!projectId) return res.status(400).json({ error: 'projectId é obrigatório' });
  
  // Update project to GENERATING status
  await prisma.corteProject.update({
    where: { id: projectId },
    data: { status: 'GENERATING' },
  });
  
  try {
    const numClips = Math.max(1, Number(duration) && Number(duration) > 0 ? Math.round(120 / (duration || 15)) : 3);
    
    // Execute Python generator
    const result = execSync(
      `python main.py "${url}" --num-clips ${numClips} --aspect-ratio ${format || '9:16'} --output-json "result_${projectId}.json"`,
      {
        cwd: GENERATOR_PATH,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 600000, // 10 minutes timeout
      }
    );
    
    // Update project status
    await prisma.corteProject.update({
      where: { id: projectId },
      data: { status: 'READY' },
    });
    
    res.json({ jobId: projectId, status: 'completed', output: result });
  } catch (error: any) {
    await prisma.corteProject.update({
      where: { id: projectId },
      data: { status: 'ERROR', error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

// ── Configurações ────────────────────────────────────────────────────────────

router.get('/settings', async (_req, res) => {
  let settings = await prisma.corteSettings.findFirst();
  if (!settings) {
    settings = await prisma.corteSettings.create({
      data: {
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
      },
    });
  }
  res.json(settings);
});

router.post('/settings', async (req, res) => {
  const updates = req.body;
  
  const existing = await prisma.corteSettings.findFirst();
  
  if (existing) {
    const updated = await prisma.corteSettings.update({
      where: { id: existing.id },
      data: updates,
    });
    res.json(updated);
  } else {
    const created = await prisma.corteSettings.create({ data: updates });
    res.json(created);
  }
});

export default router;
