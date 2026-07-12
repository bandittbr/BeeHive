/**
 * ProjectStore — estado global de projetos no frontend.
 */

import { createContext, useContext } from 'react';
import type { Project, ProjectFile, ProjectSettings } from './types';

export interface ProjectStoreState {
  /** Lista de projetos */
  projects: Project[];
  /** Projeto ativo */
  activeProject: Project | null;
  /** Arquivos do projeto ativo */
  files: ProjectFile[];
  /** Configurações completas */
  settings: ProjectSettings | null;
  /** Se está carregando */
  loading: boolean;
  /** Mensagem de erro */
  error: string | null;
}

export interface ProjectStoreActions {
  /** Carrega projetos do backend */
  loadProjects: () => Promise<void>;
  /** Adiciona um projeto */
  addProject: (path: string, name?: string) => Promise<void>;
  /** Remove um projeto */
  removeProject: (id: string) => Promise<void>;
  /** Define o projeto ativo */
  setActiveProject: (id: string | null) => Promise<void>;
  /** Lista arquivos do projeto ativo */
  loadFiles: (subPath?: string) => Promise<void>;
  /** Atualiza um projeto */
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

export const ProjectStoreContext = createContext<ProjectStore | null>(null);

export function useProjectStore(): ProjectStore {
  const store = useContext(ProjectStoreContext);
  if (!store) {
    throw new Error('useProjectStore deve ser usado dentro de ProjectStoreProvider');
  }
  return store;
}
