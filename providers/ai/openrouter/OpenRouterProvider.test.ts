import { OpenRouterProvider } from './OpenRouterProvider';

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider({
      apiKey: 'test-key',
      model: 'meta-llama/llama-3-8b-instruct:free',
      timeout: 5000,
      maxRetries: 1,
    });
  });

  describe('readiness', () => {
    it('returns ready when API key is provided', async () => {
      const r = await provider.readiness();
      expect(r.status).toBe('ready');
    });

    it('returns unavailable when no API key', async () => {
      const noKey = new OpenRouterProvider({});
      const r = await noKey.readiness();
      expect(r.status).toBe('unavailable');
      expect(r.reason).toContain('API key');
    });
  });

  describe('execute', () => {
    it('rejects unsupported capabilities', async () => {
      const ctx = { logger: { info: jest.fn() } as any, events: { publish: jest.fn() } as any };
      const result = await provider.execute('browser.navigate', { url: 'https://example.com' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('não suporta');
    });

    it('rejects when no API key', async () => {
      const noKey = new OpenRouterProvider({}, { info: () => {} } as any);
      const ctx = { logger: { info: () => {} } as any, events: { publish: jest.fn() } as any };
      const result = await noKey.execute('chat.generate', { message: 'test' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('returns error structure with duration', async () => {
      const ctx = { logger: { info: jest.fn() } as any, events: { publish: jest.fn() } as any };
      const result = await provider.execute('chat.generate', { message: 'test' }, ctx);
      expect(result.metrics).toHaveProperty('duration');
      expect(typeof result.metrics.duration).toBe('number');
    });
  });
});
