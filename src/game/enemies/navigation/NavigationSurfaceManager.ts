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


export interface NavigationFootprintSample {
  ratio: number;
  supported: number;
  total: number;
  center: NavigationSupportSample;
}

export interface NavigationSweepResult {
  clear: boolean;
  reason: 'none' | 'body-overlap' | 'insufficient-support' | 'blocked-by-dynamic-obstacle';
  position: Vector3;
  support: NavigationSupportSample;
  supportRatio: number;
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

  sampleFootprint(position: Vector3, radius: number): NavigationFootprintSample {
    const center = this.sampleSupport(position.x, position.z);
    const offsets = [
      [0, 0],
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707],
    ] as const;
    let supported = 0;
    for (const [ox, oz] of offsets) {
      const sample = this.sampleSupport(
        position.x + ox * radius,
        position.z + oz * radius,
      );
      if (
        sample.walkable &&
        Math.abs(sample.height - center.height) <= 0.48
      ) supported += 1;
    }
    return {
      ratio: supported / offsets.length,
      supported,
      total: offsets.length,
      center,
    };
  }

  sweepBody(
    start: Vector3,
    end: Vector3,
    radius: number,
    actorOffset: number,
    minimumSupportRatio: number,
  ): NavigationSweepResult {
    const distance = Vector3.Distance(start, end);
    const stepSize = Math.max(0.08, Math.min(0.22, radius * 0.45));
    const steps = Math.max(1, Math.ceil(distance / stepSize));
    let last = start.clone();
    let lastSupport = this.sampleSupport(start.x, start.z);
    let lastRatio = 1;
    for (let index = 1; index <= steps; index += 1) {
      const point = Vector3.Lerp(start, end, index / steps);
      const footprint = this.sampleFootprint(point, radius);
      point.y = footprint.center.height + actorOffset;
      if (!footprint.center.walkable || footprint.ratio < minimumSupportRatio) {
        return {
          clear: false,
          reason: 'insufficient-support',
          position: last,
          support: lastSupport,
          supportRatio: footprint.ratio,
        };
      }
      if (this.isBlocked(point, radius, footprint.center)) {
        return {
          clear: false,
          reason: 'body-overlap',
          position: last,
          support: lastSupport,
          supportRatio: footprint.ratio,
        };
      }
      if (this.isDynamicBlocked(point, radius, footprint.center)) {
        return {
          clear: false,
          reason: 'blocked-by-dynamic-obstacle',
          position: last,
          support: lastSupport,
          supportRatio: footprint.ratio,
        };
      }
      last = point;
      lastSupport = footprint.center;
      lastRatio = footprint.ratio;
    }
    return {
      clear: true,
      reason: 'none',
      position: end.clone(),
      support: lastSupport,
      supportRatio: lastRatio,
    };
  }


  findEscapePosition(
    current: Vector3,
    goal: Vector3,
    radius: number,
    actorOffset: number,
    minimumSupportRatio: number,
    maximumSearchRadius = 4.5,
  ): Vector3 | null {
    const directDistance = Vector3.Distance(current, goal);
    let best: Vector3 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const rings = [radius * 1.5, radius * 2.25, radius * 3.25, maximumSearchRadius];

    for (const ring of rings) {
      const clampedRing = Math.min(maximumSearchRadius, Math.max(radius + 0.15, ring));
      for (let index = 0; index < 16; index += 1) {
        const angle = (Math.PI * 2 * index) / 16;
        const candidate = current.add(new Vector3(
          Math.cos(angle) * clampedRing,
          0,
          Math.sin(angle) * clampedRing,
        ));
        const support = this.sampleSupport(candidate.x, candidate.z);
        if (!support.walkable) continue;
        candidate.y = support.height + actorOffset;
        const footprint = this.sampleFootprint(candidate, radius);
        if (footprint.ratio < minimumSupportRatio) continue;
        if (this.isBlocked(candidate, radius, support)) continue;
        if (this.isDynamicBlocked(candidate, radius, support)) continue;

        const sweep = this.sweepBody(
          current,
          candidate,
          radius,
          actorOffset,
          minimumSupportRatio,
        );
        if (!sweep.clear) continue;

        const goalDistance = Vector3.Distance(candidate, goal);
        const improvement = directDistance - goalDistance;
        const score = goalDistance - improvement * 0.75 + clampedRing * 0.15;
        if (score < bestScore) {
          best = candidate.clone();
          bestScore = score;
        }
      }
      if (best) return best;
    }
    return best;
  }

  findConnectedExit(
    landing: Vector3,
    goal: Vector3,
    radius: number,
    actorOffset: number,
    minimumSupportRatio: number,
  ): Vector3 | null {
    const toGoal = goal.subtract(landing);
    toGoal.y = 0;
    if (toGoal.lengthSquared() <= 0.0001) return landing.clone();
    toGoal.normalize();
    const tangent = new Vector3(-toGoal.z, 0, toGoal.x);
    const stride = Math.max(radius * 1.35, 0.65);
    const candidates = [
      landing.add(toGoal.scale(stride)),
      landing.add(toGoal.scale(stride * 0.65)).add(tangent.scale(stride * 0.8)),
      landing.add(toGoal.scale(stride * 0.65)).add(tangent.scale(-stride * 0.8)),
    ];
    for (const candidate of candidates) {
      const support = this.sampleSupport(candidate.x, candidate.z);
      if (!support.walkable) continue;
      candidate.y = support.height + actorOffset;
      const footprint = this.sampleFootprint(candidate, radius);
      if (footprint.ratio < minimumSupportRatio) continue;
      if (this.isBlocked(candidate, radius, support)) continue;
      if (this.isDynamicBlocked(candidate, radius, support)) continue;
      return candidate;
    }
    return null;
  }

  validateLanding(
    landing: Vector3,
    radius: number,
    actorOffset: number,
    minimumSupportRatio: number,
  ): { valid: boolean; position: Vector3; support: NavigationSupportSample; ratio: number } {
    const position = landing.clone();
    const support = this.sampleSupport(position.x, position.z);
    position.y = support.height + actorOffset;
    const footprint = this.sampleFootprint(position, radius);
    const valid = support.walkable &&
      footprint.ratio >= minimumSupportRatio &&
      !this.isBlocked(position, radius, support) &&
      !this.isDynamicBlocked(position, radius, support);
    return { valid, position, support, ratio: footprint.ratio };
  }

  projectToSupport(position: Vector3, actorOffset: number): NavigationSupportSample {
    const sample = this.sampleSupport(position.x, position.z);
    if (sample.walkable) position.y = sample.height + actorOffset;
    return sample;
  }

  isBlocked(position: Vector3, radius: number, support: NavigationSupportSample): boolean {
    const supportingSurface = support.surfaceId
      ? this.surfaces.find(surface => surface.id === support.surfaceId)
      : undefined;
    return this.colliders.some(collider => {
      if (collider.interaction === 'hazard') return false;
      if (supportingSurface?.colliderLabel === collider.label) {
        const supportTop = support.height;
        if (position.y - radius >= supportTop - 0.16) return false;
      }
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
