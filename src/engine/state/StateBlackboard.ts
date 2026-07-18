export type BlackboardKey<TValues extends object> = Extract<keyof TValues, string>;

/**
 * Small typed shared-data store owned by a state machine.
 *
 * The blackboard intentionally stores behavior data only. Long-lived gameplay
 * state should remain in entities/components or the machine context.
 */
export class StateBlackboard<TValues extends object = Record<string, unknown>> {
  private values: TValues;
  private revision = 0;

  constructor(initialValues: TValues) {
    this.values = { ...initialValues };
  }

  get<TKey extends BlackboardKey<TValues>>(key: TKey): TValues[TKey] {
    return this.values[key];
  }

  has(key: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(this.values, key);
  }

  set<TKey extends BlackboardKey<TValues>>(
    key: TKey,
    value: TValues[TKey],
  ): void {
    if (Object.is(this.values[key], value)) return;
    this.values[key] = value;
    this.revision += 1;
  }

  patch(values: Partial<TValues>): void {
    let changed = false;

    for (const key of Object.keys(values) as BlackboardKey<TValues>[]) {
      const next = values[key];
      if (next === undefined || Object.is(this.values[key], next)) continue;
      this.values[key] = next;
      changed = true;
    }

    if (changed) this.revision += 1;
  }

  read(): Readonly<TValues> {
    return this.values;
  }

  snapshot(): Readonly<TValues> {
    return { ...this.values };
  }

  getRevision(): number {
    return this.revision;
  }

  reset(values: TValues): void {
    this.values = { ...values };
    this.revision += 1;
  }
}
