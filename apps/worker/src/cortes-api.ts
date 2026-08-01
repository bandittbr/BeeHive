// Cortes API Routes - Gerencia projetos, canais, contas sociais e configurações
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';

const router = Router();

// Usar variável de ambiente DATABASE_URL configurada no Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL não configurado! Dados não persistirão entre reinicializações.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

// ── Canais ────────────────────────────────────────────────────────────────────

router.get('/channels', async (_req, res) => {
  try {
    const channels = await prisma.corteChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(channels);
  } catch (e) {
    console.error('Error fetching channels:', e);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.post('/channels', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const channel = await prisma.corteChannel.create({
      data: {
        name: name.trim(),
        category: category?.trim() || null,
        description: description?.trim() || null,
        socialAccountIds: [],
      },
    });
    res.json(channel);
  } catch (e) {
    console.error('Error creating channel:', e);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

router.patch('/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const channel = await prisma.corteChannel.update({
      where: { id },
      data: updates,
    });
    res.json(channel);
  } catch (e) {
    res.status(404).json({ error: 'Canal não encontrado' });
  }
});

router.delete('/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.corteChannel.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: 'Canal não encontrado' });
  }
});

// ── Redes Sociais ─────────────────────────────────────────────────────────────

router.get('/social-accounts', async (_req, res) => {
  try {
    const accounts = await prisma.corteSocialAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

router.post('/social-accounts', async (req, res) => {
  try {
    const { platform, accountId, displayName, handle } = req.body;
    if (!platform || !accountId) return res.status(400).json({ error: 'Platform e accountId são obrigatórios' });
    
    const account = await prisma.corteSocialAccount.create({
      data: {
        platform,
        accountId,
        displayName: displayName?.trim() || null,
        handle: handle?.trim() || null,
        channelIds: [],
      },
    });
    res.json(account);
  } catch (e) {
    console.error('Error creating social account:', e);
    res.status(500).json({ error: 'Failed to create social account' });
  }
});

router.delete('/social-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.corteSocialAccount.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: 'Conta não encontrada' });
  }
});

// ── Projetos ──────────────────────────────────────────────────────────────────

router.get('/projects', async (_req, res) => {
  try {
    const projects = await prisma.corteProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: { clips: true },
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.corteProject.findUnique({
      where: { id },
      include: { clips: true },
    });
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const {
      url, name, channelId, quantity, duration, format,
      autoHighlights, autoCaptions, autoTitle, autoDescription, autoHashtags,
    } = req.body;
    
    if (!url || !name) return res.status(400).json({ error: 'URL e nome são obrigatórios' });
    
    const project = await prisma.corteProject.create({
      data: {
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
        clips: { create: [] },
        ...(channelId ? { channelId } : {}),
      },
    });
    res.json(project);
  } catch (e) {
    console.error('Error creating project:', e);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.patch('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const project = await prisma.corteProject.update({
      where: { id },
      data: updates,
    });
    res.json(project);
  } catch (e) {
    res.status(404).json({ error: 'Projeto não encontrado' });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.corteProject.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: 'Projeto não encontrado' });
  }
});

// ── Configurações ────────────────────────────────────────────────────────────

router.get('/settings', async (_req, res) => {
  try {
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
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const updates = req.body;
    
    let settings = await prisma.corteSettings.findFirst();
    if (settings) {
      settings = await prisma.corteSettings.update({
        where: { id: settings.id },
        data: updates,
      });
    } else {
      settings = await prisma.corteSettings.create({
        data: {
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
        },
      });
    }
    res.json(settings);
  } catch (e) {
    console.error('Error saving settings:', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
