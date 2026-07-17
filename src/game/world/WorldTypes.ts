import type { Vector3 } from '@babylonjs/core';
import type { WorldVolume } from './WorldVolumeTypes';

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
  interaction: 'solid' | 'traversable' | 'hazard';
  clearanceHeight?: number;
  label: string;
}

export interface BoxWorldCollider {
  kind: 'box';
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  interaction: 'solid' | 'traversable' | 'hazard';
  clearanceHeight?: number;
  label: string;
}

export type WorldCollider = CircleWorldCollider | BoxWorldCollider;

interface WalkableSurfaceBase {
  id: string;
  label: string;
  colliderLabel: string;

  /**
   * Default top elevation. Future hills, stairs, ramps, and moving platforms
   * may override this through sampleHeight.
   */
  surfaceHeight: number;

  /**
   * Optional sampled top elevation for ramps, hills, stairs, and irregular
   * surfaces.
   */
  sampleHeight?: (x: number, z: number) => number;

  /**
   * Optional surface slope. Surfaces beyond the movement limit are not
   * considered walkable.
   */
  slopeDegrees?: number;

  /**
   * Optional per-frame platform movement. Reserved for moving platforms,
   * elevators, and boats.
   */
  frameDelta?: Vector3;
}

export interface GuidedTraversalSurface extends WalkableSurfaceBase {
  mode: 'guided';

  /**
   * Full usable centerline. There are no special entry or exit points.
   */
  start: Vector3;
  end: Vector3;

  /**
   * Physical walkable width used for landing detection.
   */
  width: number;

  /**
   * Soft invisible guide width. Lateral movement is clamped within this
   * corridor while the player is supported.
   */
  guideHalfWidth: number;
}

export interface FreeBoxTraversalSurface extends WalkableSurfaceBase {
  mode: 'free';
  shape: 'box';
  center: Vector3;
  halfWidth: number;
  halfDepth: number;
  entryPadding: number;
  exitDistance: number;
}

export interface FreeCircleTraversalSurface extends WalkableSurfaceBase {
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
  worldVolumes: WorldVolume[];
  landmarks: WorldLandmark[];
  setTraversalHighlightVisible(visible: boolean): void;
}
