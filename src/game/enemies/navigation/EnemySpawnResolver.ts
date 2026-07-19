import { Vector3 } from '@babylonjs/core';
import type {
  EnemyNavigationCapabilities,
  EnemyNavigationFailureReason,
  EnemySpawnCandidateDebug,
} from './EnemyNavigationTypes';
import { NavigationSurfaceManager } from './NavigationSurfaceManager';

export interface EnemySpawnResolution {
  position: Vector3 | null;
  supportHeight: number;
  candidates: readonly EnemySpawnCandidateDebug[];
  failureReason: EnemyNavigationFailureReason;
}

export class EnemySpawnResolver {
  constructor(private readonly surfaces: NavigationSurfaceManager) {}

  resolve(
    requested: Vector3,
    capabilities: Readonly<EnemyNavigationCapabilities>,
    occupied: readonly Vector3[],
    searchRadius = 6,
    searchSteps = 16,
  ): EnemySpawnResolution {
    const candidates: EnemySpawnCandidateDebug[] = [];
    const points: Vector3[] = [new Vector3(requested.x, 0, requested.z)];

    for (let ring = 1; ring <= 4; ring += 1) {
      const radius = (searchRadius * ring) / 4;
      for (let index = 0; index < searchSteps; index += 1) {
        const angle = (index / searchSteps) * Math.PI * 2 + ring * 0.31;
        points.push(new Vector3(
          requested.x + Math.cos(angle) * radius,
          0,
          requested.z + Math.sin(angle) * radius,
        ));
      }
    }

    for (const point of points) {
      const support = this.surfaces.sampleSupport(point.x, point.z);
      point.y = support.height;
      const reason = this.validate(point, support.walkable, capabilities, occupied);
      const valid = reason === 'none';
      candidates.push({ position: point.clone(), valid, reason });
      if (valid) {
        return {
          position: point,
          supportHeight: support.height,
          candidates,
          failureReason: 'none',
        };
      }
    }

    return {
      position: null,
      supportHeight: 0,
      candidates,
      failureReason: 'spawn-position-invalid',
    };
  }

  private validate(
    point: Vector3,
    walkable: boolean,
    capabilities: Readonly<EnemyNavigationCapabilities>,
    occupied: readonly Vector3[],
  ): EnemyNavigationFailureReason {
    if (!walkable) return 'outside-navigation-zone';
    const support = this.surfaces.sampleSupport(point.x, point.z);
    if (this.surfaces.isBlocked(point, capabilities.radius, support)) {
      return 'blocked-by-solid';
    }
    if (this.surfaces.isDynamicBlocked(point, capabilities.radius, support)) {
      return 'blocked-by-dynamic-obstacle';
    }

    const minimumSeparation = capabilities.radius * 2 + 0.25;
    if (occupied.some(position => {
      const dx = position.x - point.x;
      const dz = position.z - point.z;
      return dx * dx + dz * dz < minimumSeparation * minimumSeparation;
    })) return 'blocked-by-dynamic-obstacle';

    return 'none';
  }
}
