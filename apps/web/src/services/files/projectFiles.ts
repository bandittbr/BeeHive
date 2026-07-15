/**
 * ProjectFiles — gerencia acesso a arquivos locais do PC via File System Access API.
 *
 * Armazena os DirectoryHandles no IndexedDB para persistir entre refreshes.
 * Permite ler, escrever, listar e navegar arquivos do projeto selecionado.
 *
 * Requer Chrome 86+ ou Edge 86+.
 */

const DB_NAME = 'beehive.projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export interface ProjectEntry {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  mode: 'local' | 'server';
  createdAt: number;
}

/** Arquivo lido do disco local. */
export interface LocalFile {
  path: string;
  name: string;
  content: string;
  size: number;
  isDirectory: boolean;
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<ProjectEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ProjectEntry[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(entry: ProjectEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build',
  '.cache', '__pycache__', '.vscode', '.idea', '.DS_Store',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html',
  '.md', '.txt', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp',
  '.h', '.hpp', '.sh', '.bash', '.zsh', '.yml', '.yaml', '.toml',
  '.env', '.env.local', '.gitignore', '.dockerignore', 'Dockerfile',
  '.vue', '.svelte', '.astro', '.sql', '.graphql', '.prisma',
]);

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (TEXT_EXTENSIONS.has(lower)) return true;
  // Arquivos sem extensão que são comumente texto
  if (!lower.includes('.')) {
    const plain = ['makefile', 'dockerfile', 'readme', 'license', 'gemfile', 'procfile'];
    return plain.some((p) => lower === p);
  }
  return false;
}

async function readDirRecursive(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
  results: LocalFile[],
  maxDepth: number = 10,
): Promise<void> {
  if (maxDepth <= 0) return;

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'directory') {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      const subHandle = await dirHandle.getDirectoryHandle(entry.name);
      await readDirRecursive(subHandle, subPath, results, maxDepth - 1);
    } else if (entry.kind === 'file') {
      if (entry.name === '.DS_Store') continue;
      const filePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      try {
        const fileHandle = await dirHandle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();

        if (isTextFile(entry.name) && file.size < 500_000) {
          const content = await file.text();
          results.push({
            path: filePath,
            name: entry.name,
            content,
            size: file.size,
            isDirectory: false,
          });
        } else {
          results.push({
            path: filePath,
            name: entry.name,
            content: `[Arquivo binário: ${entry.name} — ${(file.size / 1024).toFixed(1)}KB]`,
            size: file.size,
            isDirectory: false,
          });
        }
      } catch {
        // Ignora arquivos inacessíveis
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ProjectFiles — singleton
// ---------------------------------------------------------------------------

class ProjectFilesService {
  private projects: Map<string, ProjectEntry> = new Map();
  private loaded = false;

  /** Carrega projetos do IndexedDB na inicialização. */
  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const entries = await dbGetAll();
      for (const entry of entries) {
        this.projects.set(entry.id, entry);
      }
    } catch {
      // IndexedDB indisponível — segue sem persistência
    }
    this.loaded = true;
  }

  /** Lista todos os projetos salvos. */
  async listProjects(): Promise<ProjectEntry[]> {
    await this.init();
    return Array.from(this.projects.values());
  }

  /** Salva um projeto novo. */
  async saveProject(entry: ProjectEntry): Promise<void> {
    this.projects.set(entry.id, entry);
    await dbPut(entry);
  }

  /** Remove um projeto. */
  async removeProject(id: string): Promise<void> {
    this.projects.set(id, undefined as any);
    this.projects.delete(id);
    await dbDelete(id);
  }

  /** Lê todos os arquivos de texto de um projeto. */
  async readProjectFiles(projectId: string): Promise<LocalFile[]> {
    const entry = this.projects.get(projectId);
    if (!entry || entry.mode !== 'local') return [];

    try {
      const perm = await (entry.handle as any).requestPermission({ mode: 'read' });
      if (perm !== 'granted') return [];
    } catch {
      return [];
    }

    const files: LocalFile[] = [];
    await readDirRecursive(entry.handle, '', files);
    return files;
  }

  /** Lê um arquivo específico. */
  async readFile(projectId: string, filePath: string): Promise<string | null> {
    const entry = this.projects.get(projectId);
    if (!entry || entry.mode !== 'local') return null;

    try {
      const parts = filePath.split('/');
      let current = entry.handle;
      for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i]);
      }
      const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      return null;
    }
  }

  /** Escreve (ou sobrescreve) um arquivo no projeto local. */
  async writeFile(projectId: string, filePath: string, content: string): Promise<boolean> {
    const entry = this.projects.get(projectId);
    if (!entry || entry.mode !== 'local') return false;

    try {
      const perm = await (entry.handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return false;

      const parts = filePath.split('/');
      let current = entry.handle;
      for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i], { create: true });
      }
      const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  /** Retorna a árvore de arquivos (paths) de um projeto. */
  async getFileTree(projectId: string): Promise<string[]> {
    const files = await this.readProjectFiles(projectId);
    return files.map((f) => f.path);
  }

  /** Verifica se um projeto local ainda tem permissão. */
  async checkPermission(projectId: string): Promise<boolean> {
    const entry = this.projects.get(projectId);
    if (!entry || entry.mode !== 'local') return false;

    try {
      const perm = await (entry.handle as any).queryPermission({ mode: 'read' });
      return perm === 'granted';
    } catch {
      return false;
    }
  }
}

/** Singleton — acesso global ao serviço de arquivos. */
export const projectFiles = new ProjectFilesService();
