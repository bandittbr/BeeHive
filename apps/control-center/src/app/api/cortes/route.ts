import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Canais ────────────────────────────────────────────────────────────────────

export async function GET() {
  const channels = await prisma.corteChannel.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  
  const channel = await prisma.corteChannel.create({
    data: { 
      name: body.name.trim(), 
      category: body.category?.trim() || null, 
      description: body.description?.trim() || null 
    },
  });
  return NextResponse.json(channel);
}

// ── Canal por ID ───────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const channel = await prisma.corteChannel.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(channel);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.corteChannel.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// ── Redes Sociais ─────────────────────────────────────────────────────────────

export async function GET_socialAccounts() {
  const accounts = await prisma.corteSocialAccount.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(accounts);
}

export async function POST_socialAccounts(req: NextRequest) {
  const body = await req.json();
  if (!body.platform || !body.accountId) {
    return NextResponse.json({ error: 'Platform e accountId são obrigatórios' }, { status: 400 });
  }
  
  try {
    const account = await prisma.corteSocialAccount.create({
      data: { 
        platform: body.platform, 
        accountId: body.accountId, 
        displayName: body.displayName?.trim() || null, 
        handle: body.handle?.trim() || null 
      },
    });
    return NextResponse.json(account);
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Conta já cadastrada' }, { status: 409 });
    throw e;
  }
}

export async function DELETE_socialAccounts(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.corteSocialAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export async function GET_projects() {
  const projects = await prisma.corteProject.findMany({
    include: { clips: { orderBy: { index: 'asc' } }, channel: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(projects);
}

export async function GET_projectsById(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.corteProject.findUnique({
    where: { id: params.id },
    include: { clips: { orderBy: { index: 'asc' } }, channel: true },
  });
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
  return NextResponse.json(project);
}

export async function POST_projects(req: NextRequest) {
  const body = await req.json();
  if (!body.url || !body.name) {
    return NextResponse.json({ error: 'URL e nome são obrigatórios' }, { status: 400 });
  }
  
  const project = await prisma.corteProject.create({
    data: {
      name: body.name.trim(),
      sourceVideoUrl: body.url.trim(),
      channelId: body.channelId || null,
      quantityRequested: body.quantity || 3,
      duration: body.duration || 15,
      format: body.format || '9:16',
      autoHighlights: body.autoHighlights ?? true,
      autoCaptions: body.autoCaptions ?? true,
      autoTitle: body.autoTitle ?? true,
      autoDescription: body.autoDescription ?? true,
      autoHashtags: body.autoHashtags ?? true,
      status: 'PENDING',
    },
  });
  return NextResponse.json(project);
}

export async function PATCH_projects(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const project = await prisma.corteProject.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(project);
}

export async function DELETE_projects(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.corteProject.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// ── Gerar Cortes ──────────────────────────────────────────────────────────────

export async function POST_generate(req: NextRequest) {
  const body = await req.json();
  const { projectId, url, duration, format } = body;
  
  if (!url) {
    return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
  }
  
  // Update project to GENERATING status
  await prisma.corteProject.update({
    where: { id: projectId },
    data: { status: 'GENERATING' },
  });
  
  // Call the existing Python generator
  const numClips = Math.max(1, Number(duration) && Number(duration) > 0 ? Math.round(120 / (duration || 15)) : 3);
  const formatRatio = format || '9:16';
  
  try {
    // Execute Python generator (this is a placeholder - would need proper subprocess call)
    const result = await executeGenerator(url, numClips, formatRatio);
    
    // Parse result and update project
    await prisma.corteProject.update({
      where: { id: projectId },
      data: { status: 'READY' },
    });
    
    return NextResponse.json({ jobId: projectId, status: 'completed', output: result });
  } catch (error: any) {
    await prisma.corteProject.update({
      where: { id: projectId },
      data: { status: 'ERROR', error: error.message },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function executeGenerator(url: string, numClips: number, aspectRatio: string): Promise<any> {
  // This would call the Python generator via child_process or similar
  // For now, return a mock response
  return { message: 'Generator called', url, numClips, aspectRatio };
}

// ── Configurações ────────────────────────────────────────────────────────────

export async function GET_settings() {
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
  return NextResponse.json(settings);
}

export async function POST_settings(req: NextRequest) {
  const updates = await req.json();
  
  const existing = await prisma.corteSettings.findFirst();
  
  if (existing) {
    const updated = await prisma.corteSettings.update({
      where: { id: existing.id },
      data: updates,
    });
    return NextResponse.json(updated);
  } else {
    const created = await prisma.corteSettings.create({ data: updates });
    return NextResponse.json(created);
  }
}
