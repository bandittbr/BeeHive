import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EventBus, Logger } from '../../kernel';
import { ToolManager } from '../ToolManager';
import { ToolRegistry } from '../ToolRegistry';
import { createFilesystemTool, FilesystemTool } from './FilesystemTool';
import type { FilesystemToolOutput } from './types';

type OutputOf<Op extends FilesystemToolOutput['operation']> = Extract<FilesystemToolOutput, { operation: Op }>;

/**
 * Testes da FilesystemTool (Sprint 15.0) — a primeira Tool real do BeeHive.
 *
 * Rodam pelo caminho oficial — `ToolManager.execute({toolId:'filesystem',...})`
 * — para provar a mesma coisa que qualquer chamador real vai depender: registro
 * automático, ciclo de vida (`Available`), eventos (`ToolExecuted`/`ToolFailed`)
 * e `ToolResponse` padronizado, tudo fornecido pelo `ToolManager` já existente
 * (não alterado). Cada teste usa um diretório temporário isolado
 * (`os.tmpdir()`), limpo ao final.
 */

async function makeManager(): Promise<{ manager: ToolManager; events: EventBus }> {
  const events = new EventBus();
  const logger = new Logger('test');
  const registry = new ToolRegistry();
  const manager = new ToolManager({ registry, logger, events });
  await manager.load([createFilesystemTool()]);
  return { manager, events };
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'beehive-fs-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('Registro automático — FilesystemTool fica Available após manager.load()', async () => {
  const { manager } = await makeManager();

  assert.equal(manager.has('filesystem'), true);
  const snapshot = manager.get('filesystem');
  assert.equal(snapshot?.state, 'Available');
  assert.equal(snapshot?.category, 'filesystem');
  assert.deepEqual(
    [...snapshot!.capabilities].sort(),
    [
      'appendFile',
      'copyFile',
      'createDirectory',
      'deleteFile',
      'exists',
      'listDirectory',
      'moveFile',
      'readFile',
      'stat',
      'writeFile',
    ].sort(),
  );
});

test('Leitura — readFile devolve o conteúdo de um arquivo existente', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const filePath = path.join(dir, 'ola.txt');
    await fs.writeFile(filePath, 'olá, beehive', 'utf-8');

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'readFile', path: filePath },
    });

    assert.equal(response.success, true);
    assert.equal(response.output?.operation, 'readFile');
    assert.equal((response.output as OutputOf<'readFile'>).content, 'olá, beehive');
  });
});

test('Escrita — writeFile cria o arquivo com o conteúdo dado', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const filePath = path.join(dir, 'novo.txt');

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'writeFile', path: filePath, content: 'conteúdo inicial' },
    });

    assert.equal(response.success, true);
    assert.equal((response.output as OutputOf<'writeFile'>).bytesWritten, Buffer.byteLength('conteúdo inicial'));
    assert.equal(await fs.readFile(filePath, 'utf-8'), 'conteúdo inicial');
  });
});

test('Diretórios — createDirectory + listDirectory enxergam o que foi criado', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const nested = path.join(dir, 'a', 'b', 'c');

    const created = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'createDirectory', path: nested },
    });
    assert.equal(created.success, true);
    assert.equal((created.output as OutputOf<'createDirectory'>).created, true);

    await fs.writeFile(path.join(nested, 'um.txt'), '1', 'utf-8');
    await fs.mkdir(path.join(nested, 'subpasta'));

    const listed = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'listDirectory', path: nested },
    });
    assert.equal(listed.success, true);
    const entries = (listed.output as OutputOf<'listDirectory'>).entries;
    assert.deepEqual(
      entries.map((e) => e.name).sort(),
      ['subpasta', 'um.txt'],
    );
    assert.equal(entries.find((e) => e.name === 'um.txt')?.isFile, true);
    assert.equal(entries.find((e) => e.name === 'subpasta')?.isDirectory, true);
  });
});

test('Arquivo inexistente — readFile devolve ToolResponse{success:false}, sem lançar para fora', async () => {
  await withTempDir(async (dir) => {
    const { manager, events } = await makeManager();
    const failures: unknown[] = [];
    events.on('ToolFailed', (event) => failures.push(event.payload));

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'readFile', path: path.join(dir, 'nao-existe.txt') },
    });

    assert.equal(response.success, false);
    assert.match(response.error ?? '', /ENOENT/);
    // ToolManager (não alterado) já emite o evento sozinho — a Tool não precisa.
    assert.equal(failures.length, 1);
  });
});

test('Sobrescrita — escrever de novo substitui o conteúdo anterior', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const filePath = path.join(dir, 'sobrescrito.txt');

    await manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: filePath, content: 'v1' } });
    await manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: filePath, content: 'v2' } });

    assert.equal(await fs.readFile(filePath, 'utf-8'), 'v2');
  });
});

test('Cópia — copyFile duplica o conteúdo e preserva o original', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const original = path.join(dir, 'original.txt');
    const copia = path.join(dir, 'copia.txt');
    await fs.writeFile(original, 'copie-me', 'utf-8');

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'copyFile', path: original, to: copia },
    });

    assert.equal(response.success, true);
    assert.equal(await fs.readFile(original, 'utf-8'), 'copie-me');
    assert.equal(await fs.readFile(copia, 'utf-8'), 'copie-me');
  });
});

test('Movimentação — moveFile move o conteúdo e o caminho original deixa de existir', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const original = path.join(dir, 'mover-de.txt');
    const destino = path.join(dir, 'mover-para.txt');
    await fs.writeFile(original, 'mudando de casa', 'utf-8');

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'moveFile', path: original, to: destino },
    });
    assert.equal(response.success, true);

    const existsOriginal = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'exists', path: original },
    });
    assert.equal((existsOriginal.output as OutputOf<'exists'>).exists, false);
    assert.equal(await fs.readFile(destino, 'utf-8'), 'mudando de casa');
  });
});

test('Remoção — deleteFile apaga o arquivo', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const filePath = path.join(dir, 'apagar.txt');
    await fs.writeFile(filePath, 'efêmero', 'utf-8');

    const response = await manager.execute<unknown, FilesystemToolOutput>({
      toolId: 'filesystem',
      input: { operation: 'deleteFile', path: filePath },
    });
    assert.equal(response.success, true);

    await assert.rejects(() => fs.access(filePath));
  });
});

test('Concorrência simples — escritas paralelas em arquivos diferentes não se corrompem', async () => {
  await withTempDir(async (dir) => {
    // Direto na Tool (não pelo ToolManager): isola o comportamento de I/O
    // concorrente da própria FilesystemTool, sem o gate de serialização do
    // ToolManager (ver teste seguinte) atravessar o resultado.
    const tool: FilesystemTool = createFilesystemTool();
    await tool.initialize({ logger: new Logger('test') });

    const files = Array.from({ length: 10 }, (_, i) => path.join(dir, `arquivo-${i}.txt`));
    const context = { requestId: 'concorrencia', toolId: 'filesystem', logger: new Logger('test') };

    await Promise.all(
      files.map((filePath, i) => tool.execute({ operation: 'writeFile', path: filePath, content: `conteudo-${i}` }, context)),
    );

    const contents = await Promise.all(files.map((filePath) => fs.readFile(filePath, 'utf-8')));
    contents.forEach((content, i) => assert.equal(content, `conteudo-${i}`));
  });
});

test('Concorrência via ToolManager — chamadas sobrepostas na MESMA Tool são serializadas (Busy), não corrompidas', async () => {
  await withTempDir(async (dir) => {
    const { manager } = await makeManager();
    const fileA = path.join(dir, 'a.txt');
    const fileB = path.join(dir, 'b.txt');

    // Duas chamadas disparadas sem aguardar a primeira: o ToolManager (não
    // alterado) marca a Tool como "Busy" de forma síncrona antes do primeiro
    // `await` interno — a segunda chamada, ainda síncrona no mesmo tick, vê
    // "Busy" e é recusada. Não é corrupção de dados: é uma recusa explícita,
    // com `ToolResponse{success:false}` — a Tool nunca chega a rodar duas
    // vezes ao mesmo tempo, porque o Manager não permite.
    const p1 = manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: fileA, content: 'A' } });
    const p2 = manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: fileB, content: 'B' } });

    const [r1, r2] = await Promise.all([p1, p2]);
    const results = [r1, r2];

    assert.equal(results.filter((r) => r.success).length, 1);
    assert.equal(
      results.filter((r) => !r.success && /indisponível/i.test(r.error ?? '')).length,
      1,
    );

    // Chamadas sequenciais (aguardando cada uma) sempre funcionam — é o uso correto.
    const seqA = await manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: fileA, content: 'A2' } });
    const seqB = await manager.execute({ toolId: 'filesystem', input: { operation: 'writeFile', path: fileB, content: 'B2' } });
    assert.equal(seqA.success, true);
    assert.equal(seqB.success, true);
    assert.equal(await fs.readFile(fileA, 'utf-8'), 'A2');
    assert.equal(await fs.readFile(fileB, 'utf-8'), 'B2');
  });
});

/**
 * Testes da infraestrutura de definições de Tool (Sprint 20): toda Tool
 * expõe `definition: ToolDefinition` (JSON Schema), o `ToolRegistry` e o
 * `ToolManager` expõem `definitions()` para o `AIManager` popular
 * `AIRequest.tools` automaticamente (ver `ai/AIManager.test.ts`).
 */

test('FilesystemTool.definition — consistente: id/capabilities batem, cada operação tem seu branch em "oneOf"', () => {
  const tool = createFilesystemTool();
  const definition = tool.definition;

  assert.equal(definition.id, 'filesystem');
  assert.equal(definition.name, 'Filesystem');
  assert.equal(typeof definition.description, 'string');
  assert.ok(definition.description.length > 0);

  // As `capabilities` da Tool (10 operações) são exatamente as mesmas do
  // catálogo exposto na definição — a IA não vê uma lista diferente da que
  // a Tool realmente aceita.
  assert.deepEqual([...(definition.capabilities ?? [])].sort(), [...tool.capabilities].sort());

  assert.equal(definition.parameters.type, 'object');
  assert.equal(definition.parameters.required?.includes('operation'), true);
  assert.equal(definition.parameters.required?.includes('path'), true);

  // Uma entrada em "oneOf" por operação, cada uma com seu próprio schema.
  const oneOf = definition.parameters.oneOf ?? [];
  assert.equal(oneOf.length, tool.capabilities.length);
  const operationsInOneOf = oneOf.map((branch) => branch.properties?.operation?.enum?.[0]);
  assert.deepEqual([...operationsInOneOf].sort(), [...tool.capabilities].sort());

  // writeFile/appendFile exigem "content"; moveFile/copyFile exigem "to".
  const writeFileBranch = oneOf.find((b) => b.properties?.operation?.enum?.[0] === 'writeFile');
  assert.equal(writeFileBranch?.required?.includes('content'), true);
  const moveFileBranch = oneOf.find((b) => b.properties?.operation?.enum?.[0] === 'moveFile');
  assert.equal(moveFileBranch?.required?.includes('to'), true);
  // readFile não exige nem "content" nem "to" — só operation/path (herdados).
  const readFileBranch = oneOf.find((b) => b.properties?.operation?.enum?.[0] === 'readFile');
  assert.equal(readFileBranch?.required?.includes('content'), false);
  assert.equal(readFileBranch?.required?.includes('to'), false);
});

test('ToolRegistry.definitions() — devolve a ToolDefinition de cada Tool registrada', () => {
  const registry = new ToolRegistry();
  const tool = createFilesystemTool();
  registry.register(tool);

  const definitions = registry.definitions();

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0], tool.definition);
  assert.equal(definitions[0].id, 'filesystem');
});

test('ToolRegistry.definitions() — vazio quando nenhuma Tool está registrada', () => {
  const registry = new ToolRegistry();
  assert.deepEqual(registry.definitions(), []);
});

test('ToolManager.definitions() — delega ao Registry (as mesmas ToolDefinition, na mesma ordem)', async () => {
  const { manager } = await makeManager();

  const definitions = manager.definitions();

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].id, 'filesystem');
  assert.equal(definitions[0].name, 'Filesystem');
  assert.ok(Array.isArray(definitions[0].parameters.oneOf));
});
