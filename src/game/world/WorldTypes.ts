import type { Vector3 } from '@babylonjs/core';

export type EnvironmentInteractionClass =
  | 'decorative'
  | 'soft'
  | 'traversable'
  | 'solid';

export interface CircleWorldCollider {
  kind: 'circle';
  centerX: number;
  centerZ: number;
  radius: number;
  interaction: 'solid' | 'traversable';
  clearanceHeight?: number;
  label: string;
}

export interface BoxWorldCollider {
  kind: 'box';
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  interaction: 'solid' | 'traversable';
  clearanceHeight?: number;
  label: string;
}

export type WorldCollider = CircleWorldCollider | BoxWorldCollider;

export interface WorldLandmark {
  id: string;
  label: string;
  position: Vector3;
}

export interface OutdoorZone {
  groundName: string;
  colliders: WorldCollider[];
  landmarks: WorldLandmark[];
  setTraversalHighlightVisible(visible: boolean): void;
}
