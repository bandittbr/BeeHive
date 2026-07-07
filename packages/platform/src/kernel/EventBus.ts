import type {
  AnyEventHandler,
  BeeHiveEvent,
  EventHandler,
  EventName,
  IEventBus,
  Unsubscribe,
} from './types';

/**
 * Barramento de eventos em memória.
 *
 * Responsabilidade única: publicar e assinar eventos. Não conhece nenhum
 * componente concreto — quem emite e quem escuta se ignoram mutuamente
 * (baixo acoplamento).
 */
export class EventBus implements IEventBus {
  private readonly handlers = new Map<EventName, Set<EventHandler>>();
  private readonly anyHandlers = new Set<AnyEventHandler>();

  on<P = unknown>(name: EventName, handler: EventHandler<P>): Unsubscribe {
    const set = this.handlers.get(name) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(name, set);
    return () => {
      set.delete(handler as EventHandler);
    };
  }

  once<P = unknown>(name: EventName, handler: EventHandler<P>): Unsubscribe {
    const off = this.on<P>(name, (event) => {
      off();
      handler(event);
    });
    return off;
  }

  onAny(handler: AnyEventHandler): Unsubscribe {
    this.anyHandlers.add(handler);
    return () => {
      this.anyHandlers.delete(handler);
    };
  }

  emit<P = unknown>(name: EventName, payload: P): void {
    const event: BeeHiveEvent<P> = { name, payload, timestamp: Date.now() };
    // Copia os conjuntos para tolerar (des)inscrições durante a emissão.
    const listeners = this.handlers.get(name);
    if (listeners) {
      for (const handler of [...listeners]) {
        (handler as EventHandler<P>)(event);
      }
    }
    for (const handler of [...this.anyHandlers]) {
      handler(event as BeeHiveEvent);
    }
  }
}
