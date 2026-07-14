import { GameBalance } from '../config/GameBalance';

export interface MovementConfig {
  acceleration: number;
  deceleration: number;
  turnResponsiveness: number;
  arrivalRadius: number;
  holdReleaseThresholdMs: number;
  dodgeDistance: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  dodgeInvulnerabilityDuration: number;
  jumpVelocity: number;
  gravity: number;
  landingVelocityThreshold: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const DEFAULT_MOVEMENT_CONFIG: Readonly<MovementConfig> =
  GameBalance.movement;
