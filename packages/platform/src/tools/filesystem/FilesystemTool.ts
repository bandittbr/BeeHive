import { promises as fs } from 'node:fs';
import { BaseTool } from '../BaseTool';
import type { ToolCategory, ToolContext, ToolDefinition, ToolParameterSchema } from '../types';
import type { DirectoryEntry, FilesystemOperation, FilesystemToolInput, FilesystemToolOutput } from './types';

const OPERATIONS: readonly FilesystemOperation[] = [
  'readFile',
  'writeFile',
  'appendFile',
  'createDirectory',
  'listDirectory',
  'exists',
  'deleteFile',
  'moveFile',
  'copyFile',
  'stat',
];

// -------------------------- Definição (Sprint 20) ---------------------------
//
// Uma `FilesystemTool` só, uma `operation` por chamada (como `execute()` já
// funciona) — então `parameters` é UM schema (`type:'object'`, com
// `operation`+`path` sempre presentes) que usa `oneOf` para dar a cada
// operação seu próprio formato exato (campos extras/obrigatórios), em vez de
// uma ToolDefinition por operação. Isso combina com o resto do Tool System,
// que já endereça esta Tool por um único `toolId: 'filesystem'`.

const PATH_PARAM: ToolParameterSchema = {
  type: 'string',
  description: 'Caminho absoluto do arquivo ou diretório.',
};

const TO_PARAM: ToolParameterSchema = {
  type: 'string',
  description: 'Caminho absoluto de destino.',
};

const CONTENT_PARAM: ToolParameterSchema = {
  type: 'string',
  description: 'Conteúdo a escrever/acrescentar no arquivo.',
};

const ENCODING_PARAM: ToolParameterSchema = {
  type: 'string',
  description: 'Codificação do arquivo. Padrão: utf-8.',
  enum: ['utf-8', 'utf8', 'ascii', 'base64', 'hex', 'latin1'],
};

const RECURSIVE_PARAM: ToolParameterSchema = {
  type: 'boolean',
  description: 'Cria diretórios pais ausentes. Padrão: true.',
};

/** Um branch do `oneOf` — schema completo de UMA operação (Sprint 20). */
function operationSchema(
  operation: FilesystemOperation,
  extraProperties: Readonly<Record<string, ToolParameterSchema>>,
  extraRequired: readonly string[],
): ToolParameterSchema {
  return {
    type: 'object',
    description: `Parâmetros de filesystem.${operation}.`,
    properties: {
      operation: { type: 'string', enum: [operation] },
      path: PATH_PARAM,
      ...extraProperties,
    },
    required: ['operation', 'path', ...extraRequired],
  };
}

const FILESYSTEM_DEFINITION: ToolDefinition = {
  id: 'filesystem',
  name: 'Filesystem',
  description:
    'Leitura, escrita e gestão de arquivos/diretórios. Uma operação por chamada, indicada em "operation".',
  capabilities: OPERATIONS,
  parameters: {
    type: 'object',
    description: 'Uma operação de filesystem — o schema exato depende de "operation" (ver "oneOf").',
    properties: {
      operation: { type: 'string', enum: [...OPERATIONS] },
      path: PATH_PARAM,
    },
    required: ['operation', 'path'],
    oneOf: [
      operationSchema('readFile', { encoding: ENCODING_PARAM }, []),
      operationSchema('writeFile', { content: CONTENT_PARAM, encoding: ENCODING_PARAM }, ['content']),
      operationSchema('appendFile', { content: CONTENT_PARAM, encoding: ENCODING_PARAM }, ['content']),
      operationSchema('createDirectory', { recursive: RECURSIVE_PARAM }, []),
      operationSchema('listDirectory', {}, []),
      operationSchema('exists', {}, []),
      operationSchema('deleteFile', {}, []),
      operationSchema('moveFile', { to: TO_PARAM }, ['to']),
      operationSchema('copyFile', { to: TO_PARAM }, ['to']),
      operationSchema('stat', {}, []),
    ],
  },
};

/**
 * FilesystemTool — a primeira Tool real do BeeHive.
 *
 * Implementa o contrato `Tool` (Sprint 11) integralmente: `initialize()`
 * (herdado de `BaseTool`), `execute()`, `health()`/`status()` (herdados) e
 * `dispose()` (herdado — nenhum recurso próprio para liberar). Usa SOMENTE
 * `node:fs/promises` — nenhuma dependência externa.
 *
 * É a REFERÊNCIA para toda Tool futura (Terminal, Git, Browser, Python):
 *   - uma `operation` por chamada, roteada por um `switch` interno;
 *   - entrada validada localmente (`parseInput`) — a Tool nunca confia cegamente
 *     no `input: unknown` que recebe;
 *   - toda falha é um `throw` — o `ToolManager` (não alterado) converte em
 *     `ToolResponse{success:false}`, loga e emite `ToolFailed` sozinho;
 *   - toda chamada é uma operação de I/O independente — sem estado
 *     compartilhado entre execuções, sem cache, sem lock.
 *
 * Ninguém deve importar `node:fs` fora daqui: esta Tool é o único ponto de
 * acesso ao filesystem do sistema. Executada exclusivamente via
 * `ToolManager.execute({ toolId: 'filesystem', ... })`.
 */
export class FilesystemTool extends BaseTool {
  readonly id = 'filesystem';
  readonly name = 'Filesystem';
  readonly version = '0.1.0';
  readonly description =
    'Leitura, escrita e gestão de arquivos/diretórios usando apenas APIs nativas do Node (fs/promises).';
  readonly category: ToolCategory = 'filesystem';
  readonly capabilities: readonly string[] = OPERATIONS;
  readonly definition: ToolDefinition = FILESYSTEM_DEFINITION;

  async execute(input: unknown, context: ToolContext): Promise<FilesystemToolOutput> {
    const request = this.parseInput(input);
    context.logger.debug(`Filesystem: ${request.operation}`, { path: request.path });

    switch (request.operation) {
      case 'readFile':
        return this.readFile(request);
      case 'writeFile':
        return this.writeFile(request);
      case 'appendFile':
        return this.appendFile(request);
      case 'createDirectory':
        return this.createDirectory(request);
      case 'listDirectory':
        return this.listDirectory(request);
      case 'exists':
        return this.exists(request);
      case 'deleteFile':
        return this.deleteFile(request);
      case 'moveFile':
        return this.moveFile(request);
      case 'copyFile':
        return this.copyFile(request);
      case 'stat':
        return this.stat(request);
    }
  }

  // -------------------------------- Operações ---------------------------------

  private async readFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const content = await fs.readFile(request.path, { encoding: request.encoding ?? 'utf-8' });
    return { operation: 'readFile', path: request.path, content };
  }

  private async writeFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const content = this.requireContent(request, 'writeFile');
    const encoding = request.encoding ?? 'utf-8';
    await fs.writeFile(request.path, content, { encoding });
    return { operation: 'writeFile', path: request.path, bytesWritten: Buffer.byteLength(content, encoding) };
  }

  private async appendFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const content = this.requireContent(request, 'appendFile');
    const encoding = request.encoding ?? 'utf-8';
    await fs.appendFile(request.path, content, { encoding });
    return { operation: 'appendFile', path: request.path, bytesWritten: Buffer.byteLength(content, encoding) };
  }

  private async createDirectory(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const firstCreated = await fs.mkdir(request.path, { recursive: request.recursive ?? true });
    return { operation: 'createDirectory', path: request.path, created: firstCreated !== undefined };
  }

  private async listDirectory(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const dirents = await fs.readdir(request.path, { withFileTypes: true });
    const entries: DirectoryEntry[] = dirents.map((dirent) => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory(),
      isFile: dirent.isFile(),
    }));
    return { operation: 'listDirectory', path: request.path, entries };
  }

  private async exists(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const found = await fs
      .access(request.path)
      .then(() => true)
      .catch(() => false);
    return { operation: 'exists', path: request.path, exists: found };
  }

  private async deleteFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    await fs.unlink(request.path);
    return { operation: 'deleteFile', path: request.path, deleted: true };
  }

  private async moveFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const to = this.requireTo(request, 'moveFile');
    await fs.rename(request.path, to);
    return { operation: 'moveFile', path: request.path, to };
  }

  private async copyFile(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const to = this.requireTo(request, 'copyFile');
    await fs.copyFile(request.path, to);
    return { operation: 'copyFile', path: request.path, to };
  }

  private async stat(request: FilesystemToolInput): Promise<FilesystemToolOutput> {
    const info = await fs.stat(request.path);
    return {
      operation: 'stat',
      path: request.path,
      size: info.size,
      isDirectory: info.isDirectory(),
      isFile: info.isFile(),
      createdAt: info.birthtime.toISOString(),
      modifiedAt: info.mtime.toISOString(),
    };
  }

  // -------------------------------- Validação ---------------------------------

  private parseInput(input: unknown): FilesystemToolInput {
    const value = input as Partial<FilesystemToolInput> | null | undefined;
    if (!value || typeof value !== 'object') {
      throw new Error('FilesystemTool: entrada inválida (esperado um objeto com "operation" e "path").');
    }
    if (!value.operation || !OPERATIONS.includes(value.operation)) {
      throw new Error(`FilesystemTool: operação desconhecida "${String(value.operation)}".`);
    }
    if (!value.path || typeof value.path !== 'string') {
      throw new Error('FilesystemTool: "path" é obrigatório e deve ser uma string.');
    }
    return value as FilesystemToolInput;
  }

  private requireContent(request: FilesystemToolInput, operation: string): string {
    if (request.content === undefined) {
      throw new Error(`FilesystemTool.${operation}: "content" é obrigatório.`);
    }
    return request.content;
  }

  private requireTo(request: FilesystemToolInput, operation: string): string {
    if (!request.to) {
      throw new Error(`FilesystemTool.${operation}: "to" é obrigatório.`);
    }
    return request.to;
  }
}

/** Fábrica — o padrão já usado pelos demais componentes injetáveis do Kernel/AI Layer. */
export function createFilesystemTool(): FilesystemTool {
  return new FilesystemTool();
}
