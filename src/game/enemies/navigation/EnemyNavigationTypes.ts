import type { Vector3 } from '@babylonjs/core';
import type { NavigationSurfaceType } from './NavigationSurfaceManager';

export type EnemyTraversalType =
  | 'jump'
  | 'drop'
  | 'platform'
  | 'lift'
  | 'climb';

export type EnemyTraversalPhase =
  | 'idle'
  | 'approach'
  | 'takeoff'
  | 'airborne'
  | 'landing'
  | 'settle'
  | 'complete';

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
  | 'platform-timeout'
  | 'body-overlap'
  | 'insufficient-support'
  | 'stale-path';

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
  navigationSkin: number;
  minimumSupportRatio: number;
  maximumPathAge: number;
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
  supportRatio: number;
  sweepResult: 'clear' | 'slide' | 'blocked';
  pathGeneration: number;
  lastGoalPosition: Vector3 | null;
  traversalPhase: EnemyTraversalPhase;
  traversalLandingPosition: Vector3 | null;
  traversalExitPosition: Vector3 | null;
  traversalSettleRemaining: number;
  traversalAttemptCount: number;
  traversalLastAttemptAt: number;
  traversalCooldownUntil: number;
  traversalOwner: 'planner' | null;
  traversalMovementMode: 'jump' | 'drop' | null;
  reservedLandingSurfaceId: string | null;
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
  agentId: string;
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
