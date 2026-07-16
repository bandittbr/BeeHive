import type { IProvider, ProviderReadiness, ProviderHealth } from './types';

const MOCK_OUTPUTS: Record<string, Record<string, unknown>> = {
  'chat.generate': {
    response: 'Mock response — substitute via provider config for real AI output.',
    usage: { promptTokens: 50, completionTokens: 150, totalTokens: 200 },
  },
  'browser.scrape': {
    markdown: '# Mock Page\n\nMock content for demonstration.',
    title: 'Mock Page',
    url: 'https://example.com',
  },
  'browser.navigate': {
    title: 'Mock Page',
    url: 'https://example.com',
  },
  'browser.screenshot': {
    imageUrl: 'https://example.com/screenshot.png',
    width: 1920, height: 1080, format: 'png',
  },
  'memory.search': {
    results: [{ id: 'mock-1', content: 'Mock memory result', score: 0.95 }],
  },
  'tool.execute': {
    result: { stdout: 'mock output', stderr: '', exitCode: 0 },
  },
  'weather.current': {
    temperature: 22, condition: 'Clear', humidity: 65, city: 'Mock City',
  },
};

export class MockProvider implements IProvider {
  readonly id = 'mock';
  readonly type = 'mock';
  readonly name = 'Mock Provider';
  readonly capabilities: string[];

  private customOutputs = new Map<string, Record<string, unknown>>();
  private delayMs = 0;

  constructor(capabilities?: string[]) {
    this.capabilities = capabilities ?? Object.keys(MOCK_OUTPUTS);
  }

  setOutput(capabilityId: string, outputs: Record<string, unknown>): void {
    this.customOutputs.set(capabilityId, outputs);
  }

  withDelay(ms: number): this { this.delayMs = ms; return this; }

  async execute(
    capabilityId: string,
    params: Record<string, unknown>,
    _ctx: { logger: any; events: any },
  ): Promise<{ success: boolean; outputs: Record<string, unknown>; error?: string; metrics: { duration: number } }> {
    if (this.delayMs > 0) await new Promise(r => setTimeout(r, this.delayMs));
    const start = Date.now();
    const custom = this.customOutputs.get(capabilityId);
    const outputs = custom ?? MOCK_OUTPUTS[capabilityId] ?? { result: '[mock] ' + capabilityId };
    return { success: true, outputs: { ...outputs }, metrics: { duration: Date.now() - start } };
  }

  async readiness(): Promise<ProviderReadiness> {
    return { status: 'ready' };
  }

  async health(): Promise<ProviderHealth> {
    return { status: 'healthy', latency: 0 };
  }
}
