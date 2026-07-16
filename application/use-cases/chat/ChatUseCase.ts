import type { ICapabilityRegistry, ILogger, IArtifact, ExecutionContext, IEventBus } from '@beehive/shared';

export interface ChatRequest {
  message: string;
  provider?: string;
  model?: string;
}

export interface ChatResponse {
  text: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  artifact: IArtifact;
  duration: number;
}

class NoopEventBus implements IEventBus {
  async publish<T>(event: any): Promise<void> {}
  subscribe<T>(eventType: string, handler: any): any { return { id: '', eventType, unsubscribe() {} }; }
  once<T>(eventType: string, handler: any): any { return { id: '', eventType, unsubscribe() {} }; }
  unsubscribe(sub: any): void {}
  async publishMany(events: any[]): Promise<void> {}
}

export class ChatUseCase {
  constructor(
    private capabilities: ICapabilityRegistry,
    private logger: ILogger,
  ) {}

  async execute(request: ChatRequest): Promise<ChatResponse> {
    this.logger.info('ChatUseCase: ' + request.message);
    const start = Date.now();

    const capability = this.capabilities.resolve('chat.generate');
    const ctx: ExecutionContext = {
      correlationId: 'chat-' + Date.now().toString(36),
      logger: this.logger,
      events: new NoopEventBus(),
    };

    const result = await capability.execute({ message: request.message, provider: request.provider, model: request.model }, ctx);

    return {
      text: result.outputs.response as string,
      usage: result.outputs.usage as any,
      artifact: null as any,
      duration: Date.now() - start,
    };
  }
}
