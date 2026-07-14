import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { BaseTool } from '../BaseTool';
import type { ToolContext, ToolDefinition } from '../types';

const execAsync = promisify(exec);

export interface TerminalToolInput {
  operation: 'run' | 'runBackground' | 'listProcesses' | 'kill';
  command?: string;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  pid?: number;
}

export interface TerminalToolOutput {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  pid?: number;
  error?: string;
}

const BACKGROUND_PROCESSES = new Map<number, { process: ReturnType<typeof spawn>; output: string; stderr: string }>();

export class TerminalTool extends BaseTool {
  readonly id = 'terminal';
  readonly name = 'Terminal';
  readonly version = '1.0.0';
  readonly description = 'Executa comandos no terminal do servidor. Pode rodar comandos, processos em background, listar e matar processos.';
  readonly category = 'terminal' as const;
  readonly capabilities = ['shell', 'exec', 'background', 'processes'];

  readonly definition: ToolDefinition = {
    id: this.id,
    name: this.name,
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['run', 'runBackground', 'listProcesses', 'kill'],
          description: 'Operação: run (comando único), runBackground (long-running), listProcesses (ver processos), kill (matar processo)',
        },
        command: {
          type: 'string',
          description: 'Comando para executar (obrigatório para run/runBackground)',
        },
        cwd: {
          type: 'string',
          description: 'Diretório de trabalho (opcional, padrão: home do usuário)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout em ms para run (padrão: 60000)',
        },
        env: {
          type: 'object',
          description: 'Variáveis de ambiente extras',
        },
        pid: {
          type: 'number',
          description: 'PID do processo para operação kill',
        },
      },
      required: ['operation'],
    },
  };

  async execute(input: unknown, context: ToolContext): Promise<TerminalToolOutput> {
    const req = input as TerminalToolInput;
    context.logger.info(`Terminal: ${req.operation} ${req.command ?? ''}`);

    switch (req.operation) {
      case 'run':
        return this.runCommand(req, context);
      case 'runBackground':
        return this.runBackground(req, context);
      case 'listProcesses':
        return this.listProcesses();
      case 'kill':
        return this.killProcess(req.pid!);
      default:
        return { success: false, error: `Operação desconhecida: ${req.operation}` };
    }
  }

  private async runCommand(req: TerminalToolInput, _context: ToolContext): Promise<TerminalToolOutput> {
    if (!req.command) return { success: false, error: 'Comando obrigatório' };

    const timeout = req.timeout ?? 60_000;
    const cwd = req.cwd ?? process.env.HOME ?? process.env.USERPROFILE ?? '.';

    try {
      const { stdout, stderr } = await execAsync(req.command, {
        cwd,
        timeout,
        env: { ...process.env, ...req.env },
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        stdout: stdout.trim() || undefined,
        stderr: stderr.trim() || undefined,
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        stdout: err.stdout?.trim() || undefined,
        stderr: err.stderr?.trim() || undefined,
        exitCode: err.code ?? 1,
        error: err.killed ? `Comando excedeu timeout de ${timeout}ms` : err.message,
      };
    }
  }

  private async runBackground(req: TerminalToolInput, context: ToolContext): Promise<TerminalToolOutput> {
    if (!req.command) return { success: false, error: 'Comando obrigatório' };

    const cwd = req.cwd ?? process.env.HOME ?? process.env.USERPROFILE ?? '.';
    const proc = spawn(req.command, {
      cwd,
      env: { ...process.env, ...req.env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const id = randomBytes(4).readUInt32BE(0);
    const entry = { process: proc, output: '', stderr: '' };

    proc.stdout?.on('data', (data: Buffer) => { entry.output += data.toString(); });
    proc.stderr?.on('data', (data: Buffer) => { entry.stderr += data.toString(); });
    proc.on('exit', () => BACKGROUND_PROCESSES.delete(id));

    BACKGROUND_PROCESSES.set(id, entry);
    context.logger.info(`Terminal: background process spawned with pid ${proc.pid}`);

    return {
      success: true,
      pid: proc.pid,
      stdout: `Processo rodando em background (id interno: ${id}, pid: ${proc.pid})`,
    };
  }

  private async listProcesses(): Promise<TerminalToolOutput> {
    const procs = Array.from(BACKGROUND_PROCESSES.entries()).map(([id, entry]) => ({
      id,
      pid: entry.process.pid,
      running: !entry.process.killed,
      outputLines: entry.output.split('\n').length,
      stderrLines: entry.stderr.split('\n').length,
    }));

    return { success: true, stdout: JSON.stringify(procs, null, 2) };
  }

  private async killProcess(pid: number): Promise<TerminalToolOutput> {
    for (const [id, entry] of BACKGROUND_PROCESSES.entries()) {
      if (entry.process.pid === pid) {
        entry.process.kill('SIGTERM');
        BACKGROUND_PROCESSES.delete(id);
        return { success: true, stdout: `Processo ${pid} morto` };
      }
    }

    try {
      process.kill(pid, 'SIGTERM');
      return { success: true, stdout: `Sinal SIGTERM enviado para PID ${pid}` };
    } catch {
      return { success: false, error: `Não foi possível matar PID ${pid}` };
    }
  }
}

export function createTerminalTool(): TerminalTool {
  return new TerminalTool();
}
