import type { EngineAlphaSnapshot, SerializableRuntime } from './SerializableRuntime';

export interface EngineAlphaSnapshotSources {
  world: SerializableRuntime<any>;
  inventory: SerializableRuntime<any>;
  quests: SerializableRuntime<any>;
  merchants: SerializableRuntime<any>;
  encounters: SerializableRuntime<any>;
  actors(): Readonly<Record<string, SerializableRuntime<any>>>;
  roster?: SerializableRuntime<any>;
  progression?: SerializableRuntime<any>;
  skills?: SerializableRuntime<any>;
  checkpoints?: SerializableRuntime<any>;
}

export class EngineAlphaSnapshotRuntime {
  constructor(private readonly sources: EngineAlphaSnapshotSources) {}

  serialize(): EngineAlphaSnapshot {
    return {
      version: '0.6.7.6',
      createdAt: Date.now(),
      world: this.sources.world.serialize(),
      inventory: this.sources.inventory.serialize(),
      quests: this.sources.quests.serialize(),
      merchants: this.sources.merchants.serialize(),
      encounters: this.sources.encounters.serialize(),
      actors: Object.fromEntries(
        Object.entries(this.sources.actors()).map(([id, runtime]) => [
          id,
          runtime.serialize(),
        ]),
      ),
      roster: this.sources.roster?.serialize(),
      progression: this.sources.progression?.serialize(),
      skills: this.sources.skills?.serialize(),
      checkpoints: this.sources.checkpoints?.serialize(),
    };
  }

  deserialize(snapshot: EngineAlphaSnapshot): void {
    this.sources.world.deserialize(snapshot.world);
    this.sources.inventory.deserialize(snapshot.inventory);
    this.sources.quests.deserialize(snapshot.quests);
    this.sources.merchants.deserialize(snapshot.merchants);
    this.sources.encounters.deserialize(snapshot.encounters);
    if (snapshot.roster !== undefined) this.sources.roster?.deserialize(snapshot.roster);
    if (snapshot.progression !== undefined) this.sources.progression?.deserialize(snapshot.progression);
    if (snapshot.skills !== undefined) this.sources.skills?.deserialize(snapshot.skills);
    if (snapshot.checkpoints !== undefined) this.sources.checkpoints?.deserialize(snapshot.checkpoints);
    const actors = this.sources.actors();
    for (const [id, state] of Object.entries(snapshot.actors)) {
      actors[id]?.deserialize(state);
    }
  }
}
