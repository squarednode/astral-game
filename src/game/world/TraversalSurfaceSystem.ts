import { Vector3 } from '@babylonjs/core';
import type { TraversalSurface } from './WorldTypes';

export interface TraversalResolution {
  position: Vector3;
  ignoredColliderLabels: ReadonlySet<string>;
  activeSurfaceId: string | null;
  enteredSurface: boolean;
  exitedSurface: boolean;
}

export class TraversalSurfaceSystem {
  enabled = true;

  private activeSurface: TraversalSurface | null = null;
  private progress = 0;
  private entryCooldown = 0;
  private groundLockRemaining = 0;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    this.activeSurface = null;
    this.progress = 0;
    this.entryCooldown = 0.18;
    this.groundLockRemaining = 0.18;
  }

  getActiveSurfaceId(): string | null {
    return this.activeSurface?.id ?? null;
  }

  update(
    previous: Vector3,
    desired: Vector3,
    dt: number,
  ): TraversalResolution {
    this.entryCooldown = Math.max(0, this.entryCooldown - dt);
    this.groundLockRemaining = Math.max(0, this.groundLockRemaining - dt);

    if (!this.enabled) {
      return {
        position: desired.clone(),
        ignoredColliderLabels: new Set(),
        activeSurfaceId: null,
        enteredSurface: false,
        exitedSurface: false,
      };
    }

    if (this.activeSurface) {
      return this.updateActiveSurface(previous, desired);
    }

    const entry = this.findEntry(previous, desired);
    if (entry) {
      this.activeSurface = entry.surface;
      this.progress = entry.atStart ? 0 : 1;

      return {
        position: this.pointOnSurface(entry.surface, this.progress),
        ignoredColliderLabels: new Set([entry.surface.colliderLabel]),
        activeSurfaceId: entry.surface.id,
        enteredSurface: true,
        exitedSurface: false,
      };
    }

    const grounded = desired.clone();
    if (this.groundLockRemaining > 0) grounded.y = 0;

    return {
      position: grounded,
      ignoredColliderLabels: new Set(),
      activeSurfaceId: null,
      enteredSurface: false,
      exitedSurface: false,
    };
  }

  private updateActiveSurface(
    previous: Vector3,
    desired: Vector3,
  ): TraversalResolution {
    const surface = this.activeSurface!;
    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const length = axis.length();

    if (length <= 0.001) {
      this.reset();
      return {
        position: previous.clone(),
        ignoredColliderLabels: new Set(),
        activeSurfaceId: null,
        enteredSurface: false,
        exitedSurface: true,
      };
    }

    axis.scaleInPlace(1 / length);

    const desiredDelta = desired.subtract(previous);
    desiredDelta.y = 0;

    // Only movement along the traversal axis is retained. This prevents
    // stepping sideways into water or off a narrow beam.
    const alongSurface = Vector3.Dot(desiredDelta, axis);
    this.progress += alongSurface / length;

    const exitThreshold = 0.035;

    if (this.progress < -exitThreshold) {
      return this.exitSurface(surface.startLanding);
    }

    if (this.progress > 1 + exitThreshold) {
      return this.exitSurface(surface.endLanding);
    }

    this.progress = Math.max(0, Math.min(1, this.progress));

    return {
      position: this.pointOnSurface(surface, this.progress),
      ignoredColliderLabels: new Set([surface.colliderLabel]),
      activeSurfaceId: surface.id,
      enteredSurface: false,
      exitedSurface: false,
    };
  }

  private exitSurface(landing: Vector3): TraversalResolution {
    this.activeSurface = null;
    this.progress = 0;
    this.entryCooldown = 0.2;
    this.groundLockRemaining = 0.35;

    const groundedLanding = landing.clone();
    groundedLanding.y = 0;

    return {
      position: groundedLanding,
      ignoredColliderLabels: new Set(),
      activeSurfaceId: null,
      enteredSurface: false,
      exitedSurface: true,
    };
  }

  private pointOnSurface(
    surface: TraversalSurface,
    progress: number,
  ): Vector3 {
    const point = Vector3.Lerp(surface.start, surface.end, progress);
    point.y = surface.surfaceHeight;
    return point;
  }

  private findEntry(
    previous: Vector3,
    desired: Vector3,
  ): { surface: TraversalSurface; atStart: boolean } | null {
    if (this.entryCooldown > 0) return null;

    for (const surface of this.surfaces) {
      if (
        Math.max(previous.y, desired.y) < surface.minimumEntryHeight
      ) {
        continue;
      }

      const distanceToStart = this.planarDistance(desired, surface.start);
      const distanceToEnd = this.planarDistance(desired, surface.end);

      if (distanceToStart <= surface.entryRadius) {
        return { surface, atStart: true };
      }

      if (distanceToEnd <= surface.entryRadius) {
        return { surface, atStart: false };
      }
    }

    return null;
  }

  private planarDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
