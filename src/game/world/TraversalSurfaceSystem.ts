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

  /**
   * Reserved for moving platforms, elevators, and boats. Current static
   * surfaces return zero.
   */
  surfaceDelta: Vector3;
}

interface GuidedProjection {
  progress: number;
  clampedProgress: number;
  lateralOffset: number;
  lateralDistance: number;
  axis: Vector3;
  perpendicular: Vector3;
}

export class TraversalSurfaceSystem {
  enabled = true;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    // Continuous support stores no traversal state.
  }

  releaseForBlink(): void {
    // Support is recalculated from Blink's destination.
  }

  /**
   * Stateless support query used every frame.
   *
   * Raised surfaces may be acquired in two ways:
   * - Walk/step when the height change is at or below stepHeight.
   * - Descending jump when the height change is at or below
   *   maximumJumpOntoHeight.
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
      .map(surface =>
        this.evaluateSurface(
          surface,
          previous,
          desired,
          grounded,
          verticalVelocity,
          currentSupportHeight,
          isLandingBlocked,
        ),
      )
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
    if (
      (surface.slopeDegrees ?? 0) >
      GameBalance.movement.maximumWalkableSlopeDegrees
    ) {
      return null;
    }

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
    const supportHeight = this.sampleHeight(
      surface,
      desired.x,
      desired.z,
    );
    const heightDifference =
      supportHeight - currentSupportHeight;

    const insideLength =
      projection.progress >= 0 &&
      projection.progress <= 1;
    const insideLandingWidth =
      projection.lateralDistance <=
      Math.max(surface.width / 2, 0.52);
    const insideGuide =
      projection.lateralDistance <=
      surface.guideHalfWidth;

    const standing =
      grounded &&
      Math.abs(
        currentSupportHeight - supportHeight,
      ) <= GameBalance.movement.groundSnapDistance &&
      insideLength &&
      insideGuide;

    const canStepOnto =
      grounded &&
      heightDifference > 0.01 &&
      heightDifference <=
        GameBalance.movement.stepHeight &&
      insideLength &&
      insideLandingWidth;

    const canLandFromJump =
      !grounded &&
      verticalVelocity <= 0 &&
      heightDifference <=
        GameBalance.movement.maximumJumpOntoHeight &&
      heightDifference >
        -GameBalance.movement.groundSnapDistance &&
      insideLength &&
      insideLandingWidth &&
      this.crossesSurfaceHeight(
        previous,
        desired,
        supportHeight,
      );

    if (!standing && !canStepOnto && !canLandFromJump) {
      return null;
    }

    const position = this.clampToGuidedCorridor(
      surface,
      desired,
      projection,
    );
    const frameDelta =
      surface.frameDelta?.clone() ?? Vector3.Zero();
    position.addInPlace(frameDelta);

    return {
      position,
      supportHeight:
        supportHeight + frameDelta.y,
      ignoredColliderLabels: new Set([
        surface.colliderLabel,
      ]),
      surfaceId: surface.id,
      mode: 'guided',
      surfaceDelta: frameDelta,
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
    const supportHeight = this.sampleHeight(
      surface,
      desired.x,
      desired.z,
    );
    const heightDifference =
      supportHeight - currentSupportHeight;
    const insideFootprint = this.isInsideFree(
      surface,
      desired,
      0,
    );
    const insideLandingFootprint = this.isInsideFree(
      surface,
      desired,
      surface.entryPadding,
    );

    const standing =
      grounded &&
      Math.abs(
        currentSupportHeight - supportHeight,
      ) <= GameBalance.movement.groundSnapDistance &&
      insideFootprint;

    const canStepOnto =
      grounded &&
      heightDifference > 0.01 &&
      heightDifference <=
        GameBalance.movement.stepHeight &&
      insideFootprint;

    const canLandFromJump =
      !grounded &&
      verticalVelocity <= 0 &&
      heightDifference <=
        GameBalance.movement.maximumJumpOntoHeight &&
      heightDifference >
        -GameBalance.movement.groundSnapDistance &&
      insideLandingFootprint &&
      this.crossesSurfaceHeight(
        previous,
        desired,
        supportHeight,
      );

    if (standing || canStepOnto || canLandFromJump) {
      const frameDelta =
        surface.frameDelta?.clone() ?? Vector3.Zero();
      const position = desired.add(frameDelta);

      return {
        position,
        supportHeight:
          supportHeight + frameDelta.y,
        ignoredColliderLabels: new Set([
          surface.colliderLabel,
        ]),
        surfaceId: surface.id,
        mode: 'free',
        surfaceDelta: frameDelta,
      };
    }

    // If the player was standing on a free surface and walks toward an unsafe
    // edge, keep them within its footprint. Safe edges release support.
    const previousSupportHeight = this.sampleHeight(
      surface,
      previous.x,
      previous.z,
    );
    const wasStanding =
      grounded &&
      Math.abs(
        currentSupportHeight - previousSupportHeight,
      ) <= GameBalance.movement.groundSnapDistance &&
      this.isInsideFree(surface, previous, 0);

    if (!wasStanding || insideFootprint) {
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
      supportHeight,
      ignoredColliderLabels: ignored,
      surfaceId: surface.id,
      mode: 'free',
      surfaceDelta: Vector3.Zero(),
    };
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
    surfaceHeight: number,
  ): boolean {
    const snap =
      GameBalance.movement.groundSnapDistance;

    return (
      previous.y >= surfaceHeight - snap &&
      desired.y <= surfaceHeight + snap
    );
  }

  private projectOntoGuided(
    surface: GuidedTraversalSurface,
    position: Vector3,
  ): GuidedProjection {
    const rawAxis = surface.end.subtract(surface.start);
    rawAxis.y = 0;
    const length = rawAxis.length();

    if (length <= 0.0001) {
      return {
        progress: 0,
        clampedProgress: 0,
        lateralOffset: 0,
        lateralDistance: Number.POSITIVE_INFINITY,
        axis: new Vector3(0, 0, 1),
        perpendicular: new Vector3(1, 0, 0),
      };
    }

    const axis = rawAxis.scale(1 / length);
    const perpendicular = new Vector3(
      -axis.z,
      0,
      axis.x,
    );
    const relative = position.subtract(surface.start);
    relative.y = 0;

    const alongDistance =
      Vector3.Dot(relative, axis);
    const progress = alongDistance / length;
    const lateralOffset =
      Vector3.Dot(relative, perpendicular);

    return {
      progress,
      clampedProgress: Math.max(
        0,
        Math.min(1, progress),
      ),
      lateralOffset,
      lateralDistance: Math.abs(lateralOffset),
      axis,
      perpendicular,
    };
  }

  private clampToGuidedCorridor(
    surface: GuidedTraversalSurface,
    desired: Vector3,
    projection: GuidedProjection,
  ): Vector3 {
    const axisLength = this.planarDistance(
      surface.start,
      surface.end,
    );
    const alongDistance =
      projection.clampedProgress * axisLength;
    const lateralOffset = Math.max(
      -surface.guideHalfWidth,
      Math.min(
        surface.guideHalfWidth,
        projection.lateralOffset,
      ),
    );

    const position = surface.start
      .add(
        projection.axis.scale(alongDistance),
      )
      .add(
        projection.perpendicular.scale(
          lateralOffset,
        ),
      );

    position.y = desired.y;
    return position;
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
      surfaceDelta: Vector3.Zero(),
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
