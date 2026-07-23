// Armazenamento persistente do worker: fila de posts agendados + credenciais
// das redes. Grava um JSON no workspace para sobreviver a reinícios (recomenda-se
// um volume do Railway montado no workspace para durabilidade real).
import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_ROOT } from './workspace.js';

export interface YoutubeCreds {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}

export interface ScheduledPost {
  id: string;
  platform: 'youtube';
  file: string;
  title: string;
  description: string;
  tags: string[];
  at: number; // epoch ms em que deve ser publicado
  status: 'pending' | 'publishing' | 'done' | 'error';
  url?: string;
  error?: string;
  createdAt: number;
}

export interface StoreData {
  youtube?: YoutubeCreds;
  posts: ScheduledPost[];
}

const FILE = path.join(WORKSPACE_ROOT, '.beehive-store.json');

export function loadStore(): StoreData {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw) as StoreData;
    if (!Array.isArray(data.posts)) data.posts = [];
    return data;
  } catch {
    return { posts: [] };
  }
}

export function saveStore(data: StoreData): void {
  try {
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
}

export function setYoutubeCreds(creds: YoutubeCreds): void {
  const data = loadStore();
  data.youtube = creds;
  saveStore(data);
}

export function hasYoutubeCreds(): boolean {
  const c = loadStore().youtube;
  return !!(c && c.clientId && c.clientSecret && c.refreshToken);
}

export function addPost(p: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>): ScheduledPost {
  const data = loadStore();
  const post: ScheduledPost = { ...p, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, status: 'pending', createdAt: Date.now() };
  data.posts.push(post);
  saveStore(data);
  return post;
}

export function removePost(id: string): boolean {
  const data = loadStore();
  const before = data.posts.length;
  data.posts = data.posts.filter((p) => p.id !== id);
  saveStore(data);
  return data.posts.length < before;
}
