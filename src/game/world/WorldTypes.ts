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

interface TraversalSurfaceBase {
  id: string;
  label: string;
  colliderLabel: string;
  surfaceHeight: number;
  minimumEntryHeight: number;
}

export interface GuidedTraversalSurface extends TraversalSurfaceBase {
  mode: 'guided';
  start: Vector3;
  end: Vector3;
  startLanding: Vector3;
  endLanding: Vector3;
  entryRadius: number;
  width: number;
}

export interface FreeBoxTraversalSurface extends TraversalSurfaceBase {
  mode: 'free';
  shape: 'box';
  center: Vector3;
  halfWidth: number;
  halfDepth: number;
  entryPadding: number;
  exitDistance: number;
}

export interface FreeCircleTraversalSurface extends TraversalSurfaceBase {
  mode: 'free';
  shape: 'circle';
  center: Vector3;
  radius: number;
  entryPadding: number;
  exitDistance: number;
}

export type FreeTraversalSurface =
  | FreeBoxTraversalSurface
  | FreeCircleTraversalSurface;

export type TraversalSurface =
  | GuidedTraversalSurface
  | FreeTraversalSurface;

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
