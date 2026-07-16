import type { Event } from './types';

export class EventBuilder {
  static create(type: string, source: string) {
    return new EventBuilder(type, source);
  }

  private payload: unknown = {};
  private correlationId?: string;
  private causationId?: string;
  private priority: 'low' | 'normal' | 'high' | 'critical' = 'normal';

  private constructor(
    public readonly type: string,
    public readonly source: string,
  ) {}

  withPayload(p: unknown): this { this.payload = p; return this; }
  withCorrelationId(id: string): this { this.correlationId = id; return this; }
  withCausationId(id: string): this { this.causationId = id; return this; }
  withPriority(p: 'low' | 'normal' | 'high' | 'critical'): this { this.priority = p; return this; }

  build<T = unknown>(): Event<T> {
    return {
      type: this.type,
      source: this.source,
      payload: this.payload as T,
      timestamp: Date.now(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      priority: this.priority,
    };
  }
}
