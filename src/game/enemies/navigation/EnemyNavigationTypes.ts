import type { Vector3 } from '@babylonjs/core';
import type { NavigationSurfaceType } from './NavigationSurfaceManager';

export type EnemyTraversalType =
  | 'jump'
  | 'drop'
  | 'platform'
  | 'lift'
  | 'climb';

export type EnemyNavigationMode =
  | 'idle'
  | 'walk'
  | 'step'
  | 'jump'
  | 'drop'
  | 'platform'
  | 'blocked';

export type EnemyNavigationFailureReason =
  | 'none'
  | 'blocked-by-solid'
  | 'blocked-by-dynamic-obstacle'
  | 'no-ground-ahead'
  | 'invalid-landing'
  | 'traversal-link-unavailable'
  | 'outside-navigation-zone'
  | 'spawn-position-invalid'
  | 'platform-timeout';

export interface EnemyNavigationCapabilities {
  radius: number;
  height: number;
  maximumStepHeight: number;
  maximumJumpHeight: number;
  maximumJumpDistance: number;
  maximumSafeDrop: number;
  canJump: boolean;
  canDrop: boolean;
  canUsePlatforms: boolean;
  canClimb: boolean;
  flying: boolean;
}

export interface EnemyTraversalLink {
  id: string;
  type: EnemyTraversalType;
  entryPosition: Vector3;
  exitPosition: Vector3;
  activationRadius: number;
  bidirectional: boolean;
  maximumEnemyRadius?: number;
  allowedRoles?: readonly string[];
  platformId?: string;
}

export interface EnemyNavigationAgentState {
  mode: EnemyNavigationMode;
  failureReason: EnemyNavigationFailureReason;
  verticalVelocity: number;
  grounded: boolean;
  supportHeight: number;
  activeTraversalLinkId: string | null;
  routeGoal: Vector3 | null;
  lastValidPosition: Vector3;
  lastReplanAt: number;
  blockedTime: number;
  platformWaitTime: number;
  surfaceType: NavigationSurfaceType;
  supportSurfaceId: string | null;
  pathValid: boolean;
  pathAge: number;
  lastBlockedReason: EnemyNavigationFailureReason;
}

export interface EnemyNavigationRequest {
  currentPosition: Vector3;
  desiredPosition: Vector3;
  homePosition: Vector3;
  leashRange: number;
  role: string;
  capabilities: Readonly<EnemyNavigationCapabilities>;
  state: EnemyNavigationAgentState;
  dt: number;
  nearbyObstaclePositions: readonly Vector3[];
}

export interface EnemyNavigationResolution {
  position: Vector3;
  mode: EnemyNavigationMode;
  failureReason: EnemyNavigationFailureReason;
  usedTraversalLinkId: string | null;
  replanned: boolean;
}

export interface EnemySpawnCandidateDebug {
  position: Vector3;
  valid: boolean;
  reason: EnemyNavigationFailureReason;
}
