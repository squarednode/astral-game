import { TransformNode, Vector3 } from '@babylonjs/core';
import type { WorldCollider, TraversalSurface } from '../world/WorldTypes';
import { WorldCollisionSystem } from '../world/WorldCollisionSystem';
import { TraversalSurfaceSystem } from '../world/TraversalSurfaceSystem';
import {
  DEFAULT_MOVEMENT_CONFIG,
  type MovementConfig,
} from './MovementConfig';

export type SharedMovementFailure =
  | 'none'
  | 'blocked'
  | 'step-failed'
  | 'ground-lost'
  | 'no-progress';

export interface SharedMovementResult {
  position: Vector3;
  displacement: number;
  distanceImprovement: number;
  grounded: boolean;
  supportHeight: number;
  supportSurfaceId: string | null;
  blocked: boolean;
  stepped: boolean;
  slid: boolean;
  meaningfulProgress: boolean;
  failure: SharedMovementFailure;
}

/**
 * Shared grounded-actor movement resolver.
 *
 * Player input and enemy AI provide different movement intents, but collision,
 * step-up, support ownership, platform following, ground snapping and wall
 * sliding are resolved by the same world systems.
 */
export class SharedGroundMovementRuntime {
  private readonly collision: WorldCollisionSystem;
  private readonly supports: TraversalSurfaceSystem;
  private supportHeight = 0;
  private grounded = true;
  private verticalVelocity = 0;
  private lastGoalDistance = Number.POSITIVE_INFINITY;
  private progressAccumulator = 0;

  constructor(
    private readonly actor: TransformNode,
    colliders: ReadonlyArray<WorldCollider>,
    traversalSurfaces: ReadonlyArray<TraversalSurface>,
    actorRadius: number,
    private readonly config: Readonly<MovementConfig> = DEFAULT_MOVEMENT_CONFIG,
  ) {
    this.collision = new WorldCollisionSystem(colliders, actorRadius);
    this.supports = new TraversalSurfaceSystem(traversalSurfaces);
    this.reset(actor.position.y);
  }

  reset(height = 0): void {
    this.supportHeight = Math.max(0, height);
    this.actor.position.y = this.supportHeight;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.lastGoalDistance = Number.POSITIVE_INFINITY;
    this.progressAccumulator = 0;
    this.supports.reset();
  }

  getSupportHeight(): number {
    return this.supportHeight;
  }

  isGrounded(): boolean {
    return this.grounded;
  }

  getVerticalVelocity(): number {
    return this.verticalVelocity;
  }

  resolveToward(
    requestedPosition: Vector3,
    goalPosition: Vector3,
    dt: number,
    jumpRequested = false,
  ): SharedMovementResult {
    const previous = this.actor.position.clone();
    const desired = requestedPosition.clone();

    if (jumpRequested && this.grounded) {
      this.grounded = false;
      this.verticalVelocity = this.config.jumpVelocity;
    }

    const step = this.supports.queryStepUp(
      previous,
      desired,
      this.grounded,
      this.supportHeight,
    );

    const preliminarySupport = this.supports.querySupport(
      previous,
      desired,
      this.grounded,
      this.verticalVelocity,
      this.supportHeight,
    );

    const ignoredLabels = new Set(preliminarySupport.ignoredColliderLabels);
    if (step) ignoredLabels.add(step.colliderLabel);

    const resolved = this.collision.resolvePosition(
      previous,
      desired,
      ignoredLabels,
    );

    const attemptedHorizontal = new Vector3(
      desired.x - previous.x,
      0,
      desired.z - previous.z,
    );
    const resolvedHorizontal = new Vector3(
      resolved.x - previous.x,
      0,
      resolved.z - previous.z,
    );

    this.actor.position.x = resolved.x;
    this.actor.position.z = resolved.z;

    const finalSupport = this.supports.querySupport(
      previous,
      this.actor.position,
      this.grounded,
      this.verticalVelocity,
      this.supportHeight,
    );

    const nextSupportHeight =
      finalSupport.surfaceId !== null
        ? finalSupport.supportHeight
        : step?.supportHeight ?? finalSupport.supportHeight;

    if (this.grounded) {
      if (nextSupportHeight < this.supportHeight - this.config.groundSnapDistance) {
        this.grounded = false;
        this.verticalVelocity = 0;
      } else {
        this.supportHeight = nextSupportHeight;
        this.actor.position.y = nextSupportHeight;
      }
    }

    if (!this.grounded) {
      this.verticalVelocity -= this.config.gravity * dt;
      this.actor.position.y += this.verticalVelocity * dt;
      this.supportHeight = nextSupportHeight;
      if (this.actor.position.y <= this.supportHeight) {
        this.actor.position.y = this.supportHeight;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    const priorGoalDistance = Vector3.Distance(previous, goalPosition);
    const currentGoalDistance = Vector3.Distance(this.actor.position, goalPosition);
    const improvement = priorGoalDistance - currentGoalDistance;
    const displacement = Vector3.Distance(previous, this.actor.position);
    const meaningfulProgress = improvement >= 0.02 || currentGoalDistance <= 0.12;

    this.progressAccumulator = meaningfulProgress
      ? 0
      : this.progressAccumulator + dt;
    this.lastGoalDistance = currentGoalDistance;

    const blocked =
      attemptedHorizontal.lengthSquared() > 0.0001 &&
      resolvedHorizontal.lengthSquared() < attemptedHorizontal.lengthSquared() * 0.08;
    const slid =
      !blocked &&
      attemptedHorizontal.lengthSquared() > 0.0001 &&
      resolvedHorizontal.lengthSquared() > 0.0001 &&
      Vector3.Dot(attemptedHorizontal.normalize(), resolvedHorizontal.normalize()) < 0.96;

    let failure: SharedMovementFailure = 'none';
    if (blocked) failure = 'blocked';
    else if (!this.grounded && nextSupportHeight <= 0 && this.actor.position.y <= 0.01) {
      failure = 'ground-lost';
    } else if (this.progressAccumulator >= 0.5) {
      failure = 'no-progress';
    }

    return {
      position: this.actor.position.clone(),
      displacement,
      distanceImprovement: improvement,
      grounded: this.grounded,
      supportHeight: this.supportHeight,
      supportSurfaceId: finalSupport.surfaceId,
      blocked,
      stepped: Boolean(step),
      slid,
      meaningfulProgress,
      failure,
    };
  }
}
