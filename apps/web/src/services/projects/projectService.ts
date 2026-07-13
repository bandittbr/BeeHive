/**
 * ProjectService — gerencia projetos (diretórios locais) no BeeHive.
 * 
 * Os projetos são salvos no backend (SQLite) e acessados via API.
 * O frontend nunca acessa o sistema de arquivos diretamente.
 */

import type { Project, ProjectFile, ProjectSettings } from './types';
import { API_BASE } from '@/lib/api';

async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Erro ${response.status}`);
  }
  return (await response.json()) as T;
}

async function del(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao deletar`);
  }
}

export class ProjectService {
  // -----------------------------------------------------------------------
  // Projetos
  // -----------------------------------------------------------------------

  /** Lista todos os projetos. */
  async listProjects(): Promise<Project[]> {
    return getJSON('/projects');
  }

  /** Obtém um projeto pelo id. */
  async getProject(id: string): Promise<Project> {
    return getJSON(`/projects/${id}`);
  }

  /** Adiciona um novo projeto (diretório local). */
  async addProject(path: string, name?: string): Promise<Project> {
    return postJSON('/projects', { path, name });
  }

  /** Remove um projeto. */
  async removeProject(id: string): Promise<void> {
    return del(`/projects/${id}`);
  }

  /** Atualiza um projeto. */
  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return postJSON(`/projects/${id}`, data);
  }

  /** Define o projeto ativo. */
  async setActiveProject(id: string | null): Promise<void> {
    return postJSON('/projects/active', { id });
  }

  /** Lista arquivos de um projeto. */
  async listFiles(projectId: string, subPath?: string): Promise<ProjectFile[]> {
    const query = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    return getJSON(`/projects/${projectId}/files${query}`);
  }

  /** Lê o conteúdo de um arquivo. */
  async readFile(projectId: string, filePath: string): Promise<string> {
    return getJSON(`/projects/${projectId}/read?path=${encodeURIComponent(filePath)}`);
  }

  // -----------------------------------------------------------------------
  // Configurações
  // -----------------------------------------------------------------------

  /** Obtém todas as configurações de projetos. */
  async getSettings(): Promise<ProjectSettings> {
    return getJSON('/projects/settings');
  }

  /** Salva configurações. */
  async saveSettings(settings: Partial<ProjectSettings>): Promise<void> {
    return postJSON('/projects/settings', settings);
  }
}

let instance: ProjectService | null = null;

export function getProjectService(): ProjectService {
  if (!instance) instance = new ProjectService();
  return instance;
}
