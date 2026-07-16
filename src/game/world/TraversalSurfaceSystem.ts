import { Vector3 } from '@babylonjs/core';
import type {
  FreeTraversalSurface,
  GuidedTraversalSurface,
  TraversalSurface,
} from './WorldTypes';

export type LandingValidator = (
  position: Vector3,
  ignoredColliderLabels: ReadonlySet<string>,
) => boolean;

export interface TraversalResolution {
  position: Vector3;
  ignoredColliderLabels: ReadonlySet<string>;
  activeSurfaceId: string | null;
  activeMode: 'guided' | 'free' | null;
  enteredSurface: boolean;
  exitedSurface: boolean;
}

export class TraversalSurfaceSystem {
  enabled = true;

  private activeSurface: TraversalSurface | null = null;
  private guidedProgress = 0;
  private entryCooldown = 0;
  private groundLockRemaining = 0;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    this.activeSurface = null;
    this.guidedProgress = 0;
    this.entryCooldown = 0.18;
    this.groundLockRemaining = 0.18;
  }

  getActiveSurfaceId(): string | null {
    return this.activeSurface?.id ?? null;
  }

  getActiveMode(): 'guided' | 'free' | null {
    return this.activeSurface?.mode ?? null;
  }

  update(
    previous: Vector3,
    desired: Vector3,
    dt: number,
    isLandingBlocked: LandingValidator,
  ): TraversalResolution {
    this.entryCooldown = Math.max(0, this.entryCooldown - dt);
    this.groundLockRemaining = Math.max(
      0,
      this.groundLockRemaining - dt,
    );

    if (!this.enabled) {
      return this.resolution(desired.clone(), new Set(), false, false);
    }

    if (this.activeSurface?.mode === 'guided') {
      return this.updateGuidedSurface(
        this.activeSurface,
        previous,
        desired,
      );
    }

    if (this.activeSurface?.mode === 'free') {
      return this.updateFreeSurface(
        this.activeSurface,
        desired,
        isLandingBlocked,
      );
    }

    const entry = this.findEntry(previous, desired);

    if (entry?.surface.mode === 'guided') {
      this.activeSurface = entry.surface;
      this.guidedProgress = entry.atStart ? 0 : 1;

      return this.resolution(
        this.pointOnGuidedSurface(
          entry.surface,
          this.guidedProgress,
        ),
        new Set([entry.surface.colliderLabel]),
        true,
        false,
      );
    }

    if (entry?.surface.mode === 'free') {
      this.activeSurface = entry.surface;

      return this.resolution(
        this.clampToFreeSurface(entry.surface, desired),
        new Set([entry.surface.colliderLabel]),
        true,
        false,
      );
    }

    const grounded = desired.clone();
    if (this.groundLockRemaining > 0) grounded.y = 0;

    return this.resolution(
      grounded,
      new Set(),
      false,
      false,
    );
  }

  private updateGuidedSurface(
    surface: GuidedTraversalSurface,
    previous: Vector3,
    desired: Vector3,
  ): TraversalResolution {
    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const length = axis.length();

    if (length <= 0.001) {
      return this.cancelAt(previous);
    }

    axis.scaleInPlace(1 / length);

    const desiredDelta = desired.subtract(previous);
    desiredDelta.y = 0;

    // Narrow traversal only accepts movement along its intended axis.
    const alongSurface = Vector3.Dot(desiredDelta, axis);
    this.guidedProgress += alongSurface / length;

    const exitThreshold = 0.035;

    if (this.guidedProgress < -exitThreshold) {
      return this.exitSurface(surface.startLanding);
    }

    if (this.guidedProgress > 1 + exitThreshold) {
      return this.exitSurface(surface.endLanding);
    }

    this.guidedProgress = Math.max(
      0,
      Math.min(1, this.guidedProgress),
    );

    return this.resolution(
      this.pointOnGuidedSurface(
        surface,
        this.guidedProgress,
      ),
      new Set([surface.colliderLabel]),
      false,
      false,
    );
  }

  private updateFreeSurface(
    surface: FreeTraversalSurface,
    desired: Vector3,
    isLandingBlocked: LandingValidator,
  ): TraversalResolution {
    if (this.isInsideFreeSurface(surface, desired, 0)) {
      return this.resolution(
        this.clampToFreeSurface(surface, desired),
        new Set([surface.colliderLabel]),
        false,
        false,
      );
    }

    const landing = this.createFreeExitLanding(surface, desired);
    const ignored = new Set([surface.colliderLabel]);

    if (!isLandingBlocked(landing, ignored)) {
      return this.exitSurface(landing);
    }

    // An unsafe edge, such as water or a cliff, behaves like a railing.
    return this.resolution(
      this.clampToFreeSurface(surface, desired),
      ignored,
      false,
      false,
    );
  }

  private exitSurface(landing: Vector3): TraversalResolution {
    this.activeSurface = null;
    this.guidedProgress = 0;
    this.entryCooldown = 0.2;
    this.groundLockRemaining = 0.35;

    const groundedLanding = landing.clone();
    groundedLanding.y = 0;

    return this.resolution(
      groundedLanding,
      new Set(),
      false,
      true,
    );
  }

  private cancelAt(position: Vector3): TraversalResolution {
    this.activeSurface = null;
    this.guidedProgress = 0;
    const grounded = position.clone();
    grounded.y = 0;

    return this.resolution(
      grounded,
      new Set(),
      false,
      true,
    );
  }

  private pointOnGuidedSurface(
    surface: GuidedTraversalSurface,
    progress: number,
  ): Vector3 {
    const point = Vector3.Lerp(
      surface.start,
      surface.end,
      progress,
    );
    point.y = surface.surfaceHeight;
    return point;
  }

  private clampToFreeSurface(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const point = desired.clone();
    point.y = surface.surfaceHeight;

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

    if (distance > surface.radius && distance > 0.0001) {
      offset.scaleInPlace(surface.radius / distance);
      point.x = surface.center.x + offset.x;
      point.z = surface.center.z + offset.z;
    }

    return point;
  }

  private createFreeExitLanding(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const landing = desired.clone();
    landing.y = 0;

    if (surface.shape === 'box') {
      const localX = desired.x - surface.center.x;
      const localZ = desired.z - surface.center.z;
      const xOverflow =
        Math.abs(localX) - surface.halfWidth;
      const zOverflow =
        Math.abs(localZ) - surface.halfDepth;

      if (xOverflow >= zOverflow) {
        landing.x =
          surface.center.x +
          Math.sign(localX || 1) *
            (surface.halfWidth + surface.exitDistance);
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
            (surface.halfDepth + surface.exitDistance);
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

    const direction = desired.subtract(surface.center);
    direction.y = 0;

    if (direction.lengthSquared() <= 0.0001) {
      direction.set(1, 0, 0);
    } else {
      direction.normalize();
    }

    landing.x =
      surface.center.x +
      direction.x * (surface.radius + surface.exitDistance);
    landing.z =
      surface.center.z +
      direction.z * (surface.radius + surface.exitDistance);

    return landing;
  }

  private findEntry(
    previous: Vector3,
    desired: Vector3,
  ):
    | {
        surface: GuidedTraversalSurface;
        atStart: boolean;
      }
    | {
        surface: FreeTraversalSurface;
      }
    | null {
    if (this.entryCooldown > 0) return null;

    for (const surface of this.surfaces) {
      if (
        Math.max(previous.y, desired.y) <
        surface.minimumEntryHeight
      ) {
        continue;
      }

      if (surface.mode === 'guided') {
        const distanceToStart = this.planarDistance(
          desired,
          surface.start,
        );
        const distanceToEnd = this.planarDistance(
          desired,
          surface.end,
        );

        if (distanceToStart <= surface.entryRadius) {
          return { surface, atStart: true };
        }

        if (distanceToEnd <= surface.entryRadius) {
          return { surface, atStart: false };
        }

        continue;
      }

      const wasInside = this.isInsideFreeSurface(
        surface,
        previous,
        0,
      );
      const isNearSurface = this.isInsideFreeSurface(
        surface,
        desired,
        surface.entryPadding,
      );

      if (!wasInside && isNearSurface) {
        return { surface };
      }
    }

    return null;
  }

  private isInsideFreeSurface(
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

    return (
      this.planarDistance(position, surface.center) <=
      surface.radius + padding
    );
  }

  private planarDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private resolution(
    position: Vector3,
    ignoredColliderLabels: ReadonlySet<string>,
    enteredSurface: boolean,
    exitedSurface: boolean,
  ): TraversalResolution {
    return {
      position,
      ignoredColliderLabels,
      activeSurfaceId: this.activeSurface?.id ?? null,
      activeMode: this.activeSurface?.mode ?? null,
      enteredSurface,
      exitedSurface,
    };
  }
}
