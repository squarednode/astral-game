import { Vector3 } from '@babylonjs/core';
import type {
  EnemyNavigationFailureReason,
  EnemyNavigationRequest,
  EnemyNavigationResolution,
  EnemyTraversalLink,
} from './EnemyNavigationTypes';
import { NavigationSurfaceManager } from './NavigationSurfaceManager';

export class EnemyNavigationSystem {
  constructor(
    private readonly surfaces: NavigationSurfaceManager,
    private readonly links: ReadonlyArray<EnemyTraversalLink>,
  ) {}

  resolve(request: EnemyNavigationRequest): EnemyNavigationResolution {
    const { state, capabilities } = request;
    const desired = request.desiredPosition.clone();
    const current = request.currentPosition.clone();
    const homeDistance = Vector3.Distance(desired, request.homePosition);

    state.routeGoal = desired.clone();
    state.pathAge += request.dt;
    if (homeDistance > request.leashRange + 0.5) {
      return this.fail(current, state, 'outside-navigation-zone');
    }

    if (capabilities.flying) {
      state.mode = 'walk';
      state.failureReason = 'none';
      state.pathValid = true;
      state.lastValidPosition.copyFrom(desired);
      return this.success(desired, 'walk', null, false);
    }

    const dynamicAvoided = this.avoidActors(
      current,
      desired,
      capabilities.radius,
      request.nearbyObstaclePositions,
    );
    const targetSupport = this.surfaces.sampleSupport(dynamicAvoided.x, dynamicAvoided.z);
    const currentSupport = this.surfaces.sampleSupport(current.x, current.z);
    const actorOffset = Math.max(0, state.lastValidPosition.y - state.supportHeight);
    const heightDelta = targetSupport.height - currentSupport.height;

    if (!targetSupport.walkable) {
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal, actorOffset);
      return this.tryLocalDetour(request, 'outside-navigation-zone', actorOffset);
    }

    dynamicAvoided.y = targetSupport.height + actorOffset;
    if (
      this.surfaces.isBlocked(dynamicAvoided, capabilities.radius, targetSupport) ||
      this.isPathBlocked(current, dynamicAvoided, capabilities.radius, actorOffset)
    ) {
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal, actorOffset);
      return this.tryLocalDetour(request, 'blocked-by-solid', actorOffset);
    }

    if (this.surfaces.isDynamicBlocked(dynamicAvoided, capabilities.radius, targetSupport)) {
      return this.tryLocalDetour(request, 'blocked-by-dynamic-obstacle', actorOffset);
    }

    if (heightDelta > capabilities.maximumStepHeight) {
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal, actorOffset);
      if (
        capabilities.canJump &&
        heightDelta <= capabilities.maximumJumpHeight &&
        Vector3.Distance(current, desired) <= capabilities.maximumJumpDistance
      ) {
        return this.beginBallisticMove(
          request,
          dynamicAvoided,
          targetSupport.height + actorOffset,
          'jump',
        );
      }
      return this.tryLocalDetour(request, 'invalid-landing', actorOffset);
    }

    if (heightDelta < -capabilities.maximumSafeDrop) {
      if (capabilities.canDrop) {
        return this.beginBallisticMove(
          request,
          dynamicAvoided,
          targetSupport.height + actorOffset,
          'drop',
        );
      }
      return this.tryLocalDetour(request, 'no-ground-ahead', actorOffset);
    }

    // Final projection is authoritative. It prevents movement updates from
    // retaining stale Y values after stepping between terrain and platforms.
    const finalSupport = this.surfaces.projectToSupport(dynamicAvoided, actorOffset);
    state.supportHeight = finalSupport.height;
    state.surfaceType = finalSupport.type;
    state.supportSurfaceId = finalSupport.surfaceId;
    state.verticalVelocity = 0;
    state.grounded = true;
    state.mode = Math.abs(heightDelta) > 0.04 ? 'step' : 'walk';
    state.failureReason = 'none';
    state.lastBlockedReason = 'none';
    state.activeTraversalLinkId = null;
    state.blockedTime = 0;
    state.pathValid = true;
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
      const landed = this.surfaces.sampleSupport(next.x, next.z);
      state.supportHeight = landed.height;
      state.surfaceType = landed.type;
      state.supportSurfaceId = landed.surfaceId;
    }
    state.mode = mode;
    state.failureReason = 'none';
    state.lastBlockedReason = 'none';
    state.pathValid = true;
    state.lastValidPosition.copyFrom(next);
    return this.success(next, mode, state.activeTraversalLinkId, false);
  }

  private useTraversal(
    request: EnemyNavigationRequest,
    link: EnemyTraversalLink,
    actorOffset: number,
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
    const support = this.surfaces.sampleSupport(next.x, next.z);
    if (support.walkable) next.y = support.height + actorOffset;

    state.supportHeight = support.height;
    state.surfaceType = support.type;
    state.supportSurfaceId = support.surfaceId;
    state.activeTraversalLinkId = link.id;
    state.mode =
      link.type === 'platform' || link.type === 'lift'
        ? 'platform'
        : link.type === 'drop'
          ? 'drop'
          : 'jump';
    state.failureReason = 'none';
    state.lastBlockedReason = 'none';
    state.pathValid = true;
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
    actorOffset: number,
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
      const support = this.surfaces.sampleSupport(candidate.x, candidate.z);
      if (!support.walkable) continue;
      candidate.y = support.height + actorOffset;
      if (
        !this.surfaces.isBlocked(candidate, request.capabilities.radius, support) &&
        !this.surfaces.isDynamicBlocked(candidate, request.capabilities.radius, support)
      ) {
        request.state.mode = 'walk';
        request.state.failureReason = initialReason;
        request.state.lastBlockedReason = initialReason;
        request.state.lastReplanAt = performance.now();
        request.state.pathAge = 0;
        request.state.pathValid = true;
        request.state.supportHeight = support.height;
        request.state.surfaceType = support.type;
        request.state.supportSurfaceId = support.surfaceId;
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

  private isPathBlocked(
    start: Vector3,
    end: Vector3,
    radius: number,
    actorOffset: number,
  ): boolean {
    const distance = Vector3.Distance(start, end);
    const steps = Math.max(1, Math.ceil(distance / 0.35));
    for (let index = 1; index <= steps; index += 1) {
      const point = Vector3.Lerp(start, end, index / steps);
      const support = this.surfaces.sampleSupport(point.x, point.z);
      if (!support.walkable) return true;
      point.y = support.height + actorOffset;
      if (
        this.surfaces.isBlocked(point, radius, support) ||
        this.surfaces.isDynamicBlocked(point, radius, support)
      ) return true;
    }
    return false;
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
    state.lastBlockedReason = reason;
    state.pathValid = false;
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
