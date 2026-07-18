import { TransformNode, Vector3 } from '@babylonjs/core';
import type { InputManager } from '../../engine/input/InputManager';
import {
  DEFAULT_MOVEMENT_CONFIG,
  type MovementConfig,
} from './MovementConfig';

export interface PlayerMovementCallbacks {
  canMove: () => boolean;
  getMoveSpeed: () => number;
  canDodge: () => boolean;
  onDodgeStarted: (cooldown: number) => void;
  onDodgeEnded?: () => void;
  onLanded?: (impactSpeed: number) => void;
}

export interface MovementDebugState {
  speed: number;
  grounded: boolean;
  dodging: boolean;
  invulnerable: boolean;
  movementSource: 'wasd' | 'click' | 'none';
  velocity: Vector3;
  verticalVelocity: number;
  supportHeight: number;
}

export class PlayerMovementController {
  private readonly velocity = Vector3.Zero();
  private readonly desiredDirection = Vector3.Zero();
  private readonly dodgeDirection = Vector3.Zero();

  private pointerWorld = new Vector3(0, 0, 4);
  private clickTarget: Vector3 | null = null;
  private pointerDownAt = 0;
  private pointerSteering = false;

  private verticalVelocity = 0;
  private supportHeight = 0;
  private grounded = true;
  private smoothingMovingSupport = false;

  private dodgeTimeRemaining = 0;
  private invulnerabilityTimeRemaining = 0;
  private movementSource: MovementDebugState['movementSource'] = 'none';

  constructor(
    private readonly input: InputManager,
    private readonly actor: TransformNode,
    private readonly callbacks: PlayerMovementCallbacks,
    private readonly config: Readonly<MovementConfig> = DEFAULT_MOVEMENT_CONFIG,
  ) {}

  getPointerWorld(): Vector3 {
    return this.pointerWorld;
  }

  getVelocity(): Vector3 {
    return new Vector3(
      this.velocity.x,
      this.verticalVelocity,
      this.velocity.z,
    );
  }

  getHorizontalVelocity(): Vector3 {
    return this.velocity.clone();
  }

  getVerticalVelocity(): number {
    return this.verticalVelocity;
  }

  getSupportHeight(): number {
    return this.supportHeight;
  }

  getSpeed(): number {
    return this.velocity.length();
  }

  isGrounded(): boolean {
    return this.grounded;
  }

  isDodging(): boolean {
    return this.dodgeTimeRemaining > 0;
  }

  isInvulnerable(): boolean {
    return this.invulnerabilityTimeRemaining > 0;
  }

  getDebugState(): MovementDebugState {
    return {
      speed: this.getSpeed(),
      grounded: this.grounded,
      dodging: this.isDodging(),
      invulnerable: this.isInvulnerable(),
      movementSource: this.movementSource,
      velocity: this.getVelocity(),
      verticalVelocity: this.verticalVelocity,
      supportHeight: this.supportHeight,
    };
  }

  /**
   * Updates the surface currently supporting the actor.
   *
   * Raising the support while grounded places the actor onto that surface.
   * Lowering the support starts a natural fall instead of snapping downward.
   * Airborne actors only receive the new landing height.
   */
  setSupportHeight(
    height: number,
    followMovingSupport = false,
    dt = 0,
  ): void {
    const nextHeight = Math.max(0, height);
    const priorHeight = this.supportHeight;
    this.supportHeight = nextHeight;
    this.smoothingMovingSupport = false;

    if (!this.grounded) return;

    if (followMovingSupport) {
      // Follow dynamic vertical supports with a short critically damped blend.
      // The logical support remains exact while the visible actor motion is
      // softened to avoid elevator snapping.
      const safeDt = Math.max(0, Math.min(dt, 1 / 20));
      const blend = 1 - Math.exp(-28 * safeDt);
      this.actor.position.y +=
        (nextHeight - this.actor.position.y) * blend;
      this.smoothingMovingSupport = true;
      return;
    }

    if (nextHeight < priorHeight - 0.04) {
      this.grounded = false;
      this.verticalVelocity = 0;
      return;
    }

    this.actor.position.y = nextHeight;
  }

  /**
   * Reconciles movement after the support provider changes during the frame.
   * This allows a descending jump to land on a raised log, rock, or platform.
   */
  reconcileSupportHeight(): void {
    if (
      !this.grounded &&
      this.verticalVelocity <= 0 &&
      this.actor.position.y <= this.supportHeight
    ) {
      const impactSpeed = Math.abs(this.verticalVelocity);
      this.actor.position.y = this.supportHeight;
      this.verticalVelocity = 0;
      this.grounded = true;

      if (impactSpeed >= Math.abs(this.config.landingVelocityThreshold)) {
        this.callbacks.onLanded?.(impactSpeed);
      }

      return;
    }

    if (this.grounded) {
      if (this.smoothingMovingSupport) {
        if (
          Math.abs(
            this.actor.position.y - this.supportHeight,
          ) <= 0.01
        ) {
          this.actor.position.y = this.supportHeight;
          this.smoothingMovingSupport = false;
        }
        return;
      }

      this.actor.position.y = this.supportHeight;
    }
  }

  /**
   * Used by teleports and Blink to reset vertical state without carrying an
   * old jump or support surface into the new position.
   */
  resetVerticalState(height = 0): void {
    this.supportHeight = Math.max(0, height);
    this.actor.position.y = this.supportHeight;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.smoothingMovingSupport = false;
  }

  setPointerWorld(worldPosition: Vector3): void {
    this.pointerWorld.copyFrom(worldPosition);
    this.pointerWorld.y = 0;

    if (
      this.pointerSteering &&
      this.input.getMovementMode() !== 'wasd'
    ) {
      this.clickTarget = this.pointerWorld.clone();
    }
  }

  beginPointerMovement(worldPosition: Vector3): void {
    if (this.input.getMovementMode() === 'wasd') return;

    this.pointerDownAt = performance.now();
    this.pointerSteering = true;
    this.setPointerWorld(worldPosition);
    this.clickTarget = this.pointerWorld.clone();
  }

  endPointerMovement(): void {
    if (!this.pointerSteering) return;

    const heldDuration = performance.now() - this.pointerDownAt;
    this.pointerSteering = false;

    if (heldDuration >= this.config.holdReleaseThresholdMs) {
      this.clickTarget = null;
    }
  }

  requestJump(): void {
    if (
      !this.callbacks.canMove() ||
      !this.grounded ||
      this.isDodging()
    ) {
      return;
    }

    this.grounded = false;
    this.verticalVelocity = this.config.jumpVelocity;
  }

  requestDodge(): void {
    if (!this.callbacks.canDodge() || this.isDodging()) return;

    const direction = this.getPreferredDirection();
    if (direction.lengthSquared() < 0.0001) return;

    this.dodgeDirection.copyFrom(direction.normalize());
    this.dodgeTimeRemaining = this.config.dodgeDuration;
    this.invulnerabilityTimeRemaining =
      this.config.dodgeInvulnerabilityDuration;
    this.velocity.setAll(0);
    this.clickTarget = null;
    this.callbacks.onDodgeStarted(this.config.dodgeCooldown);
  }

  update(dt: number): void {
    this.invulnerabilityTimeRemaining = Math.max(
      0,
      this.invulnerabilityTimeRemaining - dt,
    );

    if (!this.callbacks.canMove()) {
      this.velocity.setAll(0);
      return;
    }

    if (this.isDodging()) {
      this.updateDodge(dt);
      this.updateVerticalMotion(dt);
      this.applyBounds();
      return;
    }

    const desired = this.getDesiredMovementDirection();
    this.turnTowardDesiredDirection(desired, dt);

    const desiredVelocity = this.desiredDirection.scale(
      this.callbacks.getMoveSpeed(),
    );
    const rate =
      desired.lengthSquared() > 0
        ? this.config.acceleration
        : this.config.deceleration;

    this.moveVelocityToward(desiredVelocity, rate * dt);
    this.actor.position.addInPlace(this.velocity.scale(dt));

    this.updateVerticalMotion(dt);
    this.applyBounds();
  }

  private updateDodge(dt: number): void {
    const prior = this.dodgeTimeRemaining;
    const activeDt = Math.min(dt, prior);
    const speed =
      this.config.dodgeDistance / this.config.dodgeDuration;

    this.actor.position.addInPlace(
      this.dodgeDirection.scale(speed * activeDt),
    );

    this.dodgeTimeRemaining = Math.max(0, prior - dt);

    if (prior > 0 && this.dodgeTimeRemaining === 0) {
      this.callbacks.onDodgeEnded?.();
    }
  }

  private getDesiredMovementDirection(): Vector3 {
    const axes = this.input.getMoveAxes();
    let direct = new Vector3(axes.x, 0, axes.z);

    if (
      direct.lengthSquared() > 0 &&
      this.input.getMovementMode() !== 'click'
    ) {
      this.clickTarget = null;
      this.movementSource = 'wasd';

      if (
        this.input.getMovementControlScheme() === 'mouse-relative' &&
        this.input.getActiveDevice() === 'keyboard-mouse'
      ) {
        const forward = this.pointerWorld.subtract(this.actor.position);
        forward.y = 0;
        if (forward.lengthSquared() > 0.0001) {
          forward.normalize();
          const right = new Vector3(forward.z, 0, -forward.x);
          direct = forward.scale(axes.z).add(right.scale(axes.x));
        }
      }

      return direct.normalize();
    }

    if (
      this.clickTarget &&
      this.input.getMovementMode() !== 'wasd'
    ) {
      const toTarget = this.clickTarget.subtract(
        this.actor.position,
      );
      toTarget.y = 0;
      const distance = toTarget.length();

      if (distance <= this.config.arrivalRadius) {
        this.clickTarget = null;
        this.movementSource = 'none';
        return Vector3.Zero();
      }

      this.movementSource = 'click';
      return toTarget.normalize();
    }

    this.movementSource = 'none';
    return Vector3.Zero();
  }

  private turnTowardDesiredDirection(
    target: Vector3,
    dt: number,
  ): void {
    if (target.lengthSquared() <= 0.0001) {
      this.desiredDirection.setAll(0);
      return;
    }

    if (this.desiredDirection.lengthSquared() <= 0.0001) {
      this.desiredDirection.copyFrom(target);
      return;
    }

    const blend =
      1 - Math.exp(-this.config.turnResponsiveness * dt);

    Vector3.LerpToRef(
      this.desiredDirection,
      target,
      blend,
      this.desiredDirection,
    );

    if (this.desiredDirection.lengthSquared() > 0.0001) {
      this.desiredDirection.normalize();
    }
  }

  private getPreferredDirection(): Vector3 {
    const axes = this.input.getMoveAxes();
    const direct = new Vector3(axes.x, 0, axes.z);

    if (direct.lengthSquared() > 0) return direct;

    if (this.clickTarget) {
      const clickDirection = this.clickTarget.subtract(
        this.actor.position,
      );
      clickDirection.y = 0;
      if (clickDirection.lengthSquared() > 0) {
        return clickDirection;
      }
    }

    const cursorDirection = this.pointerWorld.subtract(
      this.actor.position,
    );
    cursorDirection.y = 0;

    if (cursorDirection.lengthSquared() > 0) {
      return cursorDirection;
    }

    return new Vector3(
      Math.sin(this.actor.rotation.y),
      0,
      Math.cos(this.actor.rotation.y),
    );
  }

  private moveVelocityToward(
    target: Vector3,
    maxDelta: number,
  ): void {
    const delta = target.subtract(this.velocity);
    const distance = delta.length();

    if (distance <= maxDelta || distance === 0) {
      this.velocity.copyFrom(target);
      return;
    }

    this.velocity.addInPlace(
      delta.scale(maxDelta / distance),
    );
  }

  private updateVerticalMotion(dt: number): void {
    if (this.grounded) {
      this.actor.position.y = this.supportHeight;
      return;
    }

    const priorVelocity = this.verticalVelocity;
    this.verticalVelocity -= this.config.gravity * dt;
    this.actor.position.y += this.verticalVelocity * dt;

    if (this.actor.position.y <= this.supportHeight) {
      this.actor.position.y = this.supportHeight;
      this.verticalVelocity = 0;
      this.grounded = true;

      if (
        priorVelocity <= this.config.landingVelocityThreshold
      ) {
        this.callbacks.onLanded?.(
          Math.abs(priorVelocity),
        );
      }
    }
  }

  private applyBounds(): void {
    this.actor.position.x = Math.max(
      this.config.minX,
      Math.min(this.config.maxX, this.actor.position.x),
    );
    this.actor.position.z = Math.max(
      this.config.minZ,
      Math.min(this.config.maxZ, this.actor.position.z),
    );
  }
}
