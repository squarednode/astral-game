import { Vector3 } from '@babylonjs/core';
import type {
  FreeTraversalSurface,
  GuidedTraversalSurface,
  TraversalSurface,
} from './WorldTypes';

export type SurfaceMovementMode =
  | 'ground'
  | 'guided'
  | 'free';

export type LandingValidator = (
  position: Vector3,
  ignoredColliderLabels: ReadonlySet<string>,
) => boolean;

export interface SurfaceResolution {
  position: Vector3;
  supportHeight: number;
  ignoredColliderLabels: ReadonlySet<string>;
  surfaceId: string | null;
  mode: SurfaceMovementMode;
}

interface GuidedProjection {
  progress: number;
  clampedProgress: number;
  lateralDistance: number;
  closestPoint: Vector3;
}

export class TraversalSurfaceSystem {
  enabled = true;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    // Continuous support has no active traversal state to clear.
  }

  releaseForBlink(): void {
    // Continuous support will be recalculated from Blink's destination.
  }

  /**
   * Performs a stateless geometry query.
   *
   * The same surface must be rediscovered every frame. This keeps support
   * stable while standing on geometry and naturally releases it when the
   * player moves or jumps away.
   */
  querySupport(
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
    isLandingBlocked: LandingValidator,
  ): SurfaceResolution {
    if (!this.enabled) {
      return this.groundResolution(desired);
    }

    const candidates = this.surfaces
      .map(surface => this.evaluateSurface(
        surface,
        previous,
        desired,
        grounded,
        verticalVelocity,
        currentSupportHeight,
        isLandingBlocked,
      ))
      .filter(
        (candidate): candidate is SurfaceResolution =>
          candidate !== null,
      )
      .sort((a, b) => b.supportHeight - a.supportHeight);

    return candidates[0] ?? this.groundResolution(desired);
  }

  private evaluateSurface(
    surface: TraversalSurface,
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
    isLandingBlocked: LandingValidator,
  ): SurfaceResolution | null {
    if (surface.mode === 'guided') {
      return this.evaluateGuided(
        surface,
        previous,
        desired,
        grounded,
        verticalVelocity,
        currentSupportHeight,
      );
    }

    return this.evaluateFree(
      surface,
      previous,
      desired,
      grounded,
      verticalVelocity,
      currentSupportHeight,
      isLandingBlocked,
    );
  }

  private evaluateGuided(
    surface: GuidedTraversalSurface,
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
  ): SurfaceResolution | null {
    const projection = this.projectOntoGuided(
      surface,
      desired,
    );

    const standingOnSurface =
      grounded &&
      Math.abs(
        currentSupportHeight - surface.surfaceHeight,
      ) <= 0.08 &&
      projection.progress >= -0.08 &&
      projection.progress <= 1.08 &&
      projection.lateralDistance <=
        Math.max(0.62, surface.width * 0.7);

    const descendingOntoEndpoint =
      !grounded &&
      verticalVelocity <= 0 &&
      this.crossesSurfaceHeight(
        previous,
        desired,
        surface.surfaceHeight,
      ) &&
      (
        this.planarDistance(
          desired,
          surface.start,
        ) <= surface.entryRadius ||
        this.planarDistance(
          desired,
          surface.end,
        ) <= surface.entryRadius
      );

    if (!standingOnSurface && !descendingOntoEndpoint) {
      return null;
    }

    const progress = standingOnSurface
      ? projection.clampedProgress
      : this.planarDistance(
          desired,
          surface.start,
        ) <= this.planarDistance(
          desired,
          surface.end,
        )
        ? 0
        : 1;

    const position = Vector3.Lerp(
      surface.start,
      surface.end,
      progress,
    );
    position.y = desired.y;

    return {
      position,
      supportHeight: surface.surfaceHeight,
      ignoredColliderLabels: new Set([
        surface.colliderLabel,
      ]),
      surfaceId: surface.id,
      mode: 'guided',
    };
  }

  private evaluateFree(
    surface: FreeTraversalSurface,
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
    isLandingBlocked: LandingValidator,
  ): SurfaceResolution | null {
    const insideFootprint = this.isInsideFree(
      surface,
      desired,
      0,
    );

    const standingOnSurface =
      grounded &&
      Math.abs(
        currentSupportHeight - surface.surfaceHeight,
      ) <= 0.08 &&
      insideFootprint;

    const descendingOntoSurface =
      !grounded &&
      verticalVelocity <= 0 &&
      this.crossesSurfaceHeight(
        previous,
        desired,
        surface.surfaceHeight,
      ) &&
      this.isInsideFree(
        surface,
        desired,
        surface.entryPadding,
      );

    if (standingOnSurface || descendingOntoSurface) {
      const position = desired.clone();

      return {
        position,
        supportHeight: surface.surfaceHeight,
        ignoredColliderLabels: new Set([
          surface.colliderLabel,
        ]),
        surfaceId: surface.id,
        mode: 'free',
      };
    }

    // A grounded player leaving a free surface should only remain constrained
    // when the adjacent landing is unsafe, such as water beside a slab.
    const wasStandingOnSurface =
      grounded &&
      Math.abs(
        currentSupportHeight - surface.surfaceHeight,
      ) <= 0.08 &&
      this.isInsideFree(surface, previous, 0);

    if (!wasStandingOnSurface || insideFootprint) {
      return null;
    }

    const landing = this.createFreeLanding(
      surface,
      desired,
    );
    const ignored = new Set([
      surface.colliderLabel,
    ]);

    if (!isLandingBlocked(landing, ignored)) {
      return null;
    }

    return {
      position: this.clampToFree(
        surface,
        desired,
      ),
      supportHeight: surface.surfaceHeight,
      ignoredColliderLabels: ignored,
      surfaceId: surface.id,
      mode: 'free',
    };
  }

  private crossesSurfaceHeight(
    previous: Vector3,
    desired: Vector3,
    surfaceHeight: number,
  ): boolean {
    const toleranceAbove = 0.22;
    const toleranceBelow = 0.16;

    return (
      previous.y >= surfaceHeight - toleranceBelow &&
      desired.y <= surfaceHeight + toleranceAbove
    );
  }

  private projectOntoGuided(
    surface: GuidedTraversalSurface,
    position: Vector3,
  ): GuidedProjection {
    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const lengthSquared = axis.lengthSquared();

    if (lengthSquared <= 0.0001) {
      return {
        progress: 0,
        clampedProgress: 0,
        lateralDistance: Number.POSITIVE_INFINITY,
        closestPoint: surface.start.clone(),
      };
    }

    const relative = position.subtract(surface.start);
    relative.y = 0;

    const progress =
      Vector3.Dot(relative, axis) / lengthSquared;
    const clampedProgress = Math.max(
      0,
      Math.min(1, progress),
    );
    const closestPoint = Vector3.Lerp(
      surface.start,
      surface.end,
      clampedProgress,
    );

    return {
      progress,
      clampedProgress,
      lateralDistance: this.planarDistance(
        position,
        closestPoint,
      ),
      closestPoint,
    };
  }

  private clampToFree(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const point = desired.clone();

    if (surface.shape === 'box') {
      point.x = Math.max(
        surface.center.x - surface.halfWidth,
        Math.min(
          surface.center.x + surface.halfWidth,
          point.x,
        ),
      );
      point.z = Math.max(
        surface.center.z - surface.halfDepth,
        Math.min(
          surface.center.z + surface.halfDepth,
          point.z,
        ),
      );
      return point;
    }

    const offset = point.subtract(surface.center);
    offset.y = 0;
    const distance = offset.length();

    if (
      distance > surface.radius &&
      distance > 0.0001
    ) {
      offset.scaleInPlace(
        surface.radius / distance,
      );
      point.x = surface.center.x + offset.x;
      point.z = surface.center.z + offset.z;
    }

    return point;
  }

  private createFreeLanding(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const landing = desired.clone();
    landing.y = 0;

    if (surface.shape === 'box') {
      const localX =
        desired.x - surface.center.x;
      const localZ =
        desired.z - surface.center.z;
      const xOverflow =
        Math.abs(localX) - surface.halfWidth;
      const zOverflow =
        Math.abs(localZ) - surface.halfDepth;

      if (xOverflow >= zOverflow) {
        landing.x =
          surface.center.x +
          Math.sign(localX || 1) *
            (
              surface.halfWidth +
              surface.exitDistance
            );
        landing.z = Math.max(
          surface.center.z - surface.halfDepth,
          Math.min(
            surface.center.z + surface.halfDepth,
            desired.z,
          ),
        );
      } else {
        landing.z =
          surface.center.z +
          Math.sign(localZ || 1) *
            (
              surface.halfDepth +
              surface.exitDistance
            );
        landing.x = Math.max(
          surface.center.x - surface.halfWidth,
          Math.min(
            surface.center.x + surface.halfWidth,
            desired.x,
          ),
        );
      }

      return landing;
    }

    const direction = desired.subtract(
      surface.center,
    );
    direction.y = 0;

    if (direction.lengthSquared() <= 0.0001) {
      direction.set(1, 0, 0);
    } else {
      direction.normalize();
    }

    landing.x =
      surface.center.x +
      direction.x *
        (surface.radius + surface.exitDistance);
    landing.z =
      surface.center.z +
      direction.z *
        (surface.radius + surface.exitDistance);

    return landing;
  }

  private isInsideFree(
    surface: FreeTraversalSurface,
    position: Vector3,
    padding: number,
  ): boolean {
    if (surface.shape === 'box') {
      return (
        Math.abs(
          position.x - surface.center.x,
        ) <=
          surface.halfWidth + padding &&
        Math.abs(
          position.z - surface.center.z,
        ) <=
          surface.halfDepth + padding
      );
    }

    return (
      this.planarDistance(
        position,
        surface.center,
      ) <=
      surface.radius + padding
    );
  }

  private groundResolution(
    desired: Vector3,
  ): SurfaceResolution {
    return {
      position: desired.clone(),
      supportHeight: 0,
      ignoredColliderLabels: new Set(),
      surfaceId: null,
      mode: 'ground',
    };
  }

  private planarDistance(
    a: Vector3,
    b: Vector3,
  ): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
