import type { ActionExecutor } from './ActionExecutor';
import type { QuestDefinition, QuestObjectiveDefinition } from './ActorComponentTypes';

export type QuestState = 'available' | 'active' | 'ready-to-complete' | 'completed';

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
  objectives: readonly QuestObjectiveSnapshot[];
}

interface QuestRecord {
  definition: QuestDefinition;
  state: QuestState;
  progress: Map<string, number>;
}

export class QuestRuntime {
  private readonly quests = new Map<string, QuestRecord>();
  private trackedQuestId: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    definitions: readonly QuestDefinition[],
    private readonly actions: ActionExecutor,
    private readonly notify: (title: string, detail?: string) => void,
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
    if (!record || (record.state !== 'available' && !record.definition.repeatable)) return false;
    record.state = 'active';
    record.progress.clear();
    this.trackedQuestId = id;
    this.notify('Quest Accepted', record.definition.displayName);
    this.changed();
    return true;
  }

  setProgress(questId: string, objectiveId: string, amount: number): void {
    const record = this.quests.get(questId);
    if (!record || record.state === 'completed' || record.state === 'available') return;
    const objective = record.definition.objectives.find(candidate => candidate.id === objectiveId);
    if (!objective) return;
    const previous = record.progress.get(objectiveId) ?? 0;
    const next = Math.min(objective.requiredAmount, Math.max(previous, amount));
    record.progress.set(objectiveId, next);
    if (next >= objective.requiredAmount && previous < objective.requiredAmount) {
      this.notify('Objective Complete', this.objectiveLabel(objective));
    }
    this.evaluate(record);
  }

  advance(questId: string, objectiveId: string, amount = 1): void {
    const record = this.quests.get(questId);
    if (!record) return;
    this.setProgress(questId, objectiveId, (record.progress.get(objectiveId) ?? 0) + amount);
  }

  recordKill(tags: readonly string[], entityId: string, boss: boolean): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (objective.type === 'kill-tag' && objective.targetTags?.some(tag => tags.includes(tag))) {
          this.advance(record.definition.id, objective.id);
        }
        if (objective.type === 'defeat-boss' && boss) {
          this.advance(record.definition.id, objective.id);
        }
      }
    }
  }

  recordActorInteraction(actorId: string): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (objective.type === 'talk-to-actor' && objective.targetId === actorId) {
          this.advance(record.definition.id, objective.id);
        }
      }
    }
  }

  syncMaterial(materialId: string, amount: number): void {
    for (const record of this.quests.values()) {
      if (record.state !== 'active') continue;
      for (const objective of record.definition.objectives) {
        if (objective.type === 'collect-material' && objective.targetId === materialId) {
          this.setProgress(record.definition.id, objective.id, amount);
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
    this.actions.executeAll(record.definition.rewards);
    record.state = 'completed';
    this.notify('Quest Complete', record.definition.displayName);
    if (this.trackedQuestId === id) this.trackedQuestId = null;
    this.changed();
    return true;
  }

  track(id: string | null): void {
    this.trackedQuestId = id;
    this.changed();
  }

  tracked(): QuestSnapshot | null {
    return this.trackedQuestId ? this.snapshot(this.trackedQuestId) : null;
  }

  all(): readonly QuestSnapshot[] {
    return [...this.quests.keys()].map(id => this.snapshot(id)!).filter(Boolean);
  }

  snapshot(id: string): QuestSnapshot | null {
    const record = this.quests.get(id);
    if (!record) return null;
    return {
      id,
      displayName: record.definition.displayName,
      description: record.definition.description,
      state: record.state,
      objectives: record.definition.objectives.map(objective => ({
        id: objective.id,
        label: this.objectiveLabel(objective),
        current: record.progress.get(objective.id) ?? 0,
        required: objective.requiredAmount,
        completed: (record.progress.get(objective.id) ?? 0) >= objective.requiredAmount,
      })),
    };
  }

  private evaluate(record: QuestRecord): void {
    const complete = record.definition.objectives.every(objective =>
      (record.progress.get(objective.id) ?? 0) >= objective.requiredAmount,
    );
    if (complete && record.state === 'active') {
      record.state = 'ready-to-complete';
      this.notify('Quest Ready', `Return to complete ${record.definition.displayName}`);
    }
    this.changed();
  }

  private objectiveLabel(objective: QuestObjectiveDefinition): string {
    const target = objective.targetId ?? objective.targetTags?.join(' / ') ?? objective.id;
    switch (objective.type) {
      case 'kill-tag': return `Defeat ${target}`;
      case 'collect-material': return `Collect ${target}`;
      case 'talk-to-actor': return `Speak to ${target.replace('actor.', '').replaceAll('-', ' ')}`;
      case 'defeat-boss': return `Defeat ${target.replace('boss.', '').replaceAll('-', ' ')}`;
      case 'interact': return `Interact with ${target}`;
      case 'enter-zone': return `Enter ${target}`;
      case 'complete-encounter': return `Complete ${target}`;
    }
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
