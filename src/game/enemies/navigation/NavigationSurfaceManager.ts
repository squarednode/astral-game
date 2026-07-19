import { Vector3 } from '@babylonjs/core';
import type {
  DynamicBoxCollider,
  TraversalSurface,
  WorldCollider,
} from '../../world/WorldTypes';
import type { WorldVolume } from '../../world/WorldVolumeTypes';

export type NavigationSurfaceType =
  | 'ground'
  | 'bridge'
  | 'platform'
  | 'lift'
  | 'dynamic-platform'
  | 'none';

export interface NavigationSupportSample {
  height: number;
  type: NavigationSurfaceType;
  surfaceId: string | null;
  walkable: boolean;
  restrictedBy: string | null;
}

export class NavigationSurfaceManager {
  constructor(
    private readonly colliders: ReadonlyArray<WorldCollider>,
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
    private readonly dynamicColliders: ReadonlyArray<DynamicBoxCollider>,
    private readonly volumes: ReadonlyArray<WorldVolume>,
  ) {}

  sampleSupport(x: number, z: number): NavigationSupportSample {
    let best: NavigationSupportSample = {
      height: 0,
      type: 'ground',
      surfaceId: null,
      walkable: true,
      restrictedBy: null,
    };

    for (const surface of this.surfaces) {
      if (!this.surfaceContains(surface, x, z)) continue;
      const height = surface.sampleHeight
        ? surface.sampleHeight(x, z)
        : surface.surfaceHeight;
      if (height < best.height - 0.001) continue;
      best = {
        height,
        type: this.classifySurface(surface),
        surfaceId: surface.id,
        walkable: true,
        restrictedBy: null,
      };
    }

    for (const collider of this.dynamicColliders) {
      if (
        Math.abs(x - collider.center.x) <= collider.halfWidth &&
        Math.abs(z - collider.center.z) <= collider.halfDepth
      ) {
        const height = collider.center.y + collider.halfHeight;
        if (height >= best.height - 0.001) {
          best = {
            height,
            type: 'dynamic-platform',
            surfaceId: collider.id,
            walkable: true,
            restrictedBy: null,
          };
        }
      }
    }

    const restriction = this.restrictionAt(x, z, best.height, best.type);
    if (restriction) {
      best.walkable = false;
      best.restrictedBy = restriction;
    }
    return best;
  }

  projectToSupport(position: Vector3, actorOffset: number): NavigationSupportSample {
    const sample = this.sampleSupport(position.x, position.z);
    if (sample.walkable) position.y = sample.height + actorOffset;
    return sample;
  }

  isBlocked(position: Vector3, radius: number, support: NavigationSupportSample): boolean {
    return this.colliders.some(collider => {
      if (collider.interaction === 'hazard') return false;
      if (
        collider.interaction === 'traversable' &&
        support.height >= (collider.clearanceHeight ?? 0.65) - 0.08
      ) return false;

      if (collider.minimumY !== undefined && position.y + radius < collider.minimumY) return false;
      if (collider.maximumY !== undefined && position.y - radius > collider.maximumY) return false;

      if (collider.kind === 'circle') {
        const dx = position.x - collider.centerX;
        const dz = position.z - collider.centerZ;
        const combined = collider.radius + radius;
        return dx * dx + dz * dz < combined * combined;
      }
      return (
        Math.abs(position.x - collider.centerX) < collider.halfWidth + radius &&
        Math.abs(position.z - collider.centerZ) < collider.halfDepth + radius
      );
    });
  }

  isDynamicBlocked(position: Vector3, radius: number, support: NavigationSupportSample): boolean {
    return this.dynamicColliders.some(collider => {
      if (support.surfaceId === collider.id) return false;
      const onTop = position.y >= collider.center.y + collider.halfHeight - 0.08;
      if (onTop) return false;
      return (
        Math.abs(position.x - collider.center.x) < collider.halfWidth + radius &&
        Math.abs(position.z - collider.center.z) < collider.halfDepth + radius
      );
    });
  }

  private restrictionAt(
    x: number,
    z: number,
    supportHeight: number,
    supportType: NavigationSurfaceType,
  ): string | null {
    for (const volume of this.volumes) {
      if (
        volume.kind !== 'constraint' &&
        volume.kind !== 'hazard' &&
        volume.kind !== 'water-hazard'
      ) continue;
      const footprint = volume.footprint;
      const inside =
        Math.abs(x - footprint.centerX) <= footprint.halfWidth &&
        Math.abs(z - footprint.centerZ) <= footprint.halfDepth;
      if (!inside) continue;
      if (volume.minimumY !== undefined && supportHeight < volume.minimumY) continue;
      if (volume.maximumY !== undefined && supportHeight > volume.maximumY) continue;

      // A bridge/platform is an explicit walkable support and takes precedence
      // over an overlapping water or ground-contact hazard volume.
      if (
        (supportType === 'bridge' ||
          supportType === 'platform' ||
          supportType === 'lift' ||
          supportType === 'dynamic-platform') &&
        supportHeight > 0.04
      ) continue;
      return volume.id;
    }
    return null;
  }

  private classifySurface(surface: TraversalSurface): NavigationSurfaceType {
    const token = `${surface.id} ${surface.label} ${surface.colliderLabel}`.toLowerCase();
    if (token.includes('bridge')) return 'bridge';
    if (token.includes('elevator') || token.includes('lift')) return 'lift';
    return 'platform';
  }

  private surfaceContains(surface: TraversalSurface, x: number, z: number): boolean {
    if (surface.mode === 'guided') {
      const axis = surface.end.subtract(surface.start);
      axis.y = 0;
      const lengthSquared = axis.lengthSquared();
      if (lengthSquared <= 0.0001) return false;
      const relative = new Vector3(x, 0, z).subtract(surface.start);
      const progress = Math.max(0, Math.min(1, Vector3.Dot(relative, axis) / lengthSquared));
      const closest = surface.start.add(axis.scale(progress));
      const dx = x - closest.x;
      const dz = z - closest.z;
      return dx * dx + dz * dz <= (surface.width * 0.5) ** 2;
    }
    if (surface.shape === 'circle') {
      const dx = x - surface.center.x;
      const dz = z - surface.center.z;
      return dx * dx + dz * dz <= surface.radius * surface.radius;
    }
    return (
      Math.abs(x - surface.center.x) <= surface.halfWidth &&
      Math.abs(z - surface.center.z) <= surface.halfDepth
    );
  }
}
