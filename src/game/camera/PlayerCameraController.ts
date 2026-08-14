import { ArcRotateCamera, TransformNode, Vector3 } from '@babylonjs/core';
import { GameBalance } from '../config/GameBalance';
import { updateProceduralRunnerCamera } from './ProceduralRunnerCamera';

const STANDARD_ALPHA = -Math.PI / 2;
const STANDARD_BETA = 0.92;

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export class PlayerCameraController {
  private readonly lookAhead = Vector3.Zero();
  private readonly target = Vector3.Zero();
  private shakeMagnitude = 0;
  private shakeTime = 0;

  constructor(
    private readonly camera: ArcRotateCamera,
    private readonly actor: TransformNode,
    private readonly getVelocity: () => Vector3,
  ) {
    this.target.copyFrom(actor.position);
  }

  requestShake(magnitude: number, duration = 0.14): void {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  update(dt: number): void {
    const velocity = this.getVelocity();

    // Procedural runner spaces own only camera framing. Player input and
    // movement remain in PlayerMovementController. Authored spaces fall
    // through to the standard main-game camera below.
    if (updateProceduralRunnerCamera(this.camera, this.actor, velocity, dt)) {
      this.applyShake(dt);
      return;
    }

    // Runner cameras may leave alpha/beta on either side of the player.
    // Authored spaces always settle back through the shortest angular path;
    // this prevents a 180-degree wrap followed by a second 90-degree correction
    // when entering boss/town-style portal spaces.
    const alphaDelta = normalizeAngle(STANDARD_ALPHA - this.camera.alpha);
    this.camera.alpha += alphaDelta * (1 - Math.exp(-1.8 * dt));
    this.camera.beta += (STANDARD_BETA - this.camera.beta) * (1 - Math.exp(-1.8 * dt));

    const planarVelocity = new Vector3(velocity.x, 0, velocity.z);
    const speed = planarVelocity.length();

    const desiredLookAhead = speed > 0.05
      ? planarVelocity.normalize().scale(GameBalance.camera.lookAheadDistance)
      : Vector3.Zero();

    const lookBlend = 1 - Math.exp(-GameBalance.camera.lookAheadSharpness * dt);
    Vector3.LerpToRef(this.lookAhead, desiredLookAhead, lookBlend, this.lookAhead);

    const desiredTarget = this.actor.position.add(this.lookAhead);
    const followBlend = 1 - Math.exp(-GameBalance.camera.followSharpness * dt);
    Vector3.LerpToRef(this.target, desiredTarget, followBlend, this.target);
    this.camera.target.copyFrom(this.target);

    this.applyShake(dt);

    const movementRatio = Math.min(
      1,
      speed / GameBalance.camera.movementSpeedForFullZoom,
    );
    const desiredRadius =
      GameBalance.camera.idleRadius +
      (GameBalance.camera.movingRadius - GameBalance.camera.idleRadius) *
        movementRatio;
    const zoomBlend = 1 - Math.exp(-GameBalance.camera.zoomSharpness * dt);
    this.camera.radius += (desiredRadius - this.camera.radius) * zoomBlend;
  }

  private applyShake(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const fade = Math.min(1, this.shakeTime / 0.14);
      this.camera.target.addInPlace(new Vector3(
        (Math.random() - 0.5) * this.shakeMagnitude * fade,
        0,
        (Math.random() - 0.5) * this.shakeMagnitude * fade,
      ));
    } else {
      this.shakeMagnitude = 0;
    }
  }
}
