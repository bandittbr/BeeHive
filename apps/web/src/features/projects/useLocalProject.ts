/**
 * useLocalProject — hook que gerencia o projeto local ativo.
 *
 * Lê arquivos via File System Access API, mantém o contexto pronto
 * para injetar na conversa com a AI.
 */

import { useState, useCallback } from 'react';
import { projectFiles, type LocalFile, type ProjectEntry } from '@/services/files/projectFiles';

export interface LocalProjectState {
  project: ProjectEntry | null;
  files: LocalFile[];
  fileTree: string[];
  loading: boolean;
}

export function useLocalProject() {
  const [state, setState] = useState<LocalProjectState>({
    project: null,
    files: [],
    fileTree: [],
    loading: false,
  });

  const selectProject = useCallback(async (projectId: string) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const projects = await projectFiles.listProjects();
      const project = projects.find((p) => p.id === projectId) ?? null;
      if (!project) {
        setState({ project: null, files: [], fileTree: [], loading: false });
        return;
      }
      const files = await projectFiles.readProjectFiles(projectId);
      const fileTree = files.map((f) => f.path);
      setState({ project, files, fileTree, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!state.project) return;
    setState((s) => ({ ...s, loading: true }));
    const files = await projectFiles.readProjectFiles(state.project!.id);
    const fileTree = files.map((f) => f.path);
    setState((s) => ({ ...s, files, fileTree, loading: false }));
  }, [state.project]);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (!state.project) return false;
    const ok = await projectFiles.writeFile(state.project.id, filePath, content);
    if (ok) await refreshFiles();
    return ok;
  }, [state.project, refreshFiles]);

  /** Monta o contexto do projeto para enviar à AI. */
  const buildContext = useCallback((): string => {
    if (!state.project || state.files.length === 0) return '';

    const lines: string[] = [
      `## Projeto Local: ${state.project.name}`,
      `## Arquivos (${state.files.length}):`,
      '',
    ];

    for (const file of state.files) {
      if (file.isDirectory) continue;
      lines.push(`### ${file.path}`);
      if (file.content.startsWith('[Arquivo binário')) {
        lines.push(file.content);
      } else {
        lines.push('```');
        lines.push(file.content);
        lines.push('```');
      }
      lines.push('');
    }

    return lines.join('\n');
  }, [state.project, state.files]);

  return {
    ...state,
    selectProject,
    refreshFiles,
    writeFile,
    buildContext,
  };
}
