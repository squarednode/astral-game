import type { StatusEffectDefinition } from '../definitions/combat';

export type StatusRefreshPolicy = 'refresh-duration' | 'add-stack' | 'replace' | 'ignore' | 'independent';
export type StatusRemovalReason = 'expired' | 'cleansed' | 'replaced' | 'dispelled' | 'death' | 'manual';
export type StatusCategory = 'damage-over-time' | 'heal-over-time' | 'movement' | 'control' | 'defensive' | 'offensive' | 'utility' | 'passive';

export interface StatusInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly sourceEntityId?: string;
  readonly ownerEntityId: string;
  readonly appliedAt: number;
  remainingSeconds: number;
  tickRemainingSeconds: number;
  stacks: number;
  magnitude: number;
  absorbedAmount: number;
}

export interface StatusComponent {
  readonly active: Map<string, StatusInstance[]>;
  immunities: Set<string>;
  resistances: Map<string, number>;
}

export interface StatusApplyRequest {
  definition: Readonly<StatusEffectDefinition>;
  ownerEntityId: string;
  sourceEntityId?: string;
  durationSeconds?: number;
  stacks?: number;
  magnitude?: number;
}

export interface StatusTickContext {
  damage(ownerEntityId: string, amount: number, definition: Readonly<StatusEffectDefinition>, sourceEntityId?: string): void;
  heal(ownerEntityId: string, amount: number, definition: Readonly<StatusEffectDefinition>, sourceEntityId?: string): void;
}

export interface StatusRuntimeEvent {
  type: 'applied' | 'refreshed' | 'stacked' | 'tick' | 'expired' | 'removed' | 'cleansed' | 'absorbed';
  ownerEntityId: string;
  definitionId: string;
  instance: Readonly<StatusInstance>;
  reason?: StatusRemovalReason;
}
