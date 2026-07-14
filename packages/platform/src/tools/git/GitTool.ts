import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BaseTool } from '../BaseTool';
import type { ToolContext, ToolDefinition } from '../types';

const execAsync = promisify(exec);

export interface GitToolInput {
  operation: 'status' | 'add' | 'commit' | 'push' | 'pull' | 'diff' | 'log' | 'branch' | 'checkout' | 'clone' | 'fetch';
  cwd?: string;
  files?: string[];
  message?: string;
  branch?: string;
  remote?: string;
  url?: string;
  n?: number;
}

export interface GitToolOutput {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

export class GitTool extends BaseTool {
  readonly id = 'git';
  readonly name = 'Git';
  readonly version = '1.0.0';
  readonly description = 'Operações git: status, add, commit, push, pull, diff, log, branch, checkout, clone, fetch.';
  readonly category = 'git' as const;
  readonly capabilities = ['vcs', 'version-control'];

  readonly definition: ToolDefinition = {
    id: this.id,
    name: this.name,
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['status', 'add', 'commit', 'push', 'pull', 'diff', 'log', 'branch', 'checkout', 'clone', 'fetch'],
          description: 'Operação git a executar',
        },
        cwd: {
          type: 'string',
          description: 'Diretório do repositório (obrigatório para operações locais)',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arquivos para add (vazio = todos)',
        },
        message: {
          type: 'string',
          description: 'Mensagem do commit',
        },
        branch: {
          type: 'string',
          description: 'Nome da branch',
        },
        remote: {
          type: 'string',
          description: 'Nome do remote (padrão: origin)',
        },
        url: {
          type: 'string',
          description: 'URL do repositório para clone',
        },
        n: {
          type: 'number',
          description: 'Número de commits para log',
        },
      },
      required: ['operation'],
    },
  };

  async execute(input: unknown, context: ToolContext): Promise<GitToolOutput> {
    const req = input as GitToolInput;
    context.logger.info(`Git: ${req.operation}`);

    const cwd = req.cwd;

    switch (req.operation) {
      case 'status':
        return this.runGit('git status --short', cwd);
      case 'add':
        return this.runGit(`git add ${req.files?.length ? req.files.join(' ') : '.'}`, cwd);
      case 'commit':
        if (!req.message) return { success: false, error: 'Mensagem do commit obrigatória' };
        return this.runGit(`git commit -m "${req.message.replace(/"/g, '\\"')}"`, cwd);
      case 'push':
        return this.runGit(`git push ${req.remote ?? 'origin'} ${req.branch ?? ''}`.trim(), cwd);
      case 'pull':
        return this.runGit(`git pull ${req.remote ?? 'origin'} ${req.branch ?? ''}`.trim(), cwd);
      case 'diff':
        return this.runGit('git diff', cwd);
      case 'log':
        return this.runGit(`git log --oneline -n ${req.n ?? 10}`, cwd);
      case 'branch':
        return this.runGit('git branch -a', cwd);
      case 'checkout':
        if (!req.branch) return { success: false, error: 'Nome da branch obrigatório' };
        return this.runGit(`git checkout ${req.branch}`, cwd);
      case 'clone':
        if (!req.url) return { success: false, error: 'URL do repositório obrigatória' };
        return this.runGit(`git clone ${req.url}`, cwd ?? '.');
      case 'fetch':
        return this.runGit(`git fetch ${req.remote ?? 'origin'}`, cwd);
      default:
        return { success: false, error: `Operação desconhecida: ${req.operation}` };
    }
  }

  private async runGit(command: string, cwd?: string): Promise<GitToolOutput> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd ?? process.env.HOME ?? process.env.USERPROFILE ?? '.',
        timeout: 30_000,
        maxBuffer: 5 * 1024 * 1024,
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
        error: err.message,
      };
    }
  }
}

export function createGitTool(): GitTool {
  return new GitTool();
}
