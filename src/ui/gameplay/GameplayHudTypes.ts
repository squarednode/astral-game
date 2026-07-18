export interface GameplayCharacterView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly active: boolean;
  readonly color: string;
}

export interface GameplayAbilityView {
  readonly id: string;
  readonly binding: string;
  readonly name: string;
  readonly cooldown: number;
  readonly cooldownMaximum: number;
  readonly assigned: boolean;
  readonly state?: string;
  readonly castProgress?: number;
  readonly castElapsed?: number;
  readonly castRemaining?: number;
  readonly castMaximum?: number;
  readonly tags?: readonly string[];
}

export interface GameplayBossView {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
}

export interface GameplayHudSnapshot {
  readonly party: readonly GameplayCharacterView[];
  readonly abilities: readonly GameplayAbilityView[];
  readonly wave: number;
  readonly kills: number;
  readonly power: number;
  readonly boss?: GameplayBossView;
  readonly activeCast?: {
    readonly name: string;
    readonly elapsed: number;
    readonly remaining: number;
    readonly maximum: number;
    readonly progress: number;
  };
}

export type NotificationTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'loot';
