"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    handlers = new Map();
    async publish(event) {
        const subs = this.handlers.get(event.type);
        const wildcard = this.handlers.get('*');
        const all = [...(subs ?? []), ...(wildcard ?? [])];
        for (const sub of all) {
            try {
                await sub.handler(event);
            }
            catch (err) {
                console.error(`[EventBus] Handler failed for ${event.type}:`, err);
            }
        }
    }
    subscribe(eventType, handler) {
        const id = 'sub-' + Math.random().toString(36).slice(2, 8);
        if (!this.handlers.has(eventType))
            this.handlers.set(eventType, new Set());
        this.handlers.get(eventType).add({ id, handler: handler });
        return { id, eventType, unsubscribe: () => this.handlers.get(eventType)?.delete({ id, handler: handler }) };
    }
    once(eventType, handler) {
        const sub = this.subscribe(eventType, (event) => {
            sub.unsubscribe();
            return handler(event);
        });
        return sub;
    }
    unsubscribe(sub) {
        this.handlers.get(sub.eventType)?.forEach((s) => { if (s.id === sub.id)
            this.handlers.get(sub.eventType)?.delete(s); });
    }
    async publishMany(events) {
        for (const event of events)
            await this.publish(event);
    }
}
exports.EventBus = EventBus;
