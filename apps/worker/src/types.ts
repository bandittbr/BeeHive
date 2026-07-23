// Contrato de jobs entre o orquestrador (frontend) e o worker (nuvem).

export type JobType =
  | 'shell'
  | 'writeFile'
  | 'readFile'
  | 'git'
  | 'browser'
  | 'ytFetch'
  | 'clip'
  | 'publishYoutube'
  | 'publishInstagram'
  | 'publishFacebook';

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
  output: string;
  result?: unknown;
  error?: string;
}
