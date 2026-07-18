import type { AbilityRuntime } from './AbilityRuntime';

export type AbilitySlot = 1 | 2 | 3 | 4;

export class AbilityComponent {
  private readonly slots = new Map<AbilitySlot, AbilityRuntime>();

  assign(slot: AbilitySlot, runtime: AbilityRuntime): void {
    this.slots.set(slot, runtime);
  }

  get(slot: AbilitySlot): AbilityRuntime | undefined {
    return this.slots.get(slot);
  }

  all(): readonly AbilityRuntime[] {
    return [...this.slots.values()];
  }

  update(dt: number): void {
    for (const runtime of this.slots.values()) runtime.update(dt);
  }

  reset(): void {
    for (const runtime of this.slots.values()) runtime.reset();
  }
}
