// Contrato de jobs entre o orquestrador (frontend) e o worker (nuvem).
// Mantido simples e estável: o orquestrador despacha um Job, o worker executa
// e emite JobEvents (stdout/stderr/status) via SSE.

export type JobType =
  | 'shell' // executar comando no terminal
  | 'writeFile' // escrever arquivo
  | 'readFile' // ler arquivo
  | 'git' // comando git (clone/commit/push...)
  | 'browser'; // automação de navegador (Playwright)

export interface JobRequest {
  type: JobType;
  /** diretório de trabalho relativo ao workspace do worker (opcional) */
  cwd?: string;
  payload: Record<string, unknown>;
  /** rótulo humano da etapa (para logs/UI) */
  label?: string;
}

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface JobEvent {
  jobId: string;
  kind: 'status' | 'stdout' | 'stderr' | 'result';
  status?: JobStatus;
  data?: string;
  /** resultado estruturado quando kind === 'result' */
  result?: unknown;
  ts: number;
}

export interface JobRecord {
  id: string;
  request: JobRequest;
  status: JobStatus;
  createdAt: number;
  finishedAt?: number;
  exitCode?: number;
  output: string; // stdout+stderr acumulados
  result?: unknown;
  error?: string;
}
