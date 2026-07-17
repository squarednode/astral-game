import { Vector3 } from '@babylonjs/core';
import { GameBalance } from '../config/GameBalance';
import type {
  FreeTraversalSurface,
  GuidedTraversalSurface,
  TraversalSurface,
} from './WorldTypes';

export type SurfaceMovementMode =
  | 'ground'
  | 'guided'
  | 'free';

export interface SurfaceResolution {
  supportHeight: number;
  ignoredColliderLabels: ReadonlySet<string>;
  surfaceId: string | null;
  mode: SurfaceMovementMode;
  surfaceDelta: Vector3;
}

export interface StepUpCandidate {
  surfaceId: string;
  colliderLabel: string;
  supportHeight: number;
}

interface GuidedProjection {
  progress: number;
  lateralDistance: number;
}

/**
 * Passive support resolver.
 *
 * It never changes horizontal position. Given a final X/Z foot location, it
 * reports the highest valid support height beneath that point.
 */
export class TraversalSurfaceSystem {
  enabled = true;

  private currentSupportSurfaceId: string | null = null;
  private releasedSurfaceId: string | null = null;
  private readonly actorRadius = 0.5;
  private readonly releaseClearance = 0.04;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    this.currentSupportSurfaceId = null;
    this.releasedSurfaceId = null;
  }

  releaseForBlink(): void {
    this.reset();
  }

  getCurrentSupportSurfaceId(): string | null {
    return this.currentSupportSurfaceId;
  }

  /**
   * Called after dynamic world geometry updates but before player input.
   * A supported actor inherits the current platform movement exactly once.
   */
  getCurrentSupportDelta(): Vector3 {
    if (!this.currentSupportSurfaceId) {
      return Vector3.Zero();
    }

    const surface = this.surfaces.find(
      candidate =>
        candidate.id === this.currentSupportSurfaceId,
    );

    return surface?.frameDelta?.clone() ?? Vector3.Zero();
  }

  /**
   * Finds a legal low obstacle before horizontal collision rejects the move.
   * The actor center may still be outside the top footprint while the capsule
   * is touching its front face.
   */
  queryStepUp(
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    currentSupportHeight: number,
  ): StepUpCandidate | null {
    if (!this.enabled || !grounded) return null;

    const movementX = desired.x - previous.x;
    const movementZ = desired.z - previous.z;
    if (movementX * movementX + movementZ * movementZ < 0.000001) {
      return null;
    }

    const candidates = this.surfaces
      .filter(
        (surface): surface is FreeTraversalSurface =>
          surface.mode === 'free',
      )
      .filter(surface =>
        this.isWalkableSlope(surface),
      )
      .filter(surface =>
        !this.isInsideFree(surface, previous),
      )
      .filter(surface =>
        this.isInsideFreeExpanded(
          surface,
          desired,
          this.actorRadius,
        ),
      )
      .map(surface => ({
        surface,
        supportHeight: this.sampleHeight(
          surface,
          desired.x,
          desired.z,
        ),
      }))
      .filter(candidate => {
        const rise =
          candidate.supportHeight - currentSupportHeight;
        return (
          rise > 0.005 &&
          rise <=
            GameBalance.movement.stepHeight + 0.015
        );
      })
      .sort(
        (a, b) =>
          b.supportHeight - a.supportHeight,
      );

    const selected = candidates[0];
    if (!selected) return null;

    return {
      surfaceId: selected.surface.id,
      colliderLabel: selected.surface.colliderLabel,
      supportHeight: selected.supportHeight,
    };
  }

  /**
   * Returns support data only. X/Z are never modified.
   */
  querySupport(
    previous: Vector3,
    footPosition: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
  ): SurfaceResolution {
    if (!this.enabled) {
      this.reset();
      return this.groundResolution();
    }

    const priorOwner = this.currentSupportSurfaceId
      ? this.surfaces.find(
          surface =>
            surface.id === this.currentSupportSurfaceId,
        )
      : undefined;

    const candidates = this.surfaces
      .filter(surface =>
        this.containsFootPoint(surface, footPosition),
      )
      .filter(surface =>
        this.isWalkableSlope(surface),
      )
      .map(surface => {
        const supportHeight = this.sampleHeight(
          surface,
          footPosition.x,
          footPosition.z,
        );

        return {
          surface,
          supportHeight,
        };
      })
      .filter(candidate =>
        this.isValidVerticalContact(
          candidate.supportHeight,
          previous,
          footPosition,
          grounded,
          verticalVelocity,
          currentSupportHeight,
          candidate.surface.id ===
            this.currentSupportSurfaceId,
        ),
      )
      .sort(
        (a, b) =>
          b.supportHeight - a.supportHeight,
      );

    const selected = candidates[0];

    if (selected) {
      this.currentSupportSurfaceId =
        selected.surface.id;
      this.releasedSurfaceId = null;

      return {
        supportHeight: selected.supportHeight,
        ignoredColliderLabels: new Set([
          selected.surface.colliderLabel,
        ]),
        surfaceId: selected.surface.id,
        mode: selected.surface.mode,
        surfaceDelta:
          selected.surface.frameDelta?.clone() ??
          Vector3.Zero(),
      };
    }

    this.currentSupportSurfaceId = null;

    if (priorOwner) {
      this.releasedSurfaceId = priorOwner.id;
    }

    const ignored = new Set<string>();
    const releasedSurface = this.releasedSurfaceId
      ? this.surfaces.find(
          surface =>
            surface.id === this.releasedSurfaceId,
        )
      : undefined;

    if (
      releasedSurface &&
      this.isInsideSurfaceExpanded(
        releasedSurface,
        footPosition,
        this.actorRadius + this.releaseClearance,
      )
    ) {
      ignored.add(releasedSurface.colliderLabel);
    } else {
      this.releasedSurfaceId = null;
    }

    return {
      supportHeight: 0,
      ignoredColliderLabels: ignored,
      surfaceId: null,
      mode: 'ground',
      surfaceDelta: Vector3.Zero(),
    };
  }

  private isValidVerticalContact(
    supportHeight: number,
    previous: Vector3,
    footPosition: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
    isCurrentOwner: boolean,
  ): boolean {
    const heightDifference =
      supportHeight - currentSupportHeight;

    if (grounded && isCurrentOwner) {
      return (
        Math.abs(heightDifference) <=
        GameBalance.movement.maximumJumpOntoHeight
      );
    }

    if (grounded) {
      return (
        heightDifference <=
          GameBalance.movement.stepHeight + 0.015 &&
        heightDifference >=
          -GameBalance.movement.groundSnapDistance
      );
    }

    if (verticalVelocity > 0) {
      return false;
    }

    if (
      heightDifference >
      GameBalance.movement.maximumJumpOntoHeight
    ) {
      return false;
    }

    return this.crossesSurfaceHeight(
      previous,
      footPosition,
      supportHeight,
    );
  }

  private containsFootPoint(
    surface: TraversalSurface,
    position: Vector3,
  ): boolean {
    if (surface.mode === 'guided') {
      const projection = this.projectOntoGuided(
        surface,
        position,
      );

      return (
        projection.progress >= 0 &&
        projection.progress <= 1 &&
        projection.lateralDistance <=
          surface.width / 2
      );
    }

    return this.isInsideFree(surface, position);
  }

  private isInsideSurfaceExpanded(
    surface: TraversalSurface,
    position: Vector3,
    padding: number,
  ): boolean {
    if (surface.mode === 'guided') {
      const projection = this.projectOntoGuided(
        surface,
        position,
      );
      return (
        projection.progress >=
          -padding / Math.max(
            0.001,
            Vector3.Distance(surface.start, surface.end),
          ) &&
        projection.progress <=
          1 +
            padding / Math.max(
              0.001,
              Vector3.Distance(surface.start, surface.end),
            ) &&
        projection.lateralDistance <=
          surface.width / 2 + padding
      );
    }

    return this.isInsideFreeExpanded(
      surface,
      position,
      padding,
    );
  }

  private isInsideFreeExpanded(
    surface: FreeTraversalSurface,
    position: Vector3,
    padding: number,
  ): boolean {
    if (surface.shape === 'box') {
      return (
        Math.abs(position.x - surface.center.x) <=
          surface.halfWidth + padding &&
        Math.abs(position.z - surface.center.z) <=
          surface.halfDepth + padding
      );
    }

    const dx = position.x - surface.center.x;
    const dz = position.z - surface.center.z;
    const radius = surface.radius + padding;
    return dx * dx + dz * dz <= radius * radius;
  }

  private isWalkableSlope(
    surface: TraversalSurface,
  ): boolean {
    return (
      (surface.slopeDegrees ?? 0) <=
      GameBalance.movement.maximumWalkableSlopeDegrees
    );
  }

  private sampleHeight(
    surface: TraversalSurface,
    x: number,
    z: number,
  ): number {
    return surface.sampleHeight
      ? surface.sampleHeight(x, z)
      : surface.surfaceHeight;
  }

  private crossesSurfaceHeight(
    previous: Vector3,
    desired: Vector3,
    supportHeight: number,
  ): boolean {
    const snap =
      GameBalance.movement.groundSnapDistance;

    return (
      previous.y >= supportHeight - snap &&
      desired.y <= supportHeight + snap
    );
  }

  private projectOntoGuided(
    surface: GuidedTraversalSurface,
    position: Vector3,
  ): GuidedProjection {
    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const length = axis.length();

    if (length <= 0.0001) {
      return {
        progress: 0,
        lateralDistance:
          Number.POSITIVE_INFINITY,
      };
    }

    axis.scaleInPlace(1 / length);
    const perpendicular = new Vector3(
      -axis.z,
      0,
      axis.x,
    );
    const relative = position.subtract(
      surface.start,
    );
    relative.y = 0;

    return {
      progress:
        Vector3.Dot(relative, axis) / length,
      lateralDistance: Math.abs(
        Vector3.Dot(relative, perpendicular),
      ),
    };
  }

  private isInsideFree(
    surface: FreeTraversalSurface,
    position: Vector3,
  ): boolean {
    if (surface.shape === 'box') {
      return (
        Math.abs(
          position.x - surface.center.x,
        ) <= surface.halfWidth &&
        Math.abs(
          position.z - surface.center.z,
        ) <= surface.halfDepth
      );
    }

    const dx = position.x - surface.center.x;
    const dz = position.z - surface.center.z;

    return (
      dx * dx + dz * dz <=
      surface.radius * surface.radius
    );
  }

  private groundResolution(): SurfaceResolution {
    return {
      supportHeight: 0,
      ignoredColliderLabels: new Set(),
      surfaceId: null,
      mode: 'ground',
      surfaceDelta: Vector3.Zero(),
    };
  }
}
