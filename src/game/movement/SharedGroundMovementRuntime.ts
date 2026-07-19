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
  airborneHorizontalSpeed: number;
  jumpLandingSurfaceId: string | null;
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
  private airborneHorizontalVelocity = Vector3.Zero();
  private jumpLandingSurfaceId: string | null = null;
  private jumpLandingColliderLabel: string | null = null;

  constructor(
    private readonly actor: TransformNode,
    colliders: ReadonlyArray<WorldCollider>,
    traversalSurfaces: ReadonlyArray<TraversalSurface>,
    actorRadius: number,
    private readonly actorGroundOffset = 0,
    private readonly config: Readonly<MovementConfig> = DEFAULT_MOVEMENT_CONFIG,
  ) {
    this.collision = new WorldCollisionSystem(colliders, actorRadius);
    this.supports = new TraversalSurfaceSystem(traversalSurfaces);
    this.reset(Math.max(0, actor.position.y - this.actorGroundOffset));
  }

  reset(height = 0): void {
    this.supportHeight = Math.max(0, height);
    this.actor.position.y = this.supportHeight + this.actorGroundOffset;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.lastGoalDistance = Number.POSITIVE_INFINITY;
    this.progressAccumulator = 0;
    this.airborneHorizontalVelocity.setAll(0);
    this.jumpLandingSurfaceId = null;
    this.jumpLandingColliderLabel = null;
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
    const previousFoot = previous.subtract(new Vector3(0, this.actorGroundOffset, 0));
    const desired = requestedPosition.clone();
    let desiredFoot = desired.subtract(new Vector3(0, this.actorGroundOffset, 0));

    if (jumpRequested && this.grounded && this.airborneHorizontalVelocity.lengthSquared() <= 0.000001) {
      const landing = this.supports.queryLandingSurface(desiredFoot);
      const landingHeight = landing?.supportHeight ?? desiredFoot.y;
      const heightDelta = landingHeight - this.supportHeight;
      const discriminant =
        this.config.jumpVelocity * this.config.jumpVelocity -
        2 * this.config.gravity * heightDelta;

      if (discriminant >= 0 && heightDelta <= this.config.maximumJumpOntoHeight) {
        const flightTime = Math.max(
          0.18,
          (this.config.jumpVelocity + Math.sqrt(discriminant)) /
            this.config.gravity,
        );
        const horizontalDelta = new Vector3(
          desiredFoot.x - previousFoot.x,
          0,
          desiredFoot.z - previousFoot.z,
        );
        this.airborneHorizontalVelocity = horizontalDelta.scale(1 / flightTime);
        const maximumHorizontalJumpSpeed = 7.5;
        if (this.airborneHorizontalVelocity.length() > maximumHorizontalJumpSpeed) {
          this.airborneHorizontalVelocity.normalize().scaleInPlace(maximumHorizontalJumpSpeed);
        }
        this.jumpLandingSurfaceId = landing?.surfaceId ?? null;
        this.jumpLandingColliderLabel = landing?.colliderLabel ?? null;
        this.grounded = false;
        this.verticalVelocity = this.config.jumpVelocity;
      }
    }

    if (!this.grounded && this.airborneHorizontalVelocity.lengthSquared() > 0.000001) {
      desiredFoot = previousFoot.add(this.airborneHorizontalVelocity.scale(dt));
    }

    const step = this.supports.queryStepUp(
      previousFoot,
      desiredFoot,
      this.grounded,
      this.supportHeight,
    );

    const preliminarySupport = this.supports.querySupport(
      previousFoot,
      desiredFoot,
      this.grounded,
      this.verticalVelocity,
      this.supportHeight,
    );

    const ignoredLabels = new Set(preliminarySupport.ignoredColliderLabels);
    if (step) ignoredLabels.add(step.colliderLabel);
    if (!this.grounded && this.jumpLandingColliderLabel) {
      ignoredLabels.add(this.jumpLandingColliderLabel);
    }

    const resolvedFoot = this.collision.resolvePosition(
      previousFoot,
      desiredFoot,
      ignoredLabels,
    );

    const attemptedHorizontal = new Vector3(
      desired.x - previous.x,
      0,
      desired.z - previous.z,
    );
    const resolvedHorizontal = new Vector3(
      resolvedFoot.x - previousFoot.x,
      0,
      resolvedFoot.z - previousFoot.z,
    );

    this.actor.position.x = resolvedFoot.x;
    this.actor.position.z = resolvedFoot.z;

    const finalSupport = this.supports.querySupport(
      previousFoot,
      this.actor.position.subtract(new Vector3(0, this.actorGroundOffset, 0)),
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
        this.actor.position.y = nextSupportHeight + this.actorGroundOffset;
      }
    }

    if (!this.grounded) {
      this.verticalVelocity -= this.config.gravity * dt;
      this.actor.position.y += this.verticalVelocity * dt;
      this.supportHeight = nextSupportHeight;
      if (this.actor.position.y - this.actorGroundOffset <= this.supportHeight) {
        this.actor.position.y = this.supportHeight + this.actorGroundOffset;
        this.verticalVelocity = 0;
        this.grounded = true;
        this.airborneHorizontalVelocity.setAll(0);
        this.jumpLandingSurfaceId = null;
        this.jumpLandingColliderLabel = null;
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
    else if (!this.grounded && nextSupportHeight <= 0 && this.actor.position.y - this.actorGroundOffset <= 0.01) {
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
      airborneHorizontalSpeed: this.airborneHorizontalVelocity.length(),
      jumpLandingSurfaceId: this.jumpLandingSurfaceId,
    };
  }
}
