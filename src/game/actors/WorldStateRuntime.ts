export type WorldStateValue = string | number | boolean;

export interface WorldStateSerialized {
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  values: Record<string, WorldStateValue>;
}

export class WorldStateRuntime {
  private readonly flags = new Map<string, boolean>();
  private readonly counters = new Map<string, number>();
  private readonly values = new Map<string, WorldStateValue>();

  getFlag(id: string): boolean {
    return this.flags.get(id) ?? false;
  }

  setFlag(id: string, value: boolean): void {
    this.flags.set(id, value);
  }

  getCounter(id: string): number {
    return this.counters.get(id) ?? 0;
  }

  setCounter(id: string, value: number): void {
    this.counters.set(id, value);
  }

  incrementCounter(id: string, amount = 1): number {
    const value = this.getCounter(id) + amount;
    this.counters.set(id, value);
    return value;
  }

  getValue(id: string): WorldStateValue | undefined {
    return this.values.get(id);
  }

  setValue(id: string, value: WorldStateValue): void {
    this.values.set(id, value);
  }

  serialize(): WorldStateSerialized {
    return {
      flags: Object.fromEntries(this.flags),
      counters: Object.fromEntries(this.counters),
      values: Object.fromEntries(this.values),
    };
  }

  deserialize(state: WorldStateSerialized): void {
    this.flags.clear();
    this.counters.clear();
    this.values.clear();
    Object.entries(state.flags ?? {}).forEach(([id, value]) => this.flags.set(id, Boolean(value)));
    Object.entries(state.counters ?? {}).forEach(([id, value]) => this.counters.set(id, Number(value) || 0));
    Object.entries(state.values ?? {}).forEach(([id, value]) => this.values.set(id, value));
  }

  snapshot(): WorldStateSerialized {
    return this.serialize();
  }
}
