export interface CombatSandboxValues {
  detectionRangeScale: number;
  preferredRangeScale: number;
  attackRangeScale: number;
  retreatBufferScale: number;
  advanceBufferScale: number;
  leashRangeScale: number;
  packAlertRangeScale: number;
  decisionIntervalSeconds: number;
  enemyHealthScale: number;
  enemyDamageScale: number;
  enemySpeedScale: number;
  enemyCooldownScale: number;
  targetVolumeScale: number;
  projectileVisualScale: number;
  projectileCollisionScale: number;
  damageNumberScale: number;
  healthBarScale: number;
}

export const COMBAT_SANDBOX_DEFAULTS: Readonly<CombatSandboxValues> = {
  detectionRangeScale: 0.65,
  preferredRangeScale: 0.65,
  attackRangeScale: 0.85,
  retreatBufferScale: 0.75,
  advanceBufferScale: 0.75,
  leashRangeScale: 0.8,
  packAlertRangeScale: 0.75,
  decisionIntervalSeconds: 0.45,
  enemyHealthScale: 1,
  enemyDamageScale: 1,
  enemySpeedScale: 1,
  enemyCooldownScale: 1,
  targetVolumeScale: 0.5,
  projectileVisualScale: 0.5,
  projectileCollisionScale: 0.5,
  damageNumberScale: 0.75,
  healthBarScale: 0.8,
};

export type CombatSandboxPreset =
  | 'tiny-arena'
  | 'dungeon'
  | 'open-world'
  | 'boss-fight'
  | 'stress-test'
  | 'defaults';

const PRESETS: Readonly<Record<CombatSandboxPreset, Partial<CombatSandboxValues>>> = {
  defaults: COMBAT_SANDBOX_DEFAULTS,
  'tiny-arena': {
    detectionRangeScale: 0.45,
    preferredRangeScale: 0.5,
    attackRangeScale: 0.72,
    leashRangeScale: 0.55,
    packAlertRangeScale: 0.5,
    decisionIntervalSeconds: 0.3,
  },
  dungeon: {
    detectionRangeScale: 0.58,
    preferredRangeScale: 0.62,
    attackRangeScale: 0.8,
    leashRangeScale: 0.7,
    packAlertRangeScale: 0.65,
    decisionIntervalSeconds: 0.4,
  },
  'open-world': {
    detectionRangeScale: 0.82,
    preferredRangeScale: 0.8,
    attackRangeScale: 0.95,
    leashRangeScale: 1,
    packAlertRangeScale: 0.9,
    decisionIntervalSeconds: 0.55,
  },
  'boss-fight': {
    detectionRangeScale: 1,
    preferredRangeScale: 0.9,
    attackRangeScale: 1,
    leashRangeScale: 1.15,
    packAlertRangeScale: 0,
    decisionIntervalSeconds: 0.28,
    enemyHealthScale: 1.25,
    enemyDamageScale: 1.1,
  },
  'stress-test': {
    detectionRangeScale: 1,
    preferredRangeScale: 0.75,
    attackRangeScale: 0.9,
    leashRangeScale: 1.1,
    packAlertRangeScale: 1,
    decisionIntervalSeconds: 0.2,
    enemyHealthScale: 0.7,
  },
};

export class CombatSandboxTuningStore {
  private values: CombatSandboxValues = { ...COMBAT_SANDBOX_DEFAULTS };
  private readonly listeners = new Set<(values: Readonly<CombatSandboxValues>) => void>();

  get(): Readonly<CombatSandboxValues> {
    return this.values;
  }

  set<K extends keyof CombatSandboxValues>(key: K, value: CombatSandboxValues[K]): void {
    if (!Number.isFinite(value)) return;
    this.values = { ...this.values, [key]: value };
    this.emit();
  }

  patch(values: Partial<CombatSandboxValues>): void {
    this.values = { ...this.values, ...values };
    this.emit();
  }

  applyPreset(preset: CombatSandboxPreset): void {
    this.values = { ...COMBAT_SANDBOX_DEFAULTS, ...PRESETS[preset] };
    this.emit();
  }

  subscribe(listener: (values: Readonly<CombatSandboxValues>) => void): () => void {
    this.listeners.add(listener);
    listener(this.values);
    return () => this.listeners.delete(listener);
  }

  exportJson(): string {
    return JSON.stringify(this.values, null, 2);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.values);
  }
}

export const combatSandboxTuning = new CombatSandboxTuningStore();
