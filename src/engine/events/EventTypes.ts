export interface EngineEventMap {
  'entity.created': {
    entityId: string;
    name: string;
    tags: readonly string[];
  };
  'entity.destroyed': {
    entityId: string;
    name: string;
    tags: readonly string[];
  };
  'combat.enemyKilled': {
    entityId: string;
    elite: boolean;
    wave: number;
    totalKills: number;
  };
  'movement.playerLanded': {
    impactSpeed: number;
    supportHeight: number;
  };
  'world.triggerActivated': {
    triggerId: string;
  };
  'framework.validation': {
    value: number;
  };
}

export type EngineEventName = keyof EngineEventMap;

export interface QueuedEngineEvent<
  K extends EngineEventName = EngineEventName,
> {
  readonly type: K;
  readonly payload: EngineEventMap[K];
  readonly sequence: number;
  readonly emittedFrame: number;
}

export type EventHandler<K extends EngineEventName> = (
  event: QueuedEngineEvent<K>,
) => void;

export type AnyEventHandler = (
  event: QueuedEngineEvent,
) => void;

export interface EventBusStats {
  queued: number;
  emitted: number;
  dispatched: number;
  handled: number;
  errors: number;
  subscribers: number;
  lastEventType: EngineEventName | null;
}
