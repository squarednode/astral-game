export interface SerializableRuntime<TState> {
  serialize(): TState;
  deserialize(state: TState): void;
}

export interface EngineAlphaSnapshot {
  version: '0.6.7.3';
  createdAt: number;
  world: unknown;
  inventory: unknown;
  quests: unknown;
  merchants: unknown;
  encounters: unknown;
  actors: Readonly<Record<string, unknown>>;
  roster?: unknown;
  progression?: unknown;
  skills?: unknown;
}
