import type { ActionExecutor } from './ActionExecutor';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type { WorldTriggerDefinition, WorldTriggerSnapshot } from './WorldTriggerTypes';

interface TriggerRecord {
  definition: WorldTriggerDefinition;
  inside: boolean;
  activated: boolean;
  activationCount: number;
  cooldownRemaining: number;
}

export class WorldTriggerRuntime {
  private readonly records = new Map<string, TriggerRecord>();

  constructor(
    definitions: readonly WorldTriggerDefinition[],
    private readonly conditions: ConditionEvaluator,
    private readonly actions: ActionExecutor,
    private readonly onActivated?: (triggerId: string) => void,
  ) {
    for (const definition of definitions) {
      this.records.set(definition.id, {
        definition,
        inside: false,
        activated: false,
        activationCount: 0,
        cooldownRemaining: 0,
      });
    }
  }

  update(position: { x: number; y: number; z: number }, dt: number): void {
    for (const record of this.records.values()) {
      record.cooldownRemaining = Math.max(0, record.cooldownRemaining - Math.max(0, dt));
      const wasInside = record.inside;
      record.inside = this.contains(record.definition, position);
      const event = !wasInside && record.inside
        ? 'enter'
        : wasInside && !record.inside
          ? 'exit'
          : record.inside
            ? 'stay'
            : null;
      if (event !== record.definition.activation) continue;
      if (record.definition.once && record.activated) continue;
      if (record.cooldownRemaining > 0) continue;
      if (!this.conditions.evaluate(record.definition.condition).passed) continue;
      if (!this.actions.executeAll(record.definition.actions)) continue;
      record.activated = true;
      record.activationCount += 1;
      record.cooldownRemaining = Math.max(0, record.definition.cooldownSeconds ?? 0);
      this.onActivated?.(record.definition.id);
    }
  }

  snapshot(): readonly WorldTriggerSnapshot[] {
    return [...this.records.values()].map(record => ({
      id: record.definition.id,
      inside: record.inside,
      activated: record.activated,
      activationCount: record.activationCount,
      cooldownRemaining: record.cooldownRemaining,
    }));
  }

  private contains(
    definition: WorldTriggerDefinition,
    position: { x: number; y: number; z: number },
  ): boolean {
    const shape = definition.shape;
    if (shape.type === 'sphere') {
      const dx = position.x - shape.center.x;
      const dy = position.y - shape.center.y;
      const dz = position.z - shape.center.z;
      return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
    }
    return (
      Math.abs(position.x - shape.center.x) <= shape.size.x / 2 &&
      Math.abs(position.y - shape.center.y) <= shape.size.y / 2 &&
      Math.abs(position.z - shape.center.z) <= shape.size.z / 2
    );
  }
}
