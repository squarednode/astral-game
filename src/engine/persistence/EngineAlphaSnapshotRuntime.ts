import type { EngineAlphaSnapshot, SerializableRuntime } from './SerializableRuntime';

export interface EngineAlphaSnapshotSources {
  world: SerializableRuntime<any>;
  inventory: SerializableRuntime<any>;
  quests: SerializableRuntime<any>;
  merchants: SerializableRuntime<any>;
  actors(): Readonly<Record<string, SerializableRuntime<any>>>;
}

export class EngineAlphaSnapshotRuntime {
  constructor(private readonly sources: EngineAlphaSnapshotSources) {}

  serialize(): EngineAlphaSnapshot {
    return {
      version: '0.6.5c',
      createdAt: Date.now(),
      world: this.sources.world.serialize(),
      inventory: this.sources.inventory.serialize(),
      quests: this.sources.quests.serialize(),
      merchants: this.sources.merchants.serialize(),
      actors: Object.fromEntries(
        Object.entries(this.sources.actors()).map(([id, runtime]) => [
          id,
          runtime.serialize(),
        ]),
      ),
    };
  }

  deserialize(snapshot: EngineAlphaSnapshot): void {
    this.sources.world.deserialize(snapshot.world);
    this.sources.inventory.deserialize(snapshot.inventory);
    this.sources.quests.deserialize(snapshot.quests);
    this.sources.merchants.deserialize(snapshot.merchants);
    const actors = this.sources.actors();
    for (const [id, state] of Object.entries(snapshot.actors)) {
      actors[id]?.deserialize(state);
    }
  }
}
