export interface IEventBus {
  publish<T>(event: Event<T>): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): Subscription;
  once<T>(eventType: string, handler: EventHandler<T>): Subscription;
  unsubscribe(sub: Subscription): void;
  publishMany(events: Event[]): Promise<void>;
}

export interface Event<T = unknown> {
  type: string;
  source: string;
  payload: T;
  timestamp: number;
  correlationId?: string;
  causationId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export type EventHandler<T = unknown> = (event: Event<T>) => Promise<void> | void;

export interface Subscription {
  id: string;
  eventType: string;
  unsubscribe(): void;
}
