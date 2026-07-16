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
  activeSurfaceId: string | null;
  activeMode: SurfaceMovementMode;
  enteredSurface: boolean;
  exitedSurface: boolean;
}

interface GuidedTraversalEntry {
  surface: GuidedTraversalSurface;
  progress: number;
}

interface FreeTraversalEntry {
  surface: FreeTraversalSurface;
}

type TraversalEntry =
  | GuidedTraversalEntry
  | FreeTraversalEntry;

function isGuidedEntry(
  entry: TraversalEntry,
): entry is GuidedTraversalEntry {
  return entry.surface.mode === 'guided';
}

export class TraversalSurfaceSystem {
  enabled = true;

  private activeSurface: TraversalSurface | null = null;
  private guidedProgress = 0;
  private entryCooldown = 0;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    this.activeSurface = null;
    this.guidedProgress = 0;
    this.entryCooldown = 0.15;
  }

  releaseForBlink(): void {
    this.reset();
    this.entryCooldown = 0.25;
  }

  getActiveSurfaceId(): string | null {
    return this.activeSurface?.id ?? null;
  }

  getActiveMode(): SurfaceMovementMode {
    return this.activeSurface?.mode ?? 'ground';
  }

  /**
   * Resolves only horizontal guidance and support metadata.
   *
   * It does not change jump velocity, grounded state, or vertical position.
   * PlayerMovementController remains the sole owner of vertical physics.
   */
  update(
    previous: Vector3,
    desired: Vector3,
    dt: number,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
    isLandingBlocked: LandingValidator,
  ): SurfaceResolution {
    this.entryCooldown = Math.max(
      0,
      this.entryCooldown - dt,
    );

    if (!this.enabled) {
      return this.groundResolution(desired);
    }

    if (this.activeSurface?.mode === 'guided') {
      return this.updateGuided(
        this.activeSurface,
        previous,
        desired,
        grounded,
      );
    }

    if (this.activeSurface?.mode === 'free') {
      return this.updateFree(
        this.activeSurface,
        desired,
        grounded,
        isLandingBlocked,
      );
    }

    const entry = this.findLandingSurface(
      previous,
      desired,
      grounded,
      verticalVelocity,
      currentSupportHeight,
    );

    if (!entry) {
      return this.groundResolution(desired);
    }

    if (isGuidedEntry(entry)) {
      this.activeSurface = entry.surface;
      this.guidedProgress = entry.progress;

      const position = this.pointOnGuided(
        entry.surface,
        entry.progress,
        desired.y,
      );

      return {
        position,
        supportHeight: entry.surface.surfaceHeight,
        ignoredColliderLabels: new Set([
          entry.surface.colliderLabel,
        ]),
        activeSurfaceId: entry.surface.id,
        activeMode: 'guided',
        enteredSurface: true,
        exitedSurface: false,
      };
    }

    this.activeSurface = entry.surface;

    return {
      position: this.clampToFree(
        entry.surface,
        desired,
      ),
      supportHeight: entry.surface.surfaceHeight,
      ignoredColliderLabels: new Set([
        entry.surface.colliderLabel,
      ]),
      activeSurfaceId: entry.surface.id,
      activeMode: 'free',
      enteredSurface: true,
      exitedSurface: false,
    };
  }

  private updateGuided(
    surface: GuidedTraversalSurface,
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
  ): SurfaceResolution {
    // Jumping releases the horizontal guide immediately. The movement
    // controller continues the jump using the surface as its former support.
    if (!grounded) {
      this.activeSurface = null;
      this.entryCooldown = 0.22;

      return {
        ...this.groundResolution(desired),
        exitedSurface: true,
      };
    }

    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const length = axis.length();

    if (length <= 0.001) {
      this.reset();
      return this.groundResolution(desired);
    }

    axis.scaleInPlace(1 / length);

    const desiredDelta = desired.subtract(previous);
    desiredDelta.y = 0;
    const along = Vector3.Dot(desiredDelta, axis);

    if (
      this.guidedProgress <= 0.001 &&
      along < -0.0001
    ) {
      return this.exitSurface(
        surface.startLanding,
      );
    }

    if (
      this.guidedProgress >= 0.999 &&
      along > 0.0001
    ) {
      return this.exitSurface(
        surface.endLanding,
      );
    }

    this.guidedProgress = Math.max(
      0,
      Math.min(
        1,
        this.guidedProgress + along / length,
      ),
    );

    return {
      position: this.pointOnGuided(
        surface,
        this.guidedProgress,
        desired.y,
      ),
      supportHeight: surface.surfaceHeight,
      ignoredColliderLabels: new Set([
        surface.colliderLabel,
      ]),
      activeSurfaceId: surface.id,
      activeMode: 'guided',
      enteredSurface: false,
      exitedSurface: false,
    };
  }

  private updateFree(
    surface: FreeTraversalSurface,
    desired: Vector3,
    grounded: boolean,
    isLandingBlocked: LandingValidator,
  ): SurfaceResolution {
    if (!grounded) {
      this.activeSurface = null;
      this.entryCooldown = 0.22;

      return {
        ...this.groundResolution(desired),
        exitedSurface: true,
      };
    }

    if (this.isInsideFree(surface, desired, 0)) {
      return {
        position: desired.clone(),
        supportHeight: surface.surfaceHeight,
        ignoredColliderLabels: new Set([
          surface.colliderLabel,
        ]),
        activeSurfaceId: surface.id,
        activeMode: 'free',
        enteredSurface: false,
        exitedSurface: false,
      };
    }

    const landing = this.createFreeLanding(
      surface,
      desired,
    );
    const ignored = new Set([
      surface.colliderLabel,
    ]);

    if (!isLandingBlocked(landing, ignored)) {
      this.activeSurface = null;
      this.entryCooldown = 0.2;

      return {
        position: landing,
        supportHeight: 0,
        ignoredColliderLabels: new Set(),
        activeSurfaceId: null,
        activeMode: 'ground',
        enteredSurface: false,
        exitedSurface: true,
      };
    }

    return {
      position: this.clampToFree(surface, desired),
      supportHeight: surface.surfaceHeight,
      ignoredColliderLabels: ignored,
      activeSurfaceId: surface.id,
      activeMode: 'free',
      enteredSurface: false,
      exitedSurface: false,
    };
  }

  private findLandingSurface(
    previous: Vector3,
    desired: Vector3,
    grounded: boolean,
    verticalVelocity: number,
    currentSupportHeight: number,
  ): TraversalEntry | null {
    if (this.entryCooldown > 0) return null;

    // Surfaces are acquired while descending onto them. This prevents the
    // support system from grabbing the player during the upward half of a jump.
    if (grounded || verticalVelocity > 0) return null;

    for (const surface of this.surfaces) {
      const descendingThroughSurface =
        previous.y >=
          surface.surfaceHeight - 0.08 &&
        desired.y <=
          surface.surfaceHeight + 0.3 &&
        surface.surfaceHeight >
          currentSupportHeight + 0.04;

      if (!descendingThroughSurface) continue;

      if (surface.mode === 'guided') {
        const distanceToStart = this.planarDistance(
          desired,
          surface.start,
        );
        const distanceToEnd = this.planarDistance(
          desired,
          surface.end,
        );

        // Guided surfaces remain endpoint-only. This is appropriate for a
        // narrow log over water, beam, or pipe where side entry is unsafe.
        if (distanceToStart <= surface.entryRadius) {
          return {
            surface,
            progress: 0,
          };
        }

        if (distanceToEnd <= surface.entryRadius) {
          return {
            surface,
            progress: 1,
          };
        }

        continue;
      }

      if (
        this.isInsideFree(
          surface,
          desired,
          surface.entryPadding,
        )
      ) {
        return { surface };
      }
    }

    return null;
  }

  private exitSurface(
    landing: Vector3,
  ): SurfaceResolution {
    this.activeSurface = null;
    this.guidedProgress = 0;
    this.entryCooldown = 0.2;

    const position = landing.clone();
    position.y = 0;

    return {
      position,
      supportHeight: 0,
      ignoredColliderLabels: new Set(),
      activeSurfaceId: null,
      activeMode: 'ground',
      enteredSurface: false,
      exitedSurface: true,
    };
  }

  private groundResolution(
    desired: Vector3,
  ): SurfaceResolution {
    return {
      position: desired.clone(),
      supportHeight: 0,
      ignoredColliderLabels: new Set(),
      activeSurfaceId: null,
      activeMode: 'ground',
      enteredSurface: false,
      exitedSurface: false,
    };
  }

  private pointOnGuided(
    surface: GuidedTraversalSurface,
    progress: number,
    y: number,
  ): Vector3 {
    const point = Vector3.Lerp(
      surface.start,
      surface.end,
      progress,
    );
    point.y = y;
    return point;
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

  private planarDistance(
    a: Vector3,
    b: Vector3,
  ): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
