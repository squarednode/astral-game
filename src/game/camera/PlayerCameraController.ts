import { ArcRotateCamera, TransformNode, Vector3 } from '@babylonjs/core';
import { GameBalance } from '../config/GameBalance';

export class PlayerCameraController {
  private readonly lookAhead = Vector3.Zero();
  private readonly target = Vector3.Zero();

  constructor(
    private readonly camera: ArcRotateCamera,
    private readonly actor: TransformNode,
    private readonly getVelocity: () => Vector3,
  ) {
    this.target.copyFrom(actor.position);
  }

  update(dt: number): void {
    const velocity = this.getVelocity();
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
}
