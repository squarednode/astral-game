import type { Mesh, Vector3 } from '@babylonjs/core';

export type DamageElement = 'physical' | 'fire' | 'frost' | 'lightning' | 'arcane';
export type HitWeight = 'light' | 'heavy' | 'reaction';

export interface KnockbackTarget {
  mesh: Mesh;
  knockbackVelocity: Vector3;
}
