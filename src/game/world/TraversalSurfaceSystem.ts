import { Vector3 } from '@babylonjs/core';
import type {
  FreeTraversalSurface,
  GuidedTraversalSurface,
  TraversalSurface,
} from './WorldTypes';

export type MovementSurfaceState =
  | 'ground'
  | 'air'
  | 'guided'
  | 'free';

export type LandingValidator = (
  position: Vector3,
  ignoredColliderLabels: ReadonlySet<string>,
) => boolean;

export interface TraversalResolution {
  position: Vector3;
  ignoredColliderLabels: ReadonlySet<string>;
  activeSurfaceId: string | null;
  activeMode: 'guided' | 'free' | null;
  movementState: MovementSurfaceState;
  enteredSurface: boolean;
  exitedSurface: boolean;
}

interface GuidedTraversalEntry {
  surface: GuidedTraversalSurface;
  atStart: boolean;
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

function isFreeEntry(
  entry: TraversalEntry,
): entry is FreeTraversalEntry {
  return entry.surface.mode === 'free';
}

export class TraversalSurfaceSystem {
  enabled = true;

  private activeSurface: TraversalSurface | null = null;
  private state: MovementSurfaceState = 'ground';
  private guidedProgress = 0;
  private entryCooldown = 0;
  private airborneLockRemaining = 0;
  private entryAssistRemaining = 0;

  constructor(
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
  ) {}

  reset(): void {
    this.activeSurface = null;
    this.state = 'ground';
    this.guidedProgress = 0;
    this.entryCooldown = 0.18;
    this.airborneLockRemaining = 0;
    this.entryAssistRemaining = 0;
  }

  releaseForJump(): void {
    if (!this.activeSurface) return;

    this.activeSurface = null;
    this.state = 'air';
    this.guidedProgress = 0;
    this.entryCooldown = 0.3;
    this.airborneLockRemaining = 0.28;
    this.entryAssistRemaining = 0;
  }

  releaseForBlink(): void {
    this.activeSurface = null;
    this.state = 'ground';
    this.guidedProgress = 0;
    this.entryCooldown = 0.25;
    this.airborneLockRemaining = 0;
    this.entryAssistRemaining = 0;
  }

  getActiveSurfaceId(): string | null {
    return this.activeSurface?.id ?? null;
  }

  getActiveMode(): 'guided' | 'free' | null {
    return this.activeSurface?.mode ?? null;
  }

  getMovementState(): MovementSurfaceState {
    return this.state;
  }

  update(
    previous: Vector3,
    desired: Vector3,
    dt: number,
    isLandingBlocked: LandingValidator,
  ): TraversalResolution {
    this.entryCooldown = Math.max(0, this.entryCooldown - dt);
    this.airborneLockRemaining = Math.max(
      0,
      this.airborneLockRemaining - dt,
    );
    this.entryAssistRemaining = Math.max(
      0,
      this.entryAssistRemaining - dt,
    );

    if (!this.enabled) {
      this.state = desired.y > 0.04 ? 'air' : 'ground';
      return this.result(desired.clone(), new Set(), false, false);
    }

    // After jumping from a surface, normal movement owns the character until
    // the jump has had time to clear the object.
    if (this.airborneLockRemaining > 0) {
      this.state = desired.y > 0.03 ? 'air' : 'ground';
      return this.result(desired.clone(), new Set(), false, false);
    }

    if (this.activeSurface?.mode === 'guided') {
      return this.updateGuided(
        this.activeSurface,
        previous,
        desired,
      );
    }

    if (this.activeSurface?.mode === 'free') {
      return this.updateFree(
        this.activeSurface,
        desired,
        isLandingBlocked,
      );
    }

    const entry = this.findEntry(previous, desired);

    if (entry && isGuidedEntry(entry)) {
      this.activeSurface = entry.surface;
      this.guidedProgress = entry.atStart ? 0 : 1;
      this.entryAssistRemaining = 0.1;
      this.state = 'guided';

      const target = this.pointOnGuided(
        entry.surface,
        this.guidedProgress,
      );

      return this.result(
        Vector3.Lerp(desired, target, 0.55),
        new Set([entry.surface.colliderLabel]),
        true,
        false,
      );
    }

    if (entry && isFreeEntry(entry)) {
      this.activeSurface = entry.surface;
      this.entryAssistRemaining = 0.1;
      this.state = 'free';

      const target = this.clampToFree(entry.surface, desired);

      return this.result(
        Vector3.Lerp(desired, target, 0.45),
        new Set([entry.surface.colliderLabel]),
        true,
        false,
      );
    }

    this.state = desired.y > 0.04 ? 'air' : 'ground';
    return this.result(desired.clone(), new Set(), false, false);
  }

  private updateGuided(
    surface: GuidedTraversalSurface,
    previous: Vector3,
    desired: Vector3,
  ): TraversalResolution {
    const axis = surface.end.subtract(surface.start);
    axis.y = 0;
    const length = axis.length();

    if (length <= 0.001) {
      this.reset();
      return this.result(
        new Vector3(previous.x, 0, previous.z),
        new Set(),
        false,
        true,
      );
    }

    axis.scaleInPlace(1 / length);

    const desiredDelta = desired.subtract(previous);
    desiredDelta.y = 0;
    const along = Vector3.Dot(desiredDelta, axis);
    const nextProgress = this.guidedProgress + along / length;

    // Leaving is based on continued outward movement at the endpoint. This
    // avoids requiring progress to exceed a hidden threshold while clamped.
    if (this.guidedProgress <= 0.001 && along < -0.0001) {
      return this.exitGuided(surface.startLanding);
    }

    if (this.guidedProgress >= 0.999 && along > 0.0001) {
      return this.exitGuided(surface.endLanding);
    }

    this.guidedProgress = Math.max(0, Math.min(1, nextProgress));
    this.state = 'guided';

    const target = this.pointOnGuided(
      surface,
      this.guidedProgress,
    );

    const position =
      this.entryAssistRemaining > 0
        ? Vector3.Lerp(desired, target, 0.35)
        : target;

    return this.result(
      position,
      new Set([surface.colliderLabel]),
      false,
      false,
    );
  }

  private updateFree(
    surface: FreeTraversalSurface,
    desired: Vector3,
    isLandingBlocked: LandingValidator,
  ): TraversalResolution {
    if (this.isInsideFree(surface, desired, 0)) {
      this.state = 'free';
      const target = this.clampToFree(surface, desired);

      return this.result(
        this.entryAssistRemaining > 0
          ? Vector3.Lerp(desired, target, 0.3)
          : target,
        new Set([surface.colliderLabel]),
        false,
        false,
      );
    }

    const landing = this.createFreeLanding(surface, desired);
    const ignored = new Set([surface.colliderLabel]);

    if (!isLandingBlocked(landing, ignored)) {
      this.activeSurface = null;
      this.state = 'ground';
      this.entryCooldown = 0.22;
      landing.y = 0;

      return this.result(
        landing,
        new Set(),
        false,
        true,
      );
    }

    this.state = 'free';
    return this.result(
      this.clampToFree(surface, desired),
      ignored,
      false,
      false,
    );
  }

  private exitGuided(landing: Vector3): TraversalResolution {
    this.activeSurface = null;
    this.state = 'ground';
    this.guidedProgress = 0;
    this.entryCooldown = 0.22;
    this.entryAssistRemaining = 0;

    const grounded = landing.clone();
    grounded.y = 0;

    return this.result(
      grounded,
      new Set(),
      false,
      true,
    );
  }

  private pointOnGuided(
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

  private clampToFree(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const point = desired.clone();
    point.y = surface.surfaceHeight;

    if (surface.shape === 'box') {
      point.x = Math.max(
        surface.center.x - surface.halfWidth,
        Math.min(surface.center.x + surface.halfWidth, point.x),
      );
      point.z = Math.max(
        surface.center.z - surface.halfDepth,
        Math.min(surface.center.z + surface.halfDepth, point.z),
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

  private createFreeLanding(
    surface: FreeTraversalSurface,
    desired: Vector3,
  ): Vector3 {
    const landing = desired.clone();
    landing.y = 0;

    if (surface.shape === 'box') {
      const localX = desired.x - surface.center.x;
      const localZ = desired.z - surface.center.z;
      const xOverflow = Math.abs(localX) - surface.halfWidth;
      const zOverflow = Math.abs(localZ) - surface.halfDepth;

      if (xOverflow >= zOverflow) {
        landing.x =
          surface.center.x +
          Math.sign(localX || 1) *
            (surface.halfWidth + surface.exitDistance);
        landing.z = Math.max(
          surface.center.z - surface.halfDepth,
          Math.min(surface.center.z + surface.halfDepth, desired.z),
        );
      } else {
        landing.z =
          surface.center.z +
          Math.sign(localZ || 1) *
            (surface.halfDepth + surface.exitDistance);
        landing.x = Math.max(
          surface.center.x - surface.halfWidth,
          Math.min(surface.center.x + surface.halfWidth, desired.x),
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
  ): TraversalEntry | null {
    if (this.entryCooldown > 0) return null;
    if (Math.max(previous.y, desired.y) <= 0.04) return null;

    for (const surface of this.surfaces) {
      if (
        Math.max(previous.y, desired.y) <
        surface.minimumEntryHeight
      ) {
        continue;
      }

      if (surface.mode === 'guided') {
        if (
          this.planarDistance(desired, surface.start) <=
          surface.entryRadius
        ) {
          return { surface, atStart: true };
        }

        if (
          this.planarDistance(desired, surface.end) <=
          surface.entryRadius
        ) {
          return { surface, atStart: false };
        }

        continue;
      }

      if (
        !this.isInsideFree(surface, previous, 0) &&
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

  private isInsideFree(
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

  private result(
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
      movementState: this.state,
      enteredSurface,
      exitedSurface,
    };
  }
}
