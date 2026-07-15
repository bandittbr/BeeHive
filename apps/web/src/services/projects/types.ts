/**
 * Tipos para o sistema de Projetos do BeeHive.
 * 
 * Projetos são diretórios locais que o usuário adiciona ao BeeHive
 * para trabalhar com arquivos, similar ao OpenWork.
 */

export interface Project {
  /** Id único do projeto */
  id: string;
  /** Nome amigável */
  name: string;
  /** Caminho absoluto no sistema de arquivos */
  path: string;
  /** Descrição opcional */
  description?: string;
  /** Data de criação */
  createdAt: number;
  /** Último acesso */
  lastAccessedAt: number;
  /** Cor do marcador (para exibição) */
  color?: string;
  /** Ícone (emoji) */
  icon?: string;
  /** Se está fixado na sidebar */
  pinned: boolean;
  /** Tags para organização */
  tags?: string[];
  /** Modo do projeto: 'api' (backend) ou 'local' (File System Access API) */
  mode?: 'api' | 'local';
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
}

export interface ProjectArea {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  /** Projetos associados a esta área */
  projectIds: string[];
}

export interface ProjectSettings {
  /** Projetos cadastrados */
  projects: Project[];
  /** Áreas predefinidas */
  areas: ProjectArea[];
  /** Projeto ativo (id) */
  activeProjectId: string | null;
}
