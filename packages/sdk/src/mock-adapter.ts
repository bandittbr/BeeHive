import type { ICapability, CapabilityInput, CapabilityOutput, CapabilityResult } from './types';

function makeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '.');
}

const MOCK_OUTPUTS: Record<string, Record<string, unknown>> = {
  'chat.generate': {
    response: 'Esta e uma resposta simulada para fins de demonstracao. Em producao, esta mensagem viria de um modelo de linguagem real como GPT, Claude ou Gemini.',
    usage: { promptTokens: 50, completionTokens: 150, totalTokens: 200 },
  },
  'browser.scrape': {
    markdown: '# Pagina de Exemplo\n\nEste e o conteudo simulado de uma pagina web.\n\n## Secao 1\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n## Secao 2\n\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    title: 'Pagina de Exemplo',
    url: 'https://example.com',
  },
  'browser.navigate': {
    title: 'Pagina de Exemplo',
    url: 'https://example.com',
  },
  'browser.screenshot': {
    imageUrl: 'https://example.com/screenshot.png',
    width: 1920,
    height: 1080,
    format: 'png',
  },
};

function defaultMockFor(capability: ICapability): Record<string, unknown> {
  if (MOCK_OUTPUTS[capability.id]) return { ...MOCK_OUTPUTS[capability.id] };
  const outputs: Record<string, unknown> = {};
  for (const out of capability.outputs) {
    outputs[out.name] = '[mock] ' + out.name;
  }
  return outputs;
}

export class MockCapability implements ICapability {
  id: string;
  name: string;
  description: string;
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  tags: string[];
  version?: string;

  private mockOutputs: Record<string, unknown>;
  private delayMs = 0;

  constructor(original: ICapability, customOutputs?: Record<string, unknown>) {
    this.id = original.id;
    this.name = original.name;
    this.description = '[MOCK] ' + original.description;
    this.inputs = original.inputs;
    this.outputs = original.outputs;
    this.tags = original.tags ?? [];
    this.version = original.version;
    this.mockOutputs = customOutputs ?? defaultMockFor(original);
  }

  withDelay(ms: number): this { this.delayMs = ms; return this; }

  setOutputs(outputs: Record<string, unknown>): void {
    this.mockOutputs = outputs;
  }

  async execute(_input: any, _ctx: any): Promise<CapabilityResult> {
    if (this.delayMs > 0) await new Promise(r => setTimeout(r, this.delayMs));
    return {
      success: true,
      outputs: { ...this.mockOutputs },
      metrics: { duration: this.delayMs },
    };
  }
}

export class MockAdapter {
  private mocks = new Map<string, MockCapability>();
  private registry: any;

  constructor(registry: any) {
    this.registry = registry;
  }

  mock(capabilityId: string, outputs?: Record<string, unknown>): MockCapability {
    const existing = this.registry.resolve(capabilityId);
    const mock = new MockCapability(existing, outputs);
    this.mocks.set(capabilityId, mock);

    const entries = this.registry.list() as Array<{ pluginId: string; capability: ICapability }>;
    const entry = entries.find(e => e.capability.id === capabilityId);
    if (entry) {
      this.registry.unregister(entry.pluginId, capabilityId);
    }
    this.registry.register('mock', mock);
    return mock;
  }

  mockAll(): void {
    const entries = this.registry.list() as Array<{ pluginId: string; capability: ICapability }>;
    for (const entry of entries) {
      if (entry.pluginId === 'mock') continue;
      this.mock(entry.capability.id);
    }
  }

  restore(): void {
    for (const [id, _mock] of this.mocks) {
      const entries = this.registry.list() as Array<{ pluginId: string; capability: ICapability }>;
      const mockEntry = entries.find(e => e.capability.id === id && e.pluginId === 'mock');
      if (mockEntry) {
        this.registry.unregister('mock', id);
      }
    }
    this.mocks.clear();
  }

  static for(kernel: any): MockAdapter {
    return new MockAdapter(kernel.capabilities);
  }
}
