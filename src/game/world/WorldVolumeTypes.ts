import type { Vector3 } from '@babylonjs/core';

export interface BoxVolumeFootprint {
  shape: 'box';
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
}

export type WorldVolumeFootprint = BoxVolumeFootprint;

interface WorldVolumeBase {
  id: string;
  label: string;
  footprint: WorldVolumeFootprint;
  minimumY?: number;
  maximumY?: number;
}

export interface ModifierVolume extends WorldVolumeBase {
  kind: 'modifier';
  speedMultiplier: number;
  disableJump?: boolean;
  disableDodge?: boolean;
  groundContactOnly?: boolean;
}

export interface DamageHazardVolume extends WorldVolumeBase {
  kind: 'hazard';
  speedMultiplier?: number;
  damagePerSecond: number;
  disableJump?: boolean;
  disableDodge?: boolean;
}

export interface WaterHazardVolume extends WorldVolumeBase {
  kind: 'water-hazard';
  speedMultiplier: number;
  drownSeconds: number;
  disableJump: boolean;
  disableDodge: boolean;
  bankAxis: 'x' | 'z';
  bankCenter: number;
  recoveryPadding: number;
}

export interface ForceVolume extends WorldVolumeBase {
  kind: 'force';
  velocityX: number;
  velocityZ: number;
  speedMultiplier?: number;
  disableJump?: boolean;
  disableDodge?: boolean;
}

export interface ConstraintVolume extends WorldVolumeBase {
  kind: 'constraint';
  message?: string;
}

export interface TriggerVolume extends WorldVolumeBase {
  kind: 'trigger';
  eventId: string;
  once?: boolean;
}

export interface SpawnVolume extends WorldVolumeBase {
  kind: 'spawn';
  spawnId: string;
  spawnType: 'normal' | 'elite';
  count: number;
  once?: boolean;
}

export type WorldVolume =
  | ModifierVolume
  | DamageHazardVolume
  | WaterHazardVolume
  | ForceVolume
  | ConstraintVolume
  | TriggerVolume
  | SpawnVolume;

export type WaterEntryBank = 'negative' | 'positive';

export interface SpawnVolumeRequest {
  volumeId: string;
  spawnId: string;
  spawnType: 'normal' | 'elite';
  count: number;
  position: Vector3;
}

export interface WorldVolumeResult {
  position: Vector3;
  speedMultiplier: number;
  disableJump: boolean;
  disableDodge: boolean;
  activeVolumeIds: string[];
  enteredVolumeIds: string[];
  exitedVolumeIds: string[];
  triggerEvents: string[];
  spawnRequests: SpawnVolumeRequest[];
  constraintMessages: string[];
  damageAmount: number;
  forceDelta: Vector3;
  inDeepWater: boolean;
  drownRemaining: number | null;
  drowned: boolean;
}
