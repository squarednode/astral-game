import type { ActionExecutor } from './ActionExecutor';
import type {
  QuestDefinition,
  QuestObjectiveDefinition,
} from './ActorComponentTypes';

export type QuestState =
  | 'available'
  | 'active'
  | 'ready-to-complete'
  | 'completed';

export interface QuestObjectiveSnapshot {
  id: string;
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestSnapshot {
  id: string;
  displayName: string;
  description: string;
  state: QuestState;
  canAbandon: boolean;
  objectives: readonly QuestObjectiveSnapshot[];
}

export interface QuestRuntimeStateReader {
  getMaterial(materialId: string): number;
  getWorldFlag?(flagId: string): boolean;
  getWorldCounter?(counterId: string): number;
}

interface QuestRecord {
  definition: QuestDefinition;
  state: QuestState;
  progress: Map<string, number>;
}

const DEFAULT_ABANDON_POLICY = {
  clearObjectiveProgress: true,
  retainCollectedItems: true,
  returnToAvailable: true,
} as const;

export class QuestRuntime {
  private readonly quests = new Map<string, QuestRecord>();
  private trackedQuestId: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    definitions: readonly QuestDefinition[],
    private readonly actions: ActionExecutor,
    private readonly notify: (title: string, detail?: string) => void,
    private readonly stateReader: QuestRuntimeStateReader,
  ) {
    for (const definition of definitions) {
      this.quests.set(definition.id, {
        definition,
        state: 'available',
        progress: new Map(),
      });
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  accept(id: string): boolean {
    const record = this.quests.get(id);
    if (!record || record.state !== 'available') return false;

    record.state = 'active';
    record.progress.clear();
    this.initializeRetroactiveObjectives(record);
    this.trackedQuestId = id;
    this.notify('Quest Accepted', record.definition.displayName);
    this.evaluate(record, false);
    this.changed();
    return true;
  }

  abandon(id: string): boolean {
    const record = this.quests.get(id);
    if (
      !record ||
      record.state === 'available' ||
      record.state === 'completed' ||
      record.definition.canAbandon === false
    ) {
      return false;
    }

    const policy = record.definition.abandonPolicy ?? DEFAULT_ABANDON_POLICY;
    if (policy.clearObjectiveProgress) record.progress.clear();
    if (policy.returnToAvailable) record.state = 'available';
    if (this.trackedQuestId === id) this.trackedQuestId = null;

    this.notify('Quest Abandoned', record.definition.displayName);
    this.changed();
    return true;
  }

  setProgress(
    questId: string,
    objectiveId: string,
    amount: number,
    allowDecrease = false,
  ): void {
    const record = this.quests.get(questId);
    if (!record || record.state !== 'active') return;
    const objective = record.definition.objectives.find(
      candidate => candidate.id === objectiveId,
    );
    if (!objective) return;

    const previous = record.progress.get(objectiveId) ?? 0;
    const bounded = Math.min(
      objective.requiredAmount,
      Math.max(0, Math.floor(amount)),
    );
    const next = allowDecrease ? bounded : Math.max(previous, bounded);
    record.progress.set(objectiveId, next);

    if (
      next >= objective.requiredAmount &&
      previous < objective.requiredAmount
    ) {
      this.notify('Objective Complete', this.objectiveLabel(objective));
    }
    this.evaluate(record);
  }

  advance(questId: string, objectiveId: string, amount = 1): void {
    const record = this.quests.get(questId);
    if (!record || record.state !== 'active') return;
    this.setProgress(
      questId,
      objectiveId,
      (record.progress.get(objectiveId) ?? 0) + amount,
    );
  }

  recordKill(tags: readonly string[], entityId: string, boss: boolean): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (
          objective.type === 'kill-tag' &&
          objective.targetTags?.some(tag => tags.includes(tag))
        ) {
          this.advance(record.definition.id, objective.id);
        }
        if (
          objective.type === 'defeat-boss' &&
          boss &&
          (!objective.targetId || objective.targetId === entityId)
        ) {
          this.advance(record.definition.id, objective.id);
        }
      }
    }
  }

  recordActorInteraction(actorId: string): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (
          objective.type === 'talk-to-actor' &&
          objective.targetId === actorId
        ) {
          this.advance(record.definition.id, objective.id);
        }
      }
    }
  }

  syncMaterial(materialId: string, amount: number): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (
          objective.type === 'collect-material' &&
          objective.targetId === materialId
        ) {
          this.setProgress(
            record.definition.id,
            objective.id,
            amount,
            true,
          );
        }
      }
    }
  }

  canTurnIn(id: string): boolean {
    return this.quests.get(id)?.state === 'ready-to-complete';
  }

  complete(id: string): boolean {
    const record = this.quests.get(id);
    if (!record || record.state !== 'ready-to-complete') return false;

    for (const objective of record.definition.objectives) {
      if (
        objective.type === 'collect-material' &&
        objective.consumeOnTurnIn &&
        objective.targetId &&
        this.stateReader.getMaterial(objective.targetId) <
          objective.requiredAmount
      ) {
        this.notify(
          'Turn-In Blocked',
          `Requires ${objective.requiredAmount} ${objective.targetId}`,
        );
        return false;
      }
    }

    for (const objective of record.definition.objectives) {
      if (
        objective.type === 'collect-material' &&
        objective.consumeOnTurnIn &&
        objective.targetId
      ) {
        if (!this.actions.execute({
          type: 'remove-material',
          materialId: objective.targetId,
          amount: objective.requiredAmount,
        })) {
          return false;
        }
      }
    }

    if (!this.actions.executeAll(record.definition.rewards)) return false;
    record.state = 'completed';
    this.notify('Quest Complete', record.definition.displayName);
    if (this.trackedQuestId === id) this.trackedQuestId = null;
    this.changed();
    return true;
  }

  state(id: string): QuestState | undefined {
    return this.quests.get(id)?.state;
  }

  track(id: string | null): void {
    if (id && !this.quests.has(id)) return;
    this.trackedQuestId = id;
    this.changed();
  }

  tracked(): QuestSnapshot | null {
    return this.trackedQuestId
      ? this.snapshot(this.trackedQuestId)
      : null;
  }

  all(): readonly QuestSnapshot[] {
    return [...this.quests.keys()]
      .map(id => this.snapshot(id))
      .filter((quest): quest is QuestSnapshot => Boolean(quest));
  }

  snapshot(id: string): QuestSnapshot | null {
    const record = this.quests.get(id);
    if (!record) return null;
    return {
      id,
      displayName: record.definition.displayName,
      description: record.definition.description,
      state: record.state,
      canAbandon:
        record.definition.canAbandon !== false &&
        (record.state === 'active' || record.state === 'ready-to-complete'),
      objectives: record.definition.objectives.map(objective => ({
        id: objective.id,
        label: this.objectiveLabel(objective),
        current: record.progress.get(objective.id) ?? 0,
        required: objective.requiredAmount,
        completed:
          (record.progress.get(objective.id) ?? 0) >=
          objective.requiredAmount,
      })),
    };
  }

  private initializeRetroactiveObjectives(record: QuestRecord): void {
    for (const objective of record.definition.objectives) {
      if (!objective.retroactive) continue;
      if (objective.type === 'collect-material' && objective.targetId) {
        record.progress.set(
          objective.id,
          Math.min(
            objective.requiredAmount,
            this.stateReader.getMaterial(objective.targetId),
          ),
        );
      }
    }
  }

  private evaluate(record: QuestRecord, notifyReady = true): void {
    const complete = record.definition.objectives.every(
      objective =>
        (record.progress.get(objective.id) ?? 0) >=
        objective.requiredAmount,
    );
    if (complete && record.state === 'active') {
      record.state = 'ready-to-complete';
      if (notifyReady) {
        this.notify(
          'Quest Ready',
          `Return to complete ${record.definition.displayName}`,
        );
      }
    }
    this.changed();
  }

  private objectiveLabel(objective: QuestObjectiveDefinition): string {
    const target =
      objective.targetId ??
      objective.targetTags?.join(' / ') ??
      objective.id;
    switch (objective.type) {
      case 'kill-tag':
        return `Defeat ${target}`;
      case 'collect-material':
        return `Collect ${target}`;
      case 'talk-to-actor':
        return `Speak to ${target.replace('actor.', '').replaceAll('-', ' ')}`;
      case 'defeat-boss':
        return `Defeat ${target.replace('boss.', '').replaceAll('-', ' ')}`;
      case 'interact':
        return `Interact with ${target}`;
      case 'enter-zone':
        return `Enter ${target}`;
      case 'complete-encounter':
        return `Complete ${target}`;
    }
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
