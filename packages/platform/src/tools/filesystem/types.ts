/**
 * Tipos da FilesystemTool.
 *
 * Formato de entrada/saída desta Tool específica — não é o contrato do Tool
 * System (esse vive em `tools/types.ts`). Cada Tool concreta é livre para
 * definir seu próprio formato de `input`/`output`; quem chama sabe o que
 * está pedindo porque conhece o `toolId`.
 */

/** As 10 operações suportadas nesta Sprint. Nenhuma outra é aceita. */
export type FilesystemOperation =
  | 'readFile'
  | 'writeFile'
  | 'appendFile'
  | 'createDirectory'
  | 'listDirectory'
  | 'exists'
  | 'deleteFile'
  | 'moveFile'
  | 'copyFile'
  | 'stat';

/**
 * Entrada única para todas as operações — os campos usados variam por
 * `operation` (ver `FilesystemTool` para o que cada uma exige).
 */
export interface FilesystemToolInput {
  readonly operation: FilesystemOperation;
  readonly path: string;
  /** Destino — obrigatório em `moveFile`/`copyFile`. */
  readonly to?: string;
  /** Conteúdo — obrigatório em `writeFile`/`appendFile`. */
  readonly content?: string;
  /** Padrão: `utf-8`. */
  readonly encoding?: BufferEncoding;
  /** `createDirectory`: padrão `true` (cria pais ausentes). */
  readonly recursive?: boolean;
}

export interface DirectoryEntry {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
}

/** Saída — discriminada por `operation`, tipada por quem consome o resultado. */
export type FilesystemToolOutput =
  | { readonly operation: 'readFile'; readonly path: string; readonly content: string }
  | { readonly operation: 'writeFile'; readonly path: string; readonly bytesWritten: number }
  | { readonly operation: 'appendFile'; readonly path: string; readonly bytesWritten: number }
  | { readonly operation: 'createDirectory'; readonly path: string; readonly created: boolean }
  | { readonly operation: 'listDirectory'; readonly path: string; readonly entries: readonly DirectoryEntry[] }
  | { readonly operation: 'exists'; readonly path: string; readonly exists: boolean }
  | { readonly operation: 'deleteFile'; readonly path: string; readonly deleted: true }
  | { readonly operation: 'moveFile'; readonly path: string; readonly to: string }
  | { readonly operation: 'copyFile'; readonly path: string; readonly to: string }
  | {
      readonly operation: 'stat';
      readonly path: string;
      readonly size: number;
      readonly isDirectory: boolean;
      readonly isFile: boolean;
      readonly createdAt: string;
      readonly modifiedAt: string;
    };
