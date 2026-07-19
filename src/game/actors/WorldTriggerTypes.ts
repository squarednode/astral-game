import type { ActionDefinition } from './ActionTypes';
import type { ConditionDefinition } from './ConditionTypes';

export type WorldTriggerShape =
  | { type: 'sphere'; center: { x: number; y: number; z: number }; radius: number }
  | { type: 'box'; center: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } };

export interface WorldTriggerDefinition {
  id: string;
  displayName: string;
  shape: WorldTriggerShape;
  condition?: ConditionDefinition;
  actions: readonly ActionDefinition[];
  activation: 'enter' | 'exit' | 'stay';
  once?: boolean;
  cooldownSeconds?: number;
}

export interface WorldTriggerSnapshot {
  id: string;
  inside: boolean;
  activated: boolean;
  activationCount: number;
  cooldownRemaining: number;
}
