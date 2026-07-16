import type { Vector3 } from '@babylonjs/core';

export type EnvironmentInteractionClass =
  | 'decorative'
  | 'soft'
  | 'traversable'
  | 'solid'
  | 'dynamic';

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

export interface TraversalSurface {
  id: string;
  label: string;
  colliderLabel: string;
  start: Vector3;
  end: Vector3;
  startLanding: Vector3;
  endLanding: Vector3;
  surfaceHeight: number;
  entryRadius: number;
  width: number;
  minimumEntryHeight: number;
}

export interface WorldLandmark {
  id: string;
  label: string;
  position: Vector3;
}

export interface OutdoorZone {
  groundName: string;
  colliders: WorldCollider[];
  traversalSurfaces: TraversalSurface[];
  landmarks: WorldLandmark[];
  setTraversalHighlightVisible(visible: boolean): void;
}
