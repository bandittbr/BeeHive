import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationMemory } from './ConversationMemory';

/**
 * Testes da Sprint 18 — `ConversationMemory`: armazenamento em RAM do
 * histórico de cada conversa, por `conversationId`. Cobre as responsabilidades
 * pedidas: criação, adicionar mensagem, recuperar histórico, múltiplas
 * conversas simultâneas, limite (FIFO), limpeza e ordem cronológica.
 */

test('Criação de conversa — a primeira mensagem cria a conversa (createdAt = updatedAt)', async () => {
  const memory = new ConversationMemory();

  assert.equal(await memory.count('conv-1'), 0);
  assert.equal((await memory.history('conv-1')).length, 0);
  assert.equal(await memory.snapshot('conv-1'), undefined);

  await memory.append('conv-1', { role: 'user', content: 'oi', timestamp: 1000 });

  const snapshot = await memory.snapshot('conv-1');
  assert.ok(snapshot);
  assert.equal(snapshot?.conversationId, 'conv-1');
  assert.equal(snapshot?.createdAt, snapshot?.updatedAt);
  assert.equal(snapshot?.messages.length, 1);
});

test('Adicionar mensagem — append() acrescenta preservando role/content/timestamp', async () => {
  const memory = new ConversationMemory();

  await memory.append('conv-1', { role: 'user', content: 'oi', timestamp: 1000 });
  await memory.append('conv-1', { role: 'assistant', content: 'Olá!', timestamp: 2000 });

  const history = await memory.history('conv-1');
  assert.deepEqual(history, [
    { role: 'user', content: 'oi', timestamp: 1000 },
    { role: 'assistant', content: 'Olá!', timestamp: 2000 },
  ]);
});

test('Recuperar histórico — history() de uma conversa sem mensagens devolve []', async () => {
  const memory = new ConversationMemory();
  assert.deepEqual(await memory.history('nunca-existiu'), []);
});

test('Listar quantidade de mensagens — count() reflete o total guardado', async () => {
  const memory = new ConversationMemory();
  assert.equal(await memory.count('conv-1'), 0);

  await memory.append('conv-1', { role: 'user', content: 'a', timestamp: 1 });
  assert.equal(await memory.count('conv-1'), 1);

  await memory.append('conv-1', { role: 'assistant', content: 'b', timestamp: 2 });
  assert.equal(await memory.count('conv-1'), 2);
});

test('Múltiplas conversas simultâneas — cada conversationId tem histórico isolado', async () => {
  const memory = new ConversationMemory();

  await memory.append('conv-A', { role: 'user', content: 'mensagem A1', timestamp: 1 });
  await memory.append('conv-B', { role: 'user', content: 'mensagem B1', timestamp: 1 });
  await memory.append('conv-A', { role: 'assistant', content: 'resposta A1', timestamp: 2 });

  const historyA = await memory.history('conv-A');
  const historyB = await memory.history('conv-B');

  assert.equal(historyA.length, 2);
  assert.equal(historyB.length, 1);
  assert.equal(historyA[0].content, 'mensagem A1');
  assert.equal(historyB[0].content, 'mensagem B1');
  // Mexer em uma não vaza pra outra.
  assert.equal(await memory.count('conv-A'), 2);
  assert.equal(await memory.count('conv-B'), 1);
});

test('Limite de histórico — acima do limite, descarta as mais antigas (FIFO), sem resumir', async () => {
  const memory = new ConversationMemory({ maxMessages: 3 });

  for (let i = 1; i <= 5; i++) {
    await memory.append('conv-1', { role: 'user', content: `msg-${i}`, timestamp: i });
  }

  const history = await memory.history('conv-1');
  assert.equal(history.length, 3);
  // As duas primeiras (msg-1, msg-2) foram descartadas — sobram as 3 últimas.
  assert.deepEqual(
    history.map((m) => m.content),
    ['msg-3', 'msg-4', 'msg-5'],
  );
});

test('Limite de histórico — valor padrão é 30 mensagens', async () => {
  const memory = new ConversationMemory();

  for (let i = 1; i <= 35; i++) {
    await memory.append('conv-1', { role: 'user', content: `msg-${i}`, timestamp: i });
  }

  const history = await memory.history('conv-1');
  assert.equal(history.length, 30);
  assert.equal(history[0].content, 'msg-6'); // as 5 primeiras (1..5) foram descartadas
  assert.equal(history[29].content, 'msg-35');
});

test('Limpeza da conversa — clear() remove todo o histórico; idempotente', async () => {
  const memory = new ConversationMemory();
  await memory.append('conv-1', { role: 'user', content: 'oi', timestamp: 1 });
  assert.equal(await memory.count('conv-1'), 1);

  await memory.clear('conv-1');

  assert.equal(await memory.count('conv-1'), 0);
  assert.deepEqual(await memory.history('conv-1'), []);
  assert.equal(await memory.snapshot('conv-1'), undefined);

  // Limpar de novo (ou uma conversa que nunca existiu) não lança.
  await assert.doesNotReject(() => memory.clear('conv-1'));
  await assert.doesNotReject(() => memory.clear('nunca-existiu'));
});

test('Histórico em ordem cronológica — append() sempre no fim, nunca reordena', async () => {
  const memory = new ConversationMemory();

  await memory.append('conv-1', { role: 'user', content: 'primeira', timestamp: 100 });
  await memory.append('conv-1', { role: 'assistant', content: 'segunda', timestamp: 200 });
  await memory.append('conv-1', { role: 'user', content: 'terceira', timestamp: 300 });

  const history = await memory.history('conv-1');
  assert.deepEqual(
    history.map((m) => m.content),
    ['primeira', 'segunda', 'terceira'],
  );
  // Timestamps crescentes confirmam a ordem cronológica.
  assert.ok(history[0].timestamp < history[1].timestamp);
  assert.ok(history[1].timestamp < history[2].timestamp);
});

test('updatedAt avança a cada append(); createdAt permanece fixo', async () => {
  const memory = new ConversationMemory();
  await memory.append('conv-1', { role: 'user', content: 'oi', timestamp: 1 });
  const first = await memory.snapshot('conv-1');

  await new Promise((resolve) => setTimeout(resolve, 5));
  await memory.append('conv-1', { role: 'assistant', content: 'Olá!', timestamp: 2 });
  const second = await memory.snapshot('conv-1');

  assert.equal(second?.createdAt, first?.createdAt);
  assert.ok((second?.updatedAt ?? 0) >= (first?.updatedAt ?? 0));
});
