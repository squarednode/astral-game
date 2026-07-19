import type { SerializableRuntime } from '../../engine/persistence';
import type { EncounterRegistry } from './EncounterRegistry';
import type {
  EncounterArenaDefinition,
  EncounterDefinition,
  EncounterEnemyRecord,
  EncounterPosition,
  EncounterRuntimeCallbacks,
  EncounterSerializedState,
  EncounterSnapshot,
  EncounterSpawnGroupDefinition,
  EncounterState,
} from './EncounterTypes';

interface RuntimeState {
  definition: EncounterDefinition;
  arena: EncounterArenaDefinition;
  state: EncounterState;
  phaseIndex: number;
  elapsedSeconds: number;
  phaseElapsedSeconds: number;
  transitionRemaining: number;
  pendingSpawns: number;
  spawnedEnemies: number;
  defeatedEnemies: number;
  rewardGranted: boolean;
  completedCount: number;
  failureReason?: string;
  activeEnemyIds: Set<string>;
  enemyRecords: Map<string, EncounterEnemyRecord>;
  firedReinforcements: Map<string, number>;
  scheduledSpawns: Array<{ at: number; groupId: string; requestIndex: number }>;
  spawnSequence: number;
  playerInside: boolean;
}

export class EncounterManager implements SerializableRuntime<EncounterSerializedState> {
  private readonly runtimes = new Map<string, RuntimeState>();
  private activeEncounterId: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    registry: EncounterRegistry,
    private readonly callbacks: EncounterRuntimeCallbacks,
  ) {
    for (const definition of registry.allEncounters()) {
      const arena = registry.arena(definition.arenaId);
      if (!arena) throw new Error(`Missing arena ${definition.arenaId}`);
      this.runtimes.set(definition.id, this.createRuntime(definition, arena));
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(dt: number, player: EncounterPosition, playerDefeated = false): void {
    const safeDt = Math.max(0, dt);
    for (const runtime of this.runtimes.values()) {
      const distance = this.distance2D(player, runtime.arena.center);
      const insideTrigger = distance <= runtime.arena.triggerRadius;
      const insideBoundary = distance <= runtime.arena.radius;

      if (
        runtime.definition.activation === 'trigger' &&
        (runtime.state === 'available' || runtime.state === 'inactive') &&
        insideTrigger &&
        !runtime.playerInside &&
        this.activeEncounterId === null
      ) {
        this.start(runtime.definition.id);
      }
      runtime.playerInside = insideTrigger;

      if (runtime.state !== 'active' && runtime.state !== 'phase-transition') continue;
      runtime.elapsedSeconds += safeDt;
      runtime.phaseElapsedSeconds += safeDt;

      if (playerDefeated) {
        this.fail(runtime.definition.id, 'Player defeated');
        continue;
      }
      if (runtime.arena.boundaryPolicy === 'hard' && !insideBoundary) {
        this.fail(runtime.definition.id, 'Player left the encounter boundary');
        continue;
      }

      this.processScheduledSpawns(runtime);
      this.evaluateReinforcements(runtime);
      this.evaluatePhase(runtime, safeDt);
    }
  }

  start(encounterId: string): boolean {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime || this.activeEncounterId) return false;
    if (runtime.state === 'completed' && !runtime.definition.resetPolicy.repeatable) return false;

    this.clearRuntimeCombat(runtime);
    runtime.state = 'arming';
    runtime.phaseIndex = 0;
    runtime.elapsedSeconds = 0;
    runtime.phaseElapsedSeconds = 0;
    runtime.transitionRemaining = 0;
    runtime.pendingSpawns = 0;
    runtime.spawnedEnemies = 0;
    runtime.defeatedEnemies = 0;
    runtime.failureReason = undefined;
    runtime.firedReinforcements.clear();
    runtime.scheduledSpawns = [];
    runtime.spawnSequence = 0;
    this.activeEncounterId = encounterId;

    this.callbacks.emit('encounter.started', { encounterId });
    this.callbacks.notify('Encounter Started', runtime.definition.displayName);
    this.beginPhase(runtime);
    this.changed();
    return true;
  }

  fail(encounterId: string, reason: string): boolean {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime || !['active', 'phase-transition', 'arming'].includes(runtime.state)) return false;
    runtime.state = 'failed';
    runtime.failureReason = reason;
    this.callbacks.emit('encounter.failed', { encounterId, reason });
    this.callbacks.notify('Encounter Failed', reason);
    this.activeEncounterId = null;
    this.changed();
    return true;
  }

  reset(encounterId: string): boolean {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime) return false;
    runtime.state = 'resetting';
    this.clearRuntimeCombat(runtime);
    runtime.phaseIndex = 0;
    runtime.elapsedSeconds = 0;
    runtime.phaseElapsedSeconds = 0;
    runtime.transitionRemaining = 0;
    runtime.pendingSpawns = 0;
    runtime.spawnedEnemies = 0;
    runtime.defeatedEnemies = 0;
    runtime.failureReason = undefined;
    runtime.firedReinforcements.clear();
    runtime.scheduledSpawns = [];
    runtime.state = 'available';
    if (this.activeEncounterId === encounterId) this.activeEncounterId = null;
    this.callbacks.emit('encounter.reset', { encounterId });
    this.changed();
    return true;
  }

  advancePhase(encounterId: string): boolean {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime || runtime.state !== 'active') return false;
    for (const entityId of [...runtime.activeEnemyIds]) this.callbacks.removeEnemy(entityId);
    runtime.activeEnemyIds.clear();
    runtime.pendingSpawns = 0;
    runtime.scheduledSpawns = [];
    this.completeCurrentPhase(runtime);
    return true;
  }

  complete(encounterId: string): boolean {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime) return false;
    for (const entityId of [...runtime.activeEnemyIds]) this.callbacks.removeEnemy(entityId);
    runtime.activeEnemyIds.clear();
    runtime.pendingSpawns = 0;
    runtime.scheduledSpawns = [];
    this.completeEncounter(runtime);
    return true;
  }

  recordEnemyDefeated(entityId: string): void {
    for (const runtime of this.runtimes.values()) {
      if (!runtime.activeEnemyIds.delete(entityId)) continue;
      const record = runtime.enemyRecords.get(entityId);
      if (record) record.alive = false;
      runtime.defeatedEnemies += 1;
      this.callbacks.emit('encounter.enemyDefeated', {
        encounterId: runtime.definition.id,
        entityId,
        aliveEnemies: runtime.activeEnemyIds.size,
      });
      this.changed();
      return;
    }
  }

  ownership(entityId: string): EncounterEnemyRecord | undefined {
    for (const runtime of this.runtimes.values()) {
      const record = runtime.enemyRecords.get(entityId);
      if (record) return record;
    }
    return undefined;
  }

  active(): EncounterSnapshot | null {
    if (!this.activeEncounterId) return null;
    return this.snapshot(this.activeEncounterId);
  }

  snapshots(): readonly EncounterSnapshot[] {
    return [...this.runtimes.keys()]
      .map(id => this.snapshot(id))
      .filter((snapshot): snapshot is EncounterSnapshot => snapshot !== null);
  }

  snapshot(encounterId: string): EncounterSnapshot | null {
    const runtime = this.runtimes.get(encounterId);
    if (!runtime) return null;
    const phase = runtime.definition.phases[runtime.phaseIndex];
    return {
      id: runtime.definition.id,
      displayName: runtime.definition.displayName,
      state: runtime.state,
      currentPhaseIndex: runtime.phaseIndex,
      currentPhaseId: phase?.id ?? null,
      currentPhaseName: phase?.displayName ?? null,
      phaseCount: runtime.definition.phases.length,
      aliveEnemies: runtime.activeEnemyIds.size,
      spawnedEnemies: runtime.spawnedEnemies,
      defeatedEnemies: runtime.defeatedEnemies,
      pendingSpawns: runtime.pendingSpawns,
      elapsedSeconds: runtime.elapsedSeconds,
      transitionRemaining: runtime.transitionRemaining,
      reinforcementStates: Object.fromEntries(runtime.firedReinforcements),
      failureReason: runtime.failureReason,
      rewardGranted: runtime.rewardGranted,
    };
  }

  serialize(): EncounterSerializedState {
    return {
      version: 1,
      encounters: Object.fromEntries(
        [...this.runtimes].map(([id, runtime]) => [id, {
          state: runtime.state === 'active' || runtime.state === 'phase-transition'
            ? 'available'
            : runtime.state,
          currentPhaseIndex: runtime.phaseIndex,
          elapsedSeconds: runtime.elapsedSeconds,
          rewardGranted: runtime.rewardGranted,
          completedCount: runtime.completedCount,
        }]),
      ),
    };
  }

  deserialize(snapshot: EncounterSerializedState): void {
    for (const [id, saved] of Object.entries(snapshot.encounters ?? {})) {
      const runtime = this.runtimes.get(id);
      if (!runtime) continue;
      this.clearRuntimeCombat(runtime);
      runtime.state = saved.state;
      runtime.phaseIndex = saved.currentPhaseIndex;
      runtime.elapsedSeconds = saved.elapsedSeconds;
      runtime.rewardGranted = saved.rewardGranted;
      runtime.completedCount = saved.completedCount;
    }
    this.activeEncounterId = null;
    this.changed();
  }

  private createRuntime(
    definition: EncounterDefinition,
    arena: EncounterArenaDefinition,
  ): RuntimeState {
    return {
      definition,
      arena,
      state: 'available',
      phaseIndex: 0,
      elapsedSeconds: 0,
      phaseElapsedSeconds: 0,
      transitionRemaining: 0,
      pendingSpawns: 0,
      spawnedEnemies: 0,
      defeatedEnemies: 0,
      rewardGranted: false,
      completedCount: 0,
      activeEnemyIds: new Set(),
      enemyRecords: new Map(),
      firedReinforcements: new Map(),
      scheduledSpawns: [],
      spawnSequence: 0,
      playerInside: false,
    };
  }

  private beginPhase(runtime: RuntimeState): void {
    const phase = runtime.definition.phases[runtime.phaseIndex];
    if (!phase) {
      this.completeEncounter(runtime);
      return;
    }
    runtime.state = 'active';
    runtime.phaseElapsedSeconds = 0;
    runtime.transitionRemaining = 0;
    this.callbacks.emit('encounter.phaseStarted', {
      encounterId: runtime.definition.id,
      phaseId: phase.id,
      phaseIndex: runtime.phaseIndex,
    });
    for (const groupId of phase.spawnGroupIds) this.scheduleGroup(runtime, groupId);
    this.changed();
  }

  private scheduleGroup(runtime: RuntimeState, groupId: string): void {
    const group = runtime.definition.spawnGroups.find(candidate => candidate.id === groupId);
    if (!group) return;
    const delay = Math.max(0, group.spawnDelaySeconds ?? 0);
    let requestIndex = 0;
    for (const entry of group.entries) {
      for (let index = 0; index < entry.quantity; index += 1) {
        runtime.scheduledSpawns.push({
          at: runtime.phaseElapsedSeconds + delay + requestIndex * 0.16,
          groupId,
          requestIndex,
        });
        requestIndex += 1;
        runtime.pendingSpawns += 1;
      }
    }
  }

  private processScheduledSpawns(runtime: RuntimeState): void {
    const due = runtime.scheduledSpawns.filter(item => item.at <= runtime.phaseElapsedSeconds);
    runtime.scheduledSpawns = runtime.scheduledSpawns.filter(item => item.at > runtime.phaseElapsedSeconds);
    for (const scheduled of due) {
      this.spawnScheduled(runtime, scheduled.groupId, scheduled.requestIndex);
      runtime.pendingSpawns = Math.max(0, runtime.pendingSpawns - 1);
    }
  }

  private spawnScheduled(runtime: RuntimeState, groupId: string, requestIndex: number): void {
    const group = runtime.definition.spawnGroups.find(candidate => candidate.id === groupId);
    const phase = runtime.definition.phases[runtime.phaseIndex];
    if (!group || !phase) return;
    const expanded = group.entries.flatMap(entry =>
      Array.from({ length: entry.quantity }, () => entry),
    );
    const entry = expanded[requestIndex];
    if (!entry) return;

    const points = runtime.arena.spawnPoints.filter(point =>
      !entry.spawnPointTags?.length ||
      entry.spawnPointTags.every(tag => point.tags.includes(tag)),
    );
    const point = points[(runtime.spawnSequence + requestIndex) % Math.max(1, points.length)]
      ?? runtime.arena.spawnPoints[0];
    if (!point) return;

    const ownership = {
      encounterId: runtime.definition.id,
      phaseId: phase.id,
      spawnGroupId: group.id,
      spawnSequence: ++runtime.spawnSequence,
    };
    const entityId = this.callbacks.spawnEnemy({
      enemyDefinitionId: entry.enemyDefinitionId,
      position: point.position,
      elite: entry.elite ?? false,
      variantId: entry.variantId,
      modifierId: entry.modifierId,
      ownership,
    });
    if (!entityId) return;
    runtime.activeEnemyIds.add(entityId);
    runtime.enemyRecords.set(entityId, {
      ...ownership,
      entityId,
      alive: true,
      enemyDefinitionId: entry.enemyDefinitionId,
      tags: [
        ...(entry.elite ? ['elite'] : []),
        ...point.tags,
      ],
    });
    runtime.spawnedEnemies += 1;
    this.callbacks.emit('encounter.enemySpawned', {
      encounterId: runtime.definition.id,
      phaseId: phase.id,
      groupId: group.id,
      entityId,
    });
  }

  private evaluateReinforcements(runtime: RuntimeState): void {
    const phase = runtime.definition.phases[runtime.phaseIndex];
    if (!phase?.reinforcements) return;
    for (const reinforcement of phase.reinforcements) {
      const count = runtime.firedReinforcements.get(reinforcement.id) ?? 0;
      if (count > 0 && !reinforcement.repeatable) continue;
      let shouldFire = false;
      switch (reinforcement.trigger.type) {
        case 'alive-at-most':
          shouldFire = runtime.activeEnemyIds.size <= reinforcement.trigger.value && runtime.spawnedEnemies > 0;
          break;
        case 'elapsed-seconds':
          shouldFire = runtime.phaseElapsedSeconds >= reinforcement.trigger.value;
          break;
        case 'enemy-tag-defeated': {
          const tag = reinforcement.trigger.tag;
          shouldFire = [...runtime.enemyRecords.values()].some(
            record => !record.alive && record.tags.includes(tag),
          );
          break;
        }
      }
      if (!shouldFire) continue;
      runtime.firedReinforcements.set(reinforcement.id, count + 1);
      reinforcement.spawnGroupIds.forEach(groupId => this.scheduleGroup(runtime, groupId));
      this.callbacks.emit('encounter.reinforcementSpawned', {
        encounterId: runtime.definition.id,
        phaseId: phase.id,
        reinforcementId: reinforcement.id,
      });
      this.callbacks.notify('Reinforcements Incoming', runtime.definition.displayName);
    }
  }

  private evaluatePhase(runtime: RuntimeState, dt: number): void {
    if (runtime.state === 'phase-transition') {
      runtime.transitionRemaining = Math.max(0, runtime.transitionRemaining - dt);
      if (runtime.transitionRemaining <= 0) this.beginPhase(runtime);
      return;
    }
    if (runtime.pendingSpawns > 0 || runtime.activeEnemyIds.size > 0) return;
    this.completeCurrentPhase(runtime);
  }

  private completeCurrentPhase(runtime: RuntimeState): void {
    const phase = runtime.definition.phases[runtime.phaseIndex];
    if (phase) {
      this.callbacks.emit('encounter.phaseCompleted', {
        encounterId: runtime.definition.id,
        phaseId: phase.id,
        phaseIndex: runtime.phaseIndex,
      });
    }
    runtime.phaseIndex += 1;
    if (runtime.phaseIndex >= runtime.definition.phases.length) {
      this.completeEncounter(runtime);
      return;
    }
    runtime.state = 'phase-transition';
    runtime.transitionRemaining = Math.max(0, phase?.transitionDelaySeconds ?? 1.25);
    runtime.phaseElapsedSeconds = 0;
    this.changed();
  }

  private completeEncounter(runtime: RuntimeState): void {
    runtime.state = 'completed';
    runtime.completedCount += 1;
    this.activeEncounterId = null;
    if (!runtime.rewardGranted || runtime.definition.resetPolicy.repeatable) {
      if (runtime.definition.rewards) {
        this.callbacks.grantReward(runtime.definition.id, runtime.definition.rewards);
      }
      runtime.rewardGranted = true;
    }
    this.callbacks.emit('encounter.completed', {
      encounterId: runtime.definition.id,
      completionCount: runtime.completedCount,
    });
    this.callbacks.notify('Encounter Complete', runtime.definition.displayName);
    this.changed();
  }

  private clearRuntimeCombat(runtime: RuntimeState): void {
    for (const entityId of [...runtime.activeEnemyIds]) this.callbacks.removeEnemy(entityId);
    runtime.activeEnemyIds.clear();
    runtime.enemyRecords.clear();
    runtime.scheduledSpawns = [];
    runtime.pendingSpawns = 0;
  }

  private distance2D(a: EncounterPosition, b: EncounterPosition): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
