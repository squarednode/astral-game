import { Vector3 } from '@babylonjs/core';
import type {
  DynamicBoxCollider,
  TraversalSurface,
  WorldCollider,
} from '../../world/WorldTypes';
import type { WorldVolume } from '../../world/WorldVolumeTypes';
import type {
  EnemyNavigationFailureReason,
  EnemyNavigationRequest,
  EnemyNavigationResolution,
  EnemyTraversalLink,
} from './EnemyNavigationTypes';

export class EnemyNavigationSystem {
  constructor(
    private readonly colliders: ReadonlyArray<WorldCollider>,
    private readonly surfaces: ReadonlyArray<TraversalSurface>,
    private readonly dynamicColliders: ReadonlyArray<DynamicBoxCollider>,
    private readonly volumes: ReadonlyArray<WorldVolume>,
    private readonly links: ReadonlyArray<EnemyTraversalLink>,
  ) {}

  resolve(request: EnemyNavigationRequest): EnemyNavigationResolution {
    const { state, capabilities } = request;
    const desired = request.desiredPosition.clone();
    const current = request.currentPosition.clone();
    const homeDistance = Vector3.Distance(desired, request.homePosition);

    state.routeGoal = desired.clone();
    if (homeDistance > request.leashRange + 0.5) {
      return this.fail(current, state, 'outside-navigation-zone');
    }

    if (capabilities.flying) {
      state.mode = 'walk';
      state.failureReason = 'none';
      state.lastValidPosition.copyFrom(desired);
      return this.success(desired, 'walk', null, false);
    }

    const dynamicAvoided = this.avoidActors(
      current,
      desired,
      capabilities.radius,
      request.nearbyObstaclePositions,
    );
    const support = this.sampleSupport(dynamicAvoided.x, dynamicAvoided.z);
    const currentSupport = this.sampleSupport(current.x, current.z);
    const actorOffset = state.lastValidPosition.y - state.supportHeight;
    const heightDelta = support - currentSupport;

    if (this.isRestricted(dynamicAvoided)) {
      return this.tryLocalDetour(request, 'outside-navigation-zone');
    }

    if (
      this.isBlocked(dynamicAvoided, capabilities.radius, support) ||
      this.isPathBlocked(current, dynamicAvoided, capabilities.radius)
    ) {
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal);
      return this.tryLocalDetour(request, 'blocked-by-solid');
    }

    if (this.isDynamicBlocked(dynamicAvoided, capabilities.radius)) {
      return this.tryLocalDetour(request, 'blocked-by-dynamic-obstacle');
    }

    if (heightDelta > capabilities.maximumStepHeight) {
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal);
      if (
        capabilities.canJump &&
        heightDelta <= capabilities.maximumJumpHeight &&
        Vector3.Distance(current, desired) <= capabilities.maximumJumpDistance
      ) {
        return this.beginBallisticMove(request, dynamicAvoided, support + actorOffset, 'jump');
      }
      return this.tryLocalDetour(request, 'invalid-landing');
    }

    if (heightDelta < -capabilities.maximumSafeDrop) {
      if (capabilities.canDrop) {
        return this.beginBallisticMove(request, dynamicAvoided, support + actorOffset, 'drop');
      }
      return this.tryLocalDetour(request, 'no-ground-ahead');
    }

    dynamicAvoided.y = support + actorOffset;
    state.supportHeight = support;
    state.verticalVelocity = 0;
    state.grounded = true;
    state.mode = Math.abs(heightDelta) > 0.04 ? 'step' : 'walk';
    state.failureReason = 'none';
    state.activeTraversalLinkId = null;
    state.blockedTime = 0;
    state.lastValidPosition.copyFrom(dynamicAvoided);
    return this.success(dynamicAvoided, state.mode, null, false);
  }

  private beginBallisticMove(
    request: EnemyNavigationRequest,
    target: Vector3,
    support: number,
    mode: 'jump' | 'drop',
  ): EnemyNavigationResolution {
    const state = request.state;
    const next = target.clone();
    const gravity = 18;
    if (mode === 'jump' && state.grounded) {
      state.verticalVelocity = Math.sqrt(
        2 * gravity * Math.max(0.35, support - request.currentPosition.y + 0.5),
      );
      state.grounded = false;
    }
    state.verticalVelocity -= gravity * request.dt;
    next.y = request.currentPosition.y + state.verticalVelocity * request.dt;
    if (next.y <= support) {
      next.y = support;
      state.verticalVelocity = 0;
      state.grounded = true;
    }
    state.mode = mode;
    state.failureReason = 'none';
    state.lastValidPosition.copyFrom(next);
    return this.success(next, mode, state.activeTraversalLinkId, false);
  }

  private useTraversal(
    request: EnemyNavigationRequest,
    link: EnemyTraversalLink,
  ): EnemyNavigationResolution {
    const { capabilities, state } = request;
    if (link.maximumEnemyRadius && capabilities.radius > link.maximumEnemyRadius) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    if (link.allowedRoles && !link.allowedRoles.includes(request.role)) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    if (link.type === 'platform' && !capabilities.canUsePlatforms) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    if (link.type === 'jump' && !capabilities.canJump) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    if (link.type === 'drop' && !capabilities.canDrop) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }

    const towardExit = link.exitPosition.subtract(request.currentPosition);
    const distance = towardExit.length();
    if (distance > 0.001) towardExit.normalize();
    const step = Math.min(distance, Math.max(0.05, request.dt * 4.2));
    const next = request.currentPosition.add(towardExit.scale(step));
    next.y = Math.max(next.y, this.sampleSupport(next.x, next.z));

    state.activeTraversalLinkId = link.id;
    state.mode =
      link.type === 'platform' || link.type === 'lift'
        ? 'platform'
        : link.type === 'drop'
          ? 'drop'
          : 'jump';
    state.failureReason = 'none';
    state.lastValidPosition.copyFrom(next);
    return this.success(next, state.mode, link.id, true);
  }

  private findTraversalLink(
    request: EnemyNavigationRequest,
    current: Vector3,
    desired: Vector3,
  ): EnemyTraversalLink | null {
    let best: EnemyTraversalLink | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const link of this.links) {
      const entryDistance = Vector3.Distance(current, link.entryPosition);
      if (entryDistance > link.activationRadius + request.capabilities.maximumJumpDistance) continue;
      const score = entryDistance + Vector3.Distance(link.exitPosition, desired);
      if (score < bestScore) {
        best = link;
        bestScore = score;
      }
    }
    return best;
  }

  private tryLocalDetour(
    request: EnemyNavigationRequest,
    initialReason: EnemyNavigationFailureReason,
  ): EnemyNavigationResolution {
    const current = request.currentPosition;
    const toGoal = request.desiredPosition.subtract(current);
    toGoal.y = 0;
    if (toGoal.lengthSquared() <= 0.0001) {
      return this.fail(current, request.state, initialReason);
    }
    toGoal.normalize();
    const tangent = new Vector3(-toGoal.z, 0, toGoal.x);
    const stride = Math.max(0.35, request.capabilities.radius * 1.5);

    for (const side of [1, -1]) {
      const candidate = current
        .add(toGoal.scale(stride * 0.55))
        .add(tangent.scale(stride * side));
      const support = this.sampleSupport(candidate.x, candidate.z);
      candidate.y = support + (request.state.lastValidPosition.y - request.state.supportHeight);
      if (
        !this.isBlocked(candidate, request.capabilities.radius, support) &&
        !this.isDynamicBlocked(candidate, request.capabilities.radius) &&
        !this.isRestricted(candidate)
      ) {
        request.state.mode = 'walk';
        request.state.failureReason = initialReason;
        request.state.lastReplanAt = performance.now();
        request.state.lastValidPosition.copyFrom(candidate);
        request.state.blockedTime = 0;
        return this.success(candidate, 'walk', null, true);
      }
    }

    return this.fail(current, request.state, initialReason);
  }

  private avoidActors(
    current: Vector3,
    desired: Vector3,
    radius: number,
    obstacles: readonly Vector3[],
  ): Vector3 {
    const adjusted = desired.clone();
    for (const obstacle of obstacles) {
      const delta = adjusted.subtract(obstacle);
      delta.y = 0;
      const distance = delta.length();
      const clearance = radius * 2 + 0.2;
      if (distance > 0.001 && distance < clearance) {
        adjusted.addInPlace(delta.normalize().scale(clearance - distance));
      } else if (distance <= 0.001) {
        adjusted.x += radius;
      }
    }
    adjusted.y = current.y;
    return adjusted;
  }

  private sampleSupport(x: number, z: number): number {
    let support = 0;
    for (const surface of this.surfaces) {
      if (!this.surfaceContains(surface, x, z)) continue;
      const height = surface.sampleHeight
        ? surface.sampleHeight(x, z)
        : surface.surfaceHeight;
      support = Math.max(support, height);
    }
    for (const collider of this.dynamicColliders) {
      if (
        Math.abs(x - collider.center.x) <= collider.halfWidth &&
        Math.abs(z - collider.center.z) <= collider.halfDepth
      ) {
        support = Math.max(support, collider.center.y + collider.halfHeight);
      }
    }
    return support;
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
      return Vector3.DistanceSquared(closest, new Vector3(x, closest.y, z)) <= (surface.width * 0.5) ** 2;
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


  private isPathBlocked(start: Vector3, end: Vector3, radius: number): boolean {
    const distance = Vector3.Distance(start, end);
    const steps = Math.max(1, Math.ceil(distance / 0.35));
    for (let index = 1; index <= steps; index += 1) {
      const point = Vector3.Lerp(start, end, index / steps);
      const support = this.sampleSupport(point.x, point.z);
      point.y = support;
      if (
        this.isBlocked(point, radius, support) ||
        this.isDynamicBlocked(point, radius) ||
        this.isRestricted(point)
      ) {
        return true;
      }
    }
    return false;
  }

  private isBlocked(position: Vector3, radius: number, support: number): boolean {
    return this.colliders.some(collider => {
      if (collider.interaction === 'hazard') return false;
      if (
        collider.interaction === 'traversable' &&
        support >= (collider.clearanceHeight ?? 0.65) - 0.08
      ) {
        return false;
      }
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

  private isDynamicBlocked(position: Vector3, radius: number): boolean {
    return this.dynamicColliders.some(collider => {
      const onTop = position.y >= collider.center.y + collider.halfHeight - 0.08;
      if (onTop) return false;
      return (
        Math.abs(position.x - collider.center.x) < collider.halfWidth + radius &&
        Math.abs(position.z - collider.center.z) < collider.halfDepth + radius
      );
    });
  }

  private isRestricted(position: Vector3): boolean {
    return this.volumes.some(volume => {
      if (
        volume.kind !== 'constraint' &&
        volume.kind !== 'hazard' &&
        volume.kind !== 'water-hazard'
      ) {
        return false;
      }
      const footprint = volume.footprint;
      return (
        Math.abs(position.x - footprint.centerX) <= footprint.halfWidth &&
        Math.abs(position.z - footprint.centerZ) <= footprint.halfDepth
      );
    });
  }

  private success(
    position: Vector3,
    mode: EnemyNavigationResolution['mode'],
    linkId: string | null,
    replanned: boolean,
  ): EnemyNavigationResolution {
    return {
      position,
      mode,
      failureReason: 'none',
      usedTraversalLinkId: linkId,
      replanned,
    };
  }

  private fail(
    position: Vector3,
    state: EnemyNavigationRequest['state'],
    reason: EnemyNavigationFailureReason,
  ): EnemyNavigationResolution {
    state.mode = 'blocked';
    state.failureReason = reason;
    state.blockedTime += 1 / 60;
    return {
      position: state.lastValidPosition.clone(),
      mode: 'blocked',
      failureReason: reason,
      usedTraversalLinkId: null,
      replanned: false,
    };
  }
}
