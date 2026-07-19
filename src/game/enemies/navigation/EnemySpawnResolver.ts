import { Vector3 } from '@babylonjs/core';
import type { WorldCollider } from '../../world/WorldTypes';
import type { WorldVolume } from '../../world/WorldVolumeTypes';
import type {
  EnemyNavigationCapabilities,
  EnemyNavigationFailureReason,
  EnemySpawnCandidateDebug,
} from './EnemyNavigationTypes';

export interface EnemySpawnResolution {
  position: Vector3 | null;
  candidates: readonly EnemySpawnCandidateDebug[];
  failureReason: EnemyNavigationFailureReason;
}

export class EnemySpawnResolver {
  constructor(
    private readonly colliders: ReadonlyArray<WorldCollider>,
    private readonly volumes: ReadonlyArray<WorldVolume>,
  ) {}

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
        points.push(
          new Vector3(
            requested.x + Math.cos(angle) * radius,
            0,
            requested.z + Math.sin(angle) * radius,
          ),
        );
      }
    }

    for (const point of points) {
      const reason = this.validate(point, capabilities, occupied);
      const valid = reason === 'none';
      candidates.push({ position: point.clone(), valid, reason });
      if (valid) {
        return { position: point, candidates, failureReason: 'none' };
      }
    }

    return {
      position: null,
      candidates,
      failureReason: 'spawn-position-invalid',
    };
  }

  private validate(
    point: Vector3,
    capabilities: Readonly<EnemyNavigationCapabilities>,
    occupied: readonly Vector3[],
  ): EnemyNavigationFailureReason {
    if (this.isBlocked(point, capabilities.radius)) {
      return 'blocked-by-solid';
    }

    if (this.isRestrictedVolume(point)) {
      return 'outside-navigation-zone';
    }

    const minimumSeparation = capabilities.radius * 2 + 0.25;
    if (
      occupied.some(
        position => Vector3.DistanceSquared(position, point) < minimumSeparation * minimumSeparation,
      )
    ) {
      return 'blocked-by-dynamic-obstacle';
    }

    return 'none';
  }

  private isBlocked(point: Vector3, radius: number): boolean {
    return this.colliders.some(collider => {
      if (collider.interaction === 'hazard') return false;
      if (collider.kind === 'circle') {
        const dx = point.x - collider.centerX;
        const dz = point.z - collider.centerZ;
        const combined = collider.radius + radius;
        return dx * dx + dz * dz < combined * combined;
      }
      return (
        Math.abs(point.x - collider.centerX) < collider.halfWidth + radius &&
        Math.abs(point.z - collider.centerZ) < collider.halfDepth + radius
      );
    });
  }

  private isRestrictedVolume(point: Vector3): boolean {
    return this.volumes.some(volume => {
      if (
        volume.kind !== 'water-hazard' &&
        volume.kind !== 'hazard' &&
        volume.kind !== 'constraint'
      ) {
        return false;
      }
      const footprint = volume.footprint;
      return (
        Math.abs(point.x - footprint.centerX) <= footprint.halfWidth &&
        Math.abs(point.z - footprint.centerZ) <= footprint.halfDepth
      );
    });
  }
}
