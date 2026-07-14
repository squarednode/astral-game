import { Vector3 } from '@babylonjs/core';
import type { PlayerCameraController } from '../camera/PlayerCameraController';
import { DEFAULT_COMBAT_CONFIG } from './CombatConfig';
import type { CombatConfig } from './CombatConfig';
import type { DamageNumberManager } from './DamageNumberManager';
import type { HitFeedbackController } from './HitFeedbackController';
import type { DamageElement, HitWeight, KnockbackTarget } from './CombatTypes';

export class CombatSystem {
  private hitStopRemaining = 0;
  private playerHitInvulnerabilityRemaining = 0;

  constructor(
    private readonly damageNumbers: DamageNumberManager,
    private readonly hitFeedback: HitFeedbackController,
    private readonly camera: PlayerCameraController,
    private readonly config: Readonly<CombatConfig> = DEFAULT_COMBAT_CONFIG,
  ) {}

  applyEnemyHit(options: {
    target: KnockbackTarget;
    damage: number;
    element: DamageElement;
    worldPosition: Vector3;
    sourcePosition: Vector3;
    weight?: HitWeight;
  }): void {
    const weight = options.weight ?? 'light';
    this.damageNumbers.spawn(options.worldPosition, options.damage, options.element);
    this.hitFeedback.flashEnemy(options.target.mesh, weight);
    const direction = options.target.mesh.position.subtract(options.sourcePosition);
    direction.y = 0;
    if (direction.lengthSquared() > 0.0001) {
      direction.normalize();
      const speed = weight === 'light' ? this.config.lightKnockbackSpeed : this.config.heavyKnockbackSpeed;
      options.target.knockbackVelocity.addInPlace(direction.scale(speed));
    }
    const stop = weight === 'reaction' ? this.config.reactionHitStopSeconds : weight === 'heavy' ? this.config.heavyHitStopSeconds : this.config.lightHitStopSeconds;
    this.hitStopRemaining = Math.max(this.hitStopRemaining, stop);
    const shake = weight === 'reaction' ? this.config.cameraShakeReaction : weight === 'heavy' ? this.config.cameraShakeHeavy : this.config.cameraShakeLight;
    this.camera.requestShake(shake);
  }

  showReaction(position: Vector3, label: string, element: DamageElement): void {
    this.damageNumbers.spawn(position, 0, element, label);
  }

  registerPlayerHit(): boolean {
    if (this.playerHitInvulnerabilityRemaining > 0) return false;
    this.playerHitInvulnerabilityRemaining = this.config.playerHitInvulnerabilitySeconds;
    this.hitFeedback.flashPlayer();
    this.camera.requestShake(this.config.cameraShakeHeavy);
    return true;
  }

  update(realDt: number): number {
    this.hitStopRemaining = Math.max(0, this.hitStopRemaining - realDt);
    this.playerHitInvulnerabilityRemaining = Math.max(0, this.playerHitInvulnerabilityRemaining - realDt);
    this.damageNumbers.update(realDt);
    this.hitFeedback.update(realDt);
    return this.hitStopRemaining > 0 ? 0 : realDt;
  }

  updateKnockback(target: KnockbackTarget, dt: number): void {
    if (target.knockbackVelocity.lengthSquared() <= 0.0001) { target.knockbackVelocity.setAll(0); return; }
    target.mesh.position.addInPlace(target.knockbackVelocity.scale(dt));
    target.knockbackVelocity.scaleInPlace(Math.max(0, 1 - this.config.knockbackDecay * dt));
  }
}
