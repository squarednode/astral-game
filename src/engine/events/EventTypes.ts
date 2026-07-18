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
  'ability.castStarted': {
    runtimeId: string;
    abilityId: string;
    casterId: string;
  };
  'ability.executed': {
    runtimeId: string;
    abilityId: string;
    casterId: string;
  };
  'ability.cooldownStarted': {
    runtimeId: string;
    abilityId: string;
    duration: number;
  };
  'ability.ready': {
    runtimeId: string;
    abilityId: string;
  };
  'ability.interrupted': {
    runtimeId: string;
    abilityId: string;
    reason: string;
  };
  'ability.commitReached': {
    runtimeId: string;
    abilityId: string;
    progress: number;
  };
  'ability.queued': {
    characterId: string;
    actionId: string;
    actionType: 'ability' | 'movement' | 'jump' | 'dodge' | 'swap';
  };
  'ability.queueConsumed': {
    characterId: string;
    actionId: string;
    actionType: 'ability' | 'movement' | 'jump' | 'dodge' | 'swap';
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
  'ui.notification': {
    text: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'loot';
  };
  'framework.validation': {
    value: number;
  };
  'state.entered': {
    machineId: string;
    state: string;
    from: string | null;
  };
  'state.exited': {
    machineId: string;
    state: string;
    to: string;
  };
  'state.changed': {
    machineId: string;
    from: string | null;
    to: string;
    reason?: string;
  };
  'state.transitionRejected': {
    machineId: string;
    from: string | null;
    to: string;
    rejectedBy: string;
  };
  'state.timerCompleted': {
    machineId: string;
    state: string;
  };
  'state.interaction': {
    machineId: string;
    state: string | null;
    interaction: string;
    handled: boolean;
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
