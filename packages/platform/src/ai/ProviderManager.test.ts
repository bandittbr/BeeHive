import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../kernel';
import { AIManager } from './AIManager';
import { ProviderManager, type ProviderChangedPayload } from './ProviderManager';
import { createOllamaProvider } from './providers/ollama';
import type {
  AIContext,
  AIProvider,
  AIProviderHealth,
  AIProviderModelSummary,
  AIRequest,
  AIResponse,
} from './types';

/**
 * Testes do ProviderManager (Sprint 13.3 + Sprint 14.3).
 *
 * A maioria usa um `FakeProvider` — implementa só o contrato `AIProvider`,
 * sem rede — para isolar o comportamento de gestão (ativar/desativar,
 * padrão, health, modelos, seleção dinâmica) do transporte HTTP de qualquer
 * Provider real. Alguns testes integram com o `OllamaProvider` de verdade
 * (fetch injetado) para provar que o `AIManager` funciona recebendo um
 * `ProviderManager` no lugar do `AIProviderRegistry` — a própria tese da
 * Sprint 13.3, agora estendida pela seleção dinâmica da Sprint 14.3.
 */

class FakeProvider implements AIProvider {
  readonly capabilities: readonly ('chat' | 'embeddings')[] = ['chat'];
  readonly listModels?: () => Promise<readonly AIProviderModelSummary[]>;
  private healthState: AIProviderHealth;

  constructor(
    readonly id: string,
    readonly name: string,
    options: { health?: AIProviderHealth; models?: AIProviderModelSummary[] } = {},
  ) {
    this.healthState = options.health ?? { ok: true };
    if (options.models) {
      const models = options.models;
      this.listModels = async () => models;
    }
  }

  supports(capability: string): boolean {
    return this.capabilities.includes(capability as 'chat');
  }

  async execute(request: AIRequest, _context: AIContext): Promise<AIResponse> {
    return {
      capability: request.capability,
      output: { echoed: request.input },
      provider: this.id,
      finishedAt: Date.now(),
    };
  }

  health(): AIProviderHealth {
    return this.healthState;
  }

  setHealth(health: AIProviderHealth): void {
    this.healthState = health;
  }
}

test('Registro de Provider — fica disponível e vira padrão automaticamente', () => {
  const manager = new ProviderManager();
  const provider = new FakeProvider('fake-a', 'Fake A');

  manager.register(provider);

  assert.equal(manager.has('fake-a'), true);
  assert.equal(manager.get('fake-a'), provider);
  assert.equal(manager.isEnabled('fake-a'), true);
  assert.equal(manager.getDefaultProviderId(), 'fake-a');
  assert.equal(manager.activeProvider(), provider);
});

test('Registro duplicado lança, mesma regra do AIProviderRegistry', () => {
  const manager = new ProviderManager();
  manager.register(new FakeProvider('dup', 'Dup'));

  assert.throws(() => manager.register(new FakeProvider('dup', 'Dup 2')));
});

test('Ativação — reabilita um Provider desativado', () => {
  const manager = new ProviderManager();
  manager.register(new FakeProvider('fake-a', 'Fake A'));
  manager.deactivate('fake-a');

  assert.equal(manager.isEnabled('fake-a'), false);

  manager.activate('fake-a');

  assert.equal(manager.isEnabled('fake-a'), true);
  assert.equal(manager.activeProvider()?.id, 'fake-a');
});

test('Desativação — Provider some de list()/findByCapability() e o ativo fica indefinido (sem fallback)', () => {
  const manager = new ProviderManager();
  const provider = new FakeProvider('fake-a', 'Fake A');
  manager.register(provider);

  manager.deactivate('fake-a');

  assert.deepEqual(manager.list(), []);
  assert.equal(manager.findByCapability('chat'), undefined);
  assert.equal(manager.activeProvider(), undefined);
  // Continua registrado — só desabilitado.
  assert.equal(manager.has('fake-a'), true);
});

test('Troca de Provider — setDefaultProvider muda quem é o ativo', () => {
  const manager = new ProviderManager();
  const a = new FakeProvider('fake-a', 'Fake A');
  const b = new FakeProvider('fake-b', 'Fake B');
  manager.register(a);
  manager.register(b);

  assert.equal(manager.activeProvider()?.id, 'fake-a'); // primeiro registrado

  manager.setDefaultProvider('fake-b');

  assert.equal(manager.getDefaultProviderId(), 'fake-b');
  assert.equal(manager.activeProvider(), b);
});

test('Troca de Modelo — setDefaultModel/getDefaultModel', () => {
  const manager = new ProviderManager();

  assert.equal(manager.getDefaultModel(), null);

  manager.setDefaultModel('llama3.2');
  assert.equal(manager.getDefaultModel(), 'llama3.2');

  manager.setDefaultModel('qwen2.5:3b');
  assert.equal(manager.getDefaultModel(), 'qwen2.5:3b');

  assert.throws(() => manager.setDefaultModel(''));
  assert.throws(() => manager.setDefaultModel('   '));
});

test('Provider inexistente — activate/deactivate/setDefaultProvider lançam; get/healthOf devolvem undefined', () => {
  const manager = new ProviderManager();

  assert.throws(() => manager.activate('nao-existe'), /não encontrado/);
  assert.throws(() => manager.deactivate('nao-existe'), /não encontrado/);
  assert.throws(() => manager.setDefaultProvider('nao-existe'), /não encontrado/);
  assert.equal(manager.get('nao-existe'), undefined);
  assert.equal(manager.healthOf('nao-existe'), undefined);
  assert.equal(manager.isEnabled('nao-existe'), false);
});

test('Health — agrega só os Providers habilitados; desativar remove da agregação', () => {
  const manager = new ProviderManager();
  const healthy = new FakeProvider('healthy', 'Saudável', { health: { ok: true } });
  const sick = new FakeProvider('sick', 'Doente', { health: { ok: false, detail: 'timeout' } });
  manager.register(healthy);
  manager.register(sick);

  let health = manager.health();
  assert.equal(health.ok, false); // "sick" derruba a agregação
  assert.deepEqual(
    health.providers.map((p) => p.id).sort(),
    ['healthy', 'sick'],
  );
  assert.deepEqual(manager.healthOf('sick'), { ok: false, detail: 'timeout' });

  manager.deactivate('sick');
  health = manager.health();
  assert.equal(health.ok, true); // "sick" desativado não conta mais
  assert.deepEqual(
    health.providers.map((p) => p.id),
    ['healthy'],
  );

  // snapshot() reflete o mesmo estado, mais Provider/modelo ativo.
  manager.setDefaultModel('modelo-x');
  const snapshot = manager.snapshot();
  assert.equal(snapshot.activeProviderId, 'healthy');
  assert.equal(snapshot.activeModel, 'modelo-x');
  assert.equal(snapshot.health.ok, true);
  assert.equal(snapshot.providers.length, 2); // availableProviders() inclui os desativados
});

test('Lista de modelos — availableModels() usa listModels() do Provider quando existe', async () => {
  const manager = new ProviderManager();
  const withModels = new FakeProvider('with-models', 'Com modelos', {
    models: [{ name: 'modelo-1' }, { name: 'modelo-2' }],
  });
  const withoutModels = new FakeProvider('without-models', 'Sem modelos');
  manager.register(withModels);
  manager.register(withoutModels);

  assert.deepEqual(await manager.availableModels('with-models'), [
    { name: 'modelo-1' },
    { name: 'modelo-2' },
  ]);
  assert.deepEqual(await manager.availableModels('without-models'), []);
  assert.deepEqual(await manager.availableModels('nao-existe'), []);

  // Sem providerId, usa o Provider ativo.
  manager.setDefaultProvider('with-models');
  assert.deepEqual(await manager.availableModels(), [{ name: 'modelo-1' }, { name: 'modelo-2' }]);
});

test('AIManager conversa só com o ProviderManager — funciona como substituto do AIProviderRegistry', async () => {
  const manager = new ProviderManager();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ message: { role: 'assistant', content: 'oi do Ollama' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  manager.register(createOllamaProvider({ baseUrl: 'http://localhost:11434', fetchImpl }));

  // O AIManager é instanciado exatamente como hoje — `registry` aceita o
  // ProviderManager porque ele É um AIProviderRegistry (herança).
  const aiManager = new AIManager({ registry: manager });

  const response = await aiManager.execute({
    capability: 'chat',
    input: { messages: [{ role: 'user', content: 'oi' }] },
  });

  assert.equal(response.provider, 'ollama');
  assert.deepEqual(response.output, { message: { role: 'assistant', content: 'oi do Ollama' } });

  // Desativar o único Provider no ProviderManager tira a capacidade do AIManager.
  manager.deactivate('ollama');
  assert.deepEqual(aiManager.capabilities(), []);
  await assert.rejects(() =>
    aiManager.execute({ capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } }),
  );
});

/**
 * Testes da Task 14.3 — Seleção dinâmica de Provider/Modelo.
 *
 * `findByCapability()` passa a preferir o Provider ATIVO antes de cair na
 * ordem de registro — é isto que faz o AIManager "sempre usar o Provider
 * ativo" sem qualquer mudança em `AIManager.ts`.
 */

test('Provider ativo dita a resolução do AIManager — trocar em runtime muda a resposta sem recriar nada', async () => {
  const manager = new ProviderManager();
  const a = new FakeProvider('fake-a', 'Fake A');
  const b = new FakeProvider('fake-b', 'Fake B');
  manager.register(a); // vira o ativo por ser o primeiro
  manager.register(b);

  // O mesmíssimo AIManager, criado uma única vez — nada é recriado na troca.
  const aiManager = new AIManager({ registry: manager });

  const first = await aiManager.execute({ capability: 'chat', input: { via: 'primeira' } });
  assert.equal(first.provider, 'fake-a');

  manager.setDefaultProvider('fake-b');

  const second = await aiManager.execute({ capability: 'chat', input: { via: 'segunda' } });
  assert.equal(second.provider, 'fake-b');
});

test('Com um único Provider registrado, a resolução continua idêntica à de antes', async () => {
  const manager = new ProviderManager();
  manager.register(new FakeProvider('solo', 'Solo'));
  const aiManager = new AIManager({ registry: manager });

  // Sem preferredId, sem troca — o único Provider responde, como sempre respondeu.
  const response = await aiManager.execute({ capability: 'chat', input: {} });
  assert.equal(response.provider, 'solo');
  assert.equal(manager.findByCapability('chat')?.id, 'solo');
});

test('Troca de Provider ativo é registrada no Logger e emite ProviderChanged', () => {
  const events = new EventBus();
  const received: ProviderChangedPayload[] = [];
  events.on<ProviderChangedPayload>('ProviderChanged', (event) => received.push(event.payload));

  const manager = new ProviderManager({ events });
  manager.register(new FakeProvider('fake-a', 'Fake A'));
  manager.register(new FakeProvider('fake-b', 'Fake B'));

  // Registrar não é "trocar" — nenhum evento ainda (fake-a virou ativo por ser o 1º).
  assert.deepEqual(received, []);

  manager.setDefaultProvider('fake-b');

  assert.deepEqual(received, [{ providerId: 'fake-b', previousProviderId: 'fake-a' }]);
});

test('Trocar para o Provider que já é o ativo é no-op — sem evento duplicado', () => {
  const events = new EventBus();
  const received: ProviderChangedPayload[] = [];
  events.on<ProviderChangedPayload>('ProviderChanged', (event) => received.push(event.payload));

  const manager = new ProviderManager({ events });
  manager.register(new FakeProvider('fake-a', 'Fake A'));

  manager.setDefaultProvider('fake-a'); // já é o ativo

  assert.deepEqual(received, []);
});
