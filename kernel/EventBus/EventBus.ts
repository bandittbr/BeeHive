import type { Event, EventHandler, Subscription } from '@beehive/shared';

export class EventBus {
  private handlers = new Map<string, Set<{ id: string; handler: EventHandler }>>();

  async publish<T>(event: Event<T>): Promise<void> {
    const subs = this.handlers.get(event.type);
    const wildcard = this.handlers.get('*');
    const all = [...(subs ?? []), ...(wildcard ?? [])];

    for (const sub of all) {
      try {
        await sub.handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler failed for ${event.type}:`, err);
      }
    }
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): Subscription {
    const id = 'sub-' + Math.random().toString(36).slice(2, 8);
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add({ id, handler: handler as EventHandler });
    return { id, eventType, unsubscribe: () => this.handlers.get(eventType)?.delete({ id, handler: handler as EventHandler }) };
  }

  once<T>(eventType: string, handler: EventHandler<T>): Subscription {
    const sub = this.subscribe(eventType, (event) => {
      sub.unsubscribe();
      return handler(event);
    });
    return sub;
  }

  unsubscribe(sub: Subscription): void {
    this.handlers.get(sub.eventType)?.forEach((s) => { if (s.id === sub.id) this.handlers.get(sub.eventType)?.delete(s); });
  }

  async publishMany(events: Event[]): Promise<void> {
    for (const event of events) await this.publish(event);
  }
}
