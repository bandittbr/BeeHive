/**
 * ProjectStoreProvider — provedor do estado de projetos.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getProjectService } from './projectService';
import { ProjectStoreContext, type ProjectStore } from './projectStore';
import type { Project, ProjectFile, ProjectSettings } from './types';

export function ProjectStoreProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = getProjectService();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allSettings = await service.getSettings();
      setSettings(allSettings);
      setProjects(allSettings.projects);

      if (allSettings.activeProjectId) {
        const active = allSettings.projects.find((p) => p.id === allSettings.activeProjectId);
        setActiveProjectState(active ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const addProject = useCallback(
    async (path: string, name?: string) => {
      setError(null);
      try {
        const project = await service.addProject(path, name);
        setProjects((prev) => [...prev, project]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao adicionar projeto');
        throw err;
      }
    },
    [service],
  );

  const removeProject = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await service.removeProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeProject?.id === id) {
          setActiveProjectState(null);
          setFiles([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao remover projeto');
      }
    },
    [service, activeProject],
  );

  const setActiveProject = useCallback(
    async (id: string | null) => {
      setError(null);
      try {
        await service.setActiveProject(id);
        if (id) {
          const project = projects.find((p) => p.id === id);
          setActiveProjectState(project ?? null);
          if (project) {
            const projectFiles = await service.listFiles(id);
            setFiles(projectFiles);
          }
        } else {
          setActiveProjectState(null);
          setFiles([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao definir projeto ativo');
      }
    },
    [service, projects],
  );

  const loadFiles = useCallback(
    async (subPath?: string) => {
      if (!activeProject) return;
      setError(null);
      try {
        const projectFiles = await service.listFiles(activeProject.id, subPath);
        setFiles(projectFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao listar arquivos');
      }
    },
    [service, activeProject],
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      setError(null);
      try {
        const updated = await service.updateProject(id, data);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (activeProject?.id === id) {
          setActiveProjectState(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar projeto');
      }
    },
    [service, activeProject],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const store = useMemo<ProjectStore>(
    () => ({
      projects,
      activeProject,
      files,
      settings,
      loading,
      error,
      loadProjects,
      addProject,
      removeProject,
      setActiveProject,
      loadFiles,
      updateProject,
    }),
    [
      projects,
      activeProject,
      files,
      settings,
      loading,
      error,
      loadProjects,
      addProject,
      removeProject,
      setActiveProject,
      loadFiles,
      updateProject,
    ],
  );

  return (
    <ProjectStoreContext.Provider value={store}>
      {children}
    </ProjectStoreContext.Provider>
  );
}
