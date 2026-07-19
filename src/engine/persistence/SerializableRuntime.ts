export interface SerializableRuntime<TState> {
  serialize(): TState;
  deserialize(state: TState): void;
}

export interface EngineAlphaSnapshot {
  version: '0.6.5c';
  createdAt: number;
  world: unknown;
  inventory: unknown;
  quests: unknown;
  merchants: unknown;
  actors: Readonly<Record<string, unknown>>;
}
