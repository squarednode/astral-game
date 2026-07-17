import type {
  AnyEventHandler,
  EngineEventMap,
  EngineEventName,
  EventBusStats,
  EventHandler,
  QueuedEngineEvent,
} from './EventTypes';

/**
 * Typed, queued gameplay event bus.
 *
 * Events emitted during a frame are delivered at the frame boundary. Events
 * emitted by handlers are intentionally deferred until the next flush, which
 * prevents recursive dispatch and makes ordering deterministic.
 */
export class EventBus {
  private readonly handlers = new Map<
    EngineEventName,
    Set<AnyEventHandler>
  >();
  private readonly anyHandlers = new Set<AnyEventHandler>();
  private queue: QueuedEngineEvent[] = [];
  private sequence = 1;
  private frame = 0;
  private emittedCount = 0;
  private dispatchedCount = 0;
  private handledCount = 0;
  private errorCount = 0;
  private lastEventType: EngineEventName | null = null;

  beginFrame(frame: number): void {
    this.frame = Math.max(0, Math.floor(frame));
  }

  emit<K extends EngineEventName>(
    type: K,
    payload: EngineEventMap[K],
  ): QueuedEngineEvent<K> {
    const event: QueuedEngineEvent<K> = {
      type,
      payload,
      sequence: this.sequence++,
      emittedFrame: this.frame,
    };

    this.queue.push(event as QueuedEngineEvent);
    this.emittedCount += 1;
    this.lastEventType = type;
    return event;
  }

  subscribe<K extends EngineEventName>(
    type: K,
    handler: EventHandler<K>,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set<AnyEventHandler>();
      this.handlers.set(type, set);
    }

    const stored = handler as AnyEventHandler;
    set.add(stored);
    return () => {
      set?.delete(stored);
      if (set?.size === 0) this.handlers.delete(type);
    };
  }

  subscribeAll(handler: AnyEventHandler): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  flush(
    onHandlerError?: (
      error: unknown,
      event: QueuedEngineEvent,
    ) => void,
  ): number {
    if (this.queue.length === 0) return 0;

    const dispatching = this.queue;
    this.queue = [];

    for (const event of dispatching) {
      this.dispatchedCount += 1;
      const specific = this.handlers.get(event.type);
      if (specific) {
        for (const handler of [...specific]) {
          this.invoke(handler, event, onHandlerError);
        }
      }

      for (const handler of [...this.anyHandlers]) {
        this.invoke(handler, event, onHandlerError);
      }
    }

    return dispatching.length;
  }

  clearQueue(): void {
    this.queue = [];
  }

  clearSubscriptions(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }

  resetDiagnostics(): void {
    this.emittedCount = 0;
    this.dispatchedCount = 0;
    this.handledCount = 0;
    this.errorCount = 0;
    this.lastEventType = null;
  }

  stats(): EventBusStats {
    let subscribers = this.anyHandlers.size;
    for (const set of this.handlers.values()) {
      subscribers += set.size;
    }

    return {
      queued: this.queue.length,
      emitted: this.emittedCount,
      dispatched: this.dispatchedCount,
      handled: this.handledCount,
      errors: this.errorCount,
      subscribers,
      lastEventType: this.lastEventType,
    };
  }

  private invoke(
    handler: AnyEventHandler,
    event: QueuedEngineEvent,
    onHandlerError?: (
      error: unknown,
      event: QueuedEngineEvent,
    ) => void,
  ): void {
    try {
      handler(event);
      this.handledCount += 1;
    } catch (error) {
      this.errorCount += 1;
      onHandlerError?.(error, event);
    }
  }
}
