import { useCallback, useEffect, useRef, useState } from 'react';
import { streamContentPlan, streamPosts } from '@/services/business/businessService';

/**
 * Estado da Área Business — Projetos persistidos no navegador (localStorage).
 *
 * Um Projeto é a unidade central do BeeHive: um negócio digital com nicho e
 * marca. Os agentes (estrategista e redator) geram artefatos em streaming,
 * salvos no próprio Projeto.
 */
export interface Project {
  id: string;
  name: string;
  niche: string;
  brand: string;
  description: string;
  contentPlan: string;
  posts: string;
  imagePrompt: string;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface NewProjectInput {
  name: string;
  niche: string;
  brand: string;
  description: string;
}

export type GenerationKind = 'plan' | 'posts';

export interface Generation {
  id: string;
  kind: GenerationKind;
}

const STORAGE_KEY = 'beehive.projects.v1';

let seq = 0;
const newId = () => `proj-${Date.now()}-${seq++}`;

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      if (Array.isArray(parsed)) {
        // Compatibilidade: projetos antigos podem não ter o campo posts.
        return parsed.map((p) => ({
          ...p,
          posts: p.posts ?? '',
          imagePrompt: p.imagePrompt ?? '',
          imageUrl: p.imageUrl ?? '',
        }));
      }
    }
  } catch {
    // Sem persistência: começa vazio.
  }
  return [];
}

export function useBusiness() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [generating, setGenerating] = useState<Generation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignora
    }
  }, [projects]);

  const patchProject = (id: string, patch: (p: Project) => Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch(p), updatedAt: Date.now() } : p)),
    );
  };

  const createProject = useCallback((input: NewProjectInput): string => {
    const id = newId();
    const now = Date.now();
    const project: Project = {
      id,
      name: input.name.trim(),
      niche: input.niche.trim(),
      brand: input.brand.trim(),
      description: input.description.trim(),
      contentPlan: '',
      posts: '',
      imagePrompt: '',
      imageUrl: '',
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [project, ...prev]);
    return id;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const runGeneration = (
    id: string,
    kind: GenerationKind,
    field: 'contentPlan' | 'posts',
    start: (
      handlers: { onDelta: (t: string) => void; onError: (m: string) => void },
      signal: AbortSignal,
    ) => Promise<void>,
  ) => {
    patchProject(id, () => ({ [field]: '' }));
    setGenerating({ id, kind });
    const controller = new AbortController();
    abortRef.current = controller;

    void start(
      {
        onDelta: (chunk) => patchProject(id, (p) => ({ [field]: p[field] + chunk })),
        onError: (message) => patchProject(id, () => ({ [field]: `⚠️ ${message}` })),
      },
      controller.signal,
    ).finally(() => {
      setGenerating((current) => (current && current.id === id && current.kind === kind ? null : current));
      abortRef.current = null;
    });
  };

  const generatePlan = useCallback((id: string, niche: string, brand: string) => {
    runGeneration(id, 'plan', 'contentPlan', (handlers, signal) =>
      streamContentPlan({ niche, brand }, handlers, signal),
    );
  }, []);

  const generatePosts = useCallback(
    (id: string, niche: string, brand: string, plan: string) => {
      runGeneration(id, 'posts', 'posts', (handlers, signal) =>
        streamPosts({ niche, brand, plan }, handlers, signal),
      );
    },
    [],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const setProjectImage = useCallback((id: string, imagePrompt: string, imageUrl: string) => {
    patchProject(id, () => ({ imagePrompt, imageUrl }));
  }, []);

  return {
    projects,
    generating,
    createProject,
    deleteProject,
    generatePlan,
    generatePosts,
    stopGeneration,
    setProjectImage,
  };
}
