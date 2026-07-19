export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  command: string;
  cwd: string;
}

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
}