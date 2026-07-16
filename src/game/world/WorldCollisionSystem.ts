import { Vector3 } from '@babylonjs/core';
import type { WorldCollider } from './WorldTypes';

export class WorldCollisionSystem {
  enabled = true;

  constructor(
    private readonly colliders: ReadonlyArray<WorldCollider>,
    private readonly actorRadius = 0.5,
  ) {}

  resolvePosition(
    previous: Vector3,
    desired: Vector3,
    ignoredColliderLabels: ReadonlySet<string> = new Set(),
  ): Vector3 {
    if (!this.enabled) return desired.clone();
    if (!this.collides(desired, ignoredColliderLabels)) return desired.clone();

    const xOnly = new Vector3(desired.x, desired.y, previous.z);
    if (!this.collides(xOnly, ignoredColliderLabels)) return xOnly;

    const zOnly = new Vector3(previous.x, desired.y, desired.z);
    if (!this.collides(zOnly, ignoredColliderLabels)) return zOnly;

    return previous.clone();
  }

  isBlocked(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string> = new Set(),
  ): boolean {
    return this.enabled && this.collides(position, ignoredColliderLabels);
  }

  private collides(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string>,
  ): boolean {
    return this.colliders.some(collider => {
      if (ignoredColliderLabels.has(collider.label)) return false;

      if (collider.kind === 'circle') {
        const dx = position.x - collider.centerX;
        const dz = position.z - collider.centerZ;
        const radius = collider.radius + this.actorRadius;
        return dx * dx + dz * dz < radius * radius;
      }

      return (
        Math.abs(position.x - collider.centerX) <
          collider.halfWidth + this.actorRadius &&
        Math.abs(position.z - collider.centerZ) <
          collider.halfDepth + this.actorRadius
      );
    });
  }
}
