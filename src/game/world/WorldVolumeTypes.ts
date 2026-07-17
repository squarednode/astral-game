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

export type WorldVolume =
  | ModifierVolume
  | WaterHazardVolume;

export type WaterEntryBank =
  | 'negative'
  | 'positive';

export interface WorldVolumeResult {
  position: Vector3;
  speedMultiplier: number;
  disableJump: boolean;
  disableDodge: boolean;
  activeVolumeIds: string[];
  inDeepWater: boolean;
  drownRemaining: number | null;
  drowned: boolean;
}
