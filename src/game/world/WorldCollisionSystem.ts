import { Vector3 } from '@babylonjs/core';
import type { WorldCollider } from './WorldTypes';

export interface BlinkResolution {
  position: Vector3;
  reachedRequestedDestination: boolean;
  blockedBySolid: boolean;
}

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
    if (!this.collides(desired, ignoredColliderLabels, false)) {
      return desired.clone();
    }

    const xOnly = new Vector3(desired.x, desired.y, previous.z);
    if (!this.collides(xOnly, ignoredColliderLabels, false)) {
      return xOnly;
    }

    const zOnly = new Vector3(previous.x, desired.y, desired.z);
    if (!this.collides(zOnly, ignoredColliderLabels, false)) {
      return zOnly;
    }

    return previous.clone();
  }

  isBlocked(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string> = new Set(),
  ): boolean {
    return (
      this.enabled &&
      this.collides(position, ignoredColliderLabels, true)
    );
  }

  isValidBlinkLanding(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string> = new Set(),
  ): boolean {
    return !this.collides(position, ignoredColliderLabels, true);
  }

  resolveBlink(
    start: Vector3,
    requestedDestination: Vector3,
    maximumDistance: number,
    ignoredColliderLabels: ReadonlySet<string> = new Set(),
  ): BlinkResolution {
    const direction = requestedDestination.subtract(start);
    direction.y = 0;

    const requestedDistance = direction.length();
    if (requestedDistance <= 0.001) {
      return {
        position: start.clone(),
        reachedRequestedDestination: false,
        blockedBySolid: false,
      };
    }

    direction.normalize();
    const distance = Math.min(requestedDistance, maximumDistance);
    const step = 0.22;

    let lastPathPoint = start.clone();
    let blockedBySolid = false;

    // Hazards such as water do not block Blink's path. Solid objects do.
    for (let traveled = step; traveled <= distance; traveled += step) {
      const point = start.add(direction.scale(traveled));
      point.y = 0;

      if (
        this.collides(
          point,
          ignoredColliderLabels,
          false,
          true,
        )
      ) {
        blockedBySolid = true;
        break;
      }

      lastPathPoint = point;
    }

    // Backtrack from the furthest path point until valid land is found.
    let landing = lastPathPoint.clone();
    let foundLanding = this.isValidBlinkLanding(
      landing,
      ignoredColliderLabels,
    );

    while (
      !foundLanding &&
      Vector3.DistanceSquared(landing, start) > step * step
    ) {
      landing.subtractInPlace(direction.scale(step));
      landing.y = 0;
      foundLanding = this.isValidBlinkLanding(
        landing,
        ignoredColliderLabels,
      );
    }

    if (!foundLanding) {
      landing.copyFrom(start);
    }

    const requestedCapped = start.add(direction.scale(distance));
    requestedCapped.y = 0;

    return {
      position: landing,
      reachedRequestedDestination:
        Vector3.DistanceSquared(landing, requestedCapped) < 0.12,
      blockedBySolid,
    };
  }

  private collides(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string>,
    includeHazards: boolean,
    solidOnly = false,
  ): boolean {
    return this.colliders.some(collider => {
      if (ignoredColliderLabels.has(collider.label)) return false;
      if (
        collider.minimumY !== undefined &&
        position.y < collider.minimumY
      ) {
        return false;
      }
      if (
        collider.maximumY !== undefined &&
        position.y > collider.maximumY
      ) {
        return false;
      }
      if (solidOnly && collider.interaction !== 'solid') return false;
      if (!includeHazards && collider.interaction === 'hazard') {
        return false;
      }

      // Traversable objects block at ground level, but an airborne actor may
      // pass above them and land on the support surface provided separately.
      if (
        collider.interaction === 'traversable' &&
        position.y >= (collider.clearanceHeight ?? 0.65) - 0.05
      ) {
        return false;
      }

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
