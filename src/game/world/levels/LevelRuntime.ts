import type { LevelDefinition, LevelPoint, LevelRuntimeSnapshot, LevelZoneDefinition, WorldDefinition } from './LevelTypes';

export interface LevelRuntimeCallbacks {
  onZoneEntered?: (zone: LevelZoneDefinition, previous: LevelZoneDefinition | null) => void;
  onZoneExited?: (zone: LevelZoneDefinition, next: LevelZoneDefinition | null) => void;
  onZoneChanged?: (previous: LevelZoneDefinition | null, next: LevelZoneDefinition | null) => void;
}

const contains = (zone: LevelZoneDefinition, position: LevelPoint): boolean => {
  if (zone.shape.type === 'circle') {
    const dx = position.x - zone.shape.center.x;
    const dz = position.z - zone.shape.center.z;
    return dx * dx + dz * dz <= zone.shape.radius * zone.shape.radius;
  }
  return Math.abs(position.x - zone.shape.center.x) <= zone.shape.halfWidth
    && Math.abs(position.z - zone.shape.center.z) <= zone.shape.halfDepth;
};

export class LevelRuntime {
  private currentZone: LevelZoneDefinition | null = null;
  private previousZone: LevelZoneDefinition | null = null;
  private elapsedSeconds = 0;
  private enteredZoneAtSeconds: number | null = null;

  constructor(
    readonly world: WorldDefinition,
    readonly level: LevelDefinition,
    private readonly callbacks: LevelRuntimeCallbacks = {},
  ) {}

  update(position: LevelPoint, dt: number): void {
    this.elapsedSeconds += Math.max(0, dt);
    const next = this.resolveZone(position);
    if (next?.id === this.currentZone?.id) return;

    const previous = this.currentZone;
    this.previousZone = previous;
    if (previous) this.callbacks.onZoneExited?.(previous, next);
    this.currentZone = next;
    this.enteredZoneAtSeconds = next ? this.elapsedSeconds : null;
    if (next) this.callbacks.onZoneEntered?.(next, previous);
    this.callbacks.onZoneChanged?.(previous, next);
  }

  reset(position?: LevelPoint): void {
    this.currentZone = null;
    this.previousZone = null;
    this.elapsedSeconds = 0;
    this.enteredZoneAtSeconds = null;
    if (position) this.update(position, 0);
  }

  zone(): LevelZoneDefinition | null { return this.currentZone; }
  resolveZone(position: LevelPoint): LevelZoneDefinition | null {
    const matches = this.level.zones.filter(zone => contains(zone, position));
    if (matches.length === 0) return null;
    const priority = (role: LevelZoneDefinition['role']): number => ({ boss: 7, encounter: 6, quest: 5, safe: 4, transition: 3, arrival: 2, travel: 1 }[role]);
    return matches.sort((a, b) => priority(b.role) - priority(a.role))[0] ?? null;
  }

  snapshot(): LevelRuntimeSnapshot {
    return {
      worldId: this.world.id,
      worldName: this.world.displayName,
      levelId: this.level.id,
      levelName: this.level.displayName,
      currentZoneId: this.currentZone?.id ?? null,
      currentZoneName: this.currentZone?.displayName ?? null,
      currentZoneRole: this.currentZone?.role ?? null,
      previousZoneId: this.previousZone?.id ?? null,
      enteredZoneAtSeconds: this.enteredZoneAtSeconds,
    };
  }
}
