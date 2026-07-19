import type { StatusEffectDefinition } from '../definitions/combat';
import type {
  StatusApplyRequest,
  StatusComponent,
  StatusInstance,
  StatusRemovalReason,
  StatusRuntimeEvent,
  StatusTickContext,
} from './StatusTypes';

export type StatusListener = (event: Readonly<StatusRuntimeEvent>) => void;

export class StatusRuntime {
  private nextInstanceId = 1;
  private readonly listeners = new Set<StatusListener>();

  createComponent(): StatusComponent {
    return { active: new Map(), immunities: new Set(), resistances: new Map() };
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  apply(component: StatusComponent, request: StatusApplyRequest): StatusInstance | null {
    const definition = request.definition;
    if (component.immunities.has(definition.id) || definition.tags.some(tag => component.immunities.has(tag))) return null;

    const existing = component.active.get(definition.id) ?? [];
    const duration = Math.max(0, request.durationSeconds ?? definition.duration);
    const stacks = Math.max(1, request.stacks ?? 1);
    const magnitude = request.magnitude ?? 1;
    const resistance = Math.max(0, Math.min(0.95, component.resistances.get(definition.id) ?? 0));
    const adjustedDuration = duration * (1 - resistance);

    if (definition.stackingRule === 'refresh' && existing[0]) {
      existing[0].remainingSeconds = adjustedDuration;
      existing[0].magnitude = magnitude;
      this.emit('refreshed', existing[0]);
      return existing[0];
    }

    if (definition.stackingRule === 'replace' && existing.length) {
      this.remove(component, definition.id, 'replaced');
    }

    if (definition.stackingRule === 'stack-duration' && existing[0]) {
      existing[0].remainingSeconds += adjustedDuration;
      existing[0].stacks = Math.min(definition.maximumStacks, existing[0].stacks + stacks);
      this.emit('stacked', existing[0]);
      return existing[0];
    }

    if (definition.stackingRule === 'stack-intensity' && existing[0]) {
      existing[0].stacks = Math.min(definition.maximumStacks, existing[0].stacks + stacks);
      existing[0].remainingSeconds = adjustedDuration;
      existing[0].magnitude = Math.max(existing[0].magnitude, magnitude);
      this.emit('stacked', existing[0]);
      return existing[0];
    }

    const instance: StatusInstance = {
      instanceId: `status-instance-${this.nextInstanceId++}`,
      definitionId: definition.id,
      sourceEntityId: request.sourceEntityId,
      ownerEntityId: request.ownerEntityId,
      appliedAt: performance.now(),
      remainingSeconds: adjustedDuration,
      tickRemainingSeconds: definition.tickInterval ?? Number.POSITIVE_INFINITY,
      stacks: Math.min(definition.maximumStacks, stacks),
      magnitude,
      absorbedAmount: 0,
    };
    component.active.set(definition.id, [...existing, instance]);
    this.emit('applied', instance);
    return instance;
  }

  update(component: StatusComponent, definitions: ReadonlyMap<string, Readonly<StatusEffectDefinition>>, dt: number, context: StatusTickContext): void {
    for (const [definitionId, instances] of [...component.active]) {
      const definition = definitions.get(definitionId);
      if (!definition) continue;
      for (const instance of [...instances]) {
        instance.remainingSeconds -= dt;
        if (definition.tickInterval !== undefined) {
          instance.tickRemainingSeconds -= dt;
          while (instance.tickRemainingSeconds <= 0 && instance.remainingSeconds > 0) {
            instance.tickRemainingSeconds += definition.tickInterval;
            const amount = (definition.powerPerTick ?? 0) * instance.stacks * instance.magnitude;
            if (definition.tags.includes('heal')) context.heal(instance.ownerEntityId, amount, definition, instance.sourceEntityId);
            else if (definition.tags.includes('damage')) context.damage(instance.ownerEntityId, amount, definition, instance.sourceEntityId);
            this.emit('tick', instance);
          }
        }
        if (instance.remainingSeconds <= 0) this.removeInstance(component, definitionId, instance, 'expired');
      }
    }
  }

  remove(component: StatusComponent, definitionId: string, reason: StatusRemovalReason = 'manual'): void {
    for (const instance of component.active.get(definitionId) ?? []) this.emit(reason === 'cleansed' ? 'cleansed' : 'removed', instance, reason);
    component.active.delete(definitionId);
  }

  cleanse(component: StatusComponent, predicate: (definitionId: string, instance: Readonly<StatusInstance>) => boolean): number {
    let removed = 0;
    for (const [definitionId, instances] of [...component.active]) {
      for (const instance of [...instances]) {
        if (!predicate(definitionId, instance)) continue;
        this.removeInstance(component, definitionId, instance, 'cleansed');
        removed += 1;
      }
    }
    return removed;
  }

  has(component: StatusComponent, definitionId: string): boolean {
    return (component.active.get(definitionId)?.length ?? 0) > 0;
  }

  getMovementMultiplier(component: StatusComponent, definitions: ReadonlyMap<string, Readonly<StatusEffectDefinition>>): number {
    let multiplier = 1;
    for (const [definitionId, instances] of component.active) {
      const definition = definitions.get(definitionId);
      if (definition?.movementMultiplier === undefined) continue;
      const strongestStacks = Math.max(...instances.map(instance => instance.stacks));
      multiplier *= Math.pow(definition.movementMultiplier, strongestStacks);
    }
    return Math.max(0, multiplier);
  }

  private removeInstance(component: StatusComponent, definitionId: string, instance: StatusInstance, reason: StatusRemovalReason): void {
    const remaining = (component.active.get(definitionId) ?? []).filter(candidate => candidate !== instance);
    if (remaining.length) component.active.set(definitionId, remaining);
    else component.active.delete(definitionId);
    this.emit(reason === 'expired' ? 'expired' : reason === 'cleansed' ? 'cleansed' : 'removed', instance, reason);
  }

  private emit(type: StatusRuntimeEvent['type'], instance: StatusInstance, reason?: StatusRemovalReason): void {
    const event: StatusRuntimeEvent = { type, ownerEntityId: instance.ownerEntityId, definitionId: instance.definitionId, instance, reason };
    for (const listener of this.listeners) listener(event);
  }
}
