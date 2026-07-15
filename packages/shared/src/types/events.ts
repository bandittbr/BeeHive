export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  priority: EventPriority;
  payload: T;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (
  event: EventEnvelope<T>,
  ctx: EventContext
) => Promise<void> | void;

export interface EventContext {
  kernelId: string;
  abort(): void;
  emit(childEvent: string, payload?: unknown): void;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  filter?: (event: EventEnvelope) => boolean;
  priority: EventPriority;
}

export interface EmitOptions {
  priority?: EventPriority;
  correlationId?: string;
  causationId?: string;
  delay?: number;
  deduplicate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SubscribeOptions {
  priority?: EventPriority;
  filter?: (event: EventEnvelope) => boolean;
  group?: string;
}

export type EventMiddleware = (
  event: EventEnvelope,
  next: () => Promise<void>
) => Promise<void>;

export interface EventBusStats {
  totalEmitted: number;
  totalHandled: number;
  totalFailed: number;
  activeSubscriptions: number;
  queuedEvents: number;
}
