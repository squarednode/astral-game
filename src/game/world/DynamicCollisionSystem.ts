import { Vector3 } from '@babylonjs/core';
import type { DynamicBoxCollider } from './WorldTypes';

export interface DynamicCollisionResolution {
  position: Vector3;
  pushedVertically: boolean;
  supportHeight: number | null;
}

export class DynamicCollisionSystem {
  constructor(
    private readonly colliders: ReadonlyArray<DynamicBoxCollider>,
    private readonly actorRadius = 0.5,
    private readonly actorHeight = 2,
  ) {}

  resolve(
    actorPosition: Vector3,
    currentSupportHeight: number,
  ): DynamicCollisionResolution {
    const position = actorPosition.clone();
    let pushedVertically = false;
    let supportHeight: number | null = null;

    for (const collider of this.colliders) {
      if (collider.delta.lengthSquared() <= 0.0000001) continue;

      const top = collider.center.y + collider.halfHeight;
      const bottom = collider.center.y - collider.halfHeight;
      const actorBottom = position.y;
      const actorTop = position.y + this.actorHeight;
      const overlapsX =
        Math.abs(position.x - collider.center.x) <
        collider.halfWidth + this.actorRadius;
      const overlapsZ =
        Math.abs(position.z - collider.center.z) <
        collider.halfDepth + this.actorRadius;

      if (!overlapsX || !overlapsZ) continue;

      const standingOnTop =
        Math.abs(currentSupportHeight - top) <= 0.08 &&
        Math.abs(actorBottom - top) <= 0.12;
      if (standingOnTop) continue;

      const verticalOverlap = actorTop > bottom && actorBottom < top;
      if (!verticalOverlap) continue;

      if (Math.abs(collider.delta.y) > 0.0001) {
        if (collider.delta.y > 0 && actorBottom <= top) {
          position.y = top;
          pushedVertically = true;
          supportHeight = top;
        } else if (collider.delta.y < 0 && actorTop >= bottom) {
          position.y += collider.delta.y;
        }
        continue;
      }

      // Horizontal moving solids push in their travel direction rather than
      // passing through actors standing beside them.
      if (Math.abs(collider.delta.x) >= Math.abs(collider.delta.z)) {
        position.x += collider.delta.x;
        const required = collider.halfWidth + this.actorRadius + 0.01;
        if (collider.delta.x > 0) {
          position.x = Math.max(position.x, collider.center.x + required);
        } else {
          position.x = Math.min(position.x, collider.center.x - required);
        }
      } else {
        position.z += collider.delta.z;
        const required = collider.halfDepth + this.actorRadius + 0.01;
        if (collider.delta.z > 0) {
          position.z = Math.max(position.z, collider.center.z + required);
        } else {
          position.z = Math.min(position.z, collider.center.z - required);
        }
      }
    }

    return { position, pushedVertically, supportHeight };
  }
}
