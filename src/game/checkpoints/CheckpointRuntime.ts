import type { SerializableRuntime } from '../../engine/persistence';
import type {
  CheckpointDefinition,
  CheckpointSerializedState,
  CheckpointSnapshot,
} from './CheckpointTypes';

export class CheckpointRuntime implements SerializableRuntime<CheckpointSerializedState> {
  private readonly definitions = new Map<string, CheckpointDefinition>();
  private activeCheckpointId: string | null;
  private activationCount = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    definitions: readonly CheckpointDefinition[],
    initialCheckpointId: string | null = null,
  ) {
    for (const definition of definitions) {
      if (!definition.id.trim()) throw new Error('Checkpoint ID cannot be empty.');
      this.definitions.set(definition.id, definition);
    }
    this.activeCheckpointId = initialCheckpointId && this.definitions.has(initialCheckpointId)
      ? initialCheckpointId
      : null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  all(): readonly CheckpointDefinition[] {
    return [...this.definitions.values()];
  }

  get(id: string): CheckpointDefinition | undefined {
    return this.definitions.get(id);
  }

  active(): CheckpointDefinition | null {
    return this.activeCheckpointId
      ? this.definitions.get(this.activeCheckpointId) ?? null
      : null;
  }

  activate(id: string): boolean {
    if (!this.definitions.has(id)) return false;
    const changed = this.activeCheckpointId !== id;
    this.activeCheckpointId = id;
    this.activationCount += 1;
    this.changed();
    return changed;
  }

  clear(): void {
    if (this.activeCheckpointId === null) return;
    this.activeCheckpointId = null;
    this.changed();
  }

  nearest(position: { x: number; y: number; z: number }): CheckpointDefinition | null {
    let nearest: CheckpointDefinition | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const definition of this.definitions.values()) {
      const dx = definition.position.x - position.x;
      const dz = definition.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= definition.activationRadius && distance < nearestDistance) {
        nearest = definition;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  snapshot(): CheckpointSnapshot {
    return {
      activeCheckpointId: this.activeCheckpointId,
      activeCheckpoint: this.active(),
      activationCount: this.activationCount,
    };
  }

  serialize(): CheckpointSerializedState {
    return {
      schemaVersion: 1,
      activeCheckpointId: this.activeCheckpointId,
      activationCount: this.activationCount,
    };
  }

  deserialize(state: CheckpointSerializedState): void {
    this.activeCheckpointId = state.activeCheckpointId && this.definitions.has(state.activeCheckpointId)
      ? state.activeCheckpointId
      : null;
    this.activationCount = Math.max(0, Number(state.activationCount) || 0);
    this.changed();
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
