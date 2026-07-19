import { Vector3 } from '@babylonjs/core';
import type {
  EnemyNavigationFailureReason,
  EnemyNavigationRequest,
  EnemyNavigationResolution,
  EnemyTraversalLink,
} from './EnemyNavigationTypes';
import { NavigationSurfaceManager } from './NavigationSurfaceManager';

export class EnemyNavigationSystem {
  private readonly landingReservations = new Map<string, string>();
  constructor(
    private readonly surfaces: NavigationSurfaceManager,
    private readonly links: ReadonlyArray<EnemyTraversalLink>,
  ) {}

  resolve(request: EnemyNavigationRequest): EnemyNavigationResolution {
    const { state, capabilities } = request;
    const desired = request.desiredPosition.clone();
    const now = performance.now();

    if (state.traversalPhase === 'takeoff' || state.traversalPhase === 'airborne' || state.traversalPhase === 'landing') {
      const landing = state.traversalLandingPosition ?? request.currentPosition;
      state.mode = state.traversalPhase === 'landing' ? 'idle' : 'jump';
      return this.success(landing.clone(), state.mode, state.activeTraversalLinkId, false);
    }
    if (state.traversalPhase === 'settle') {
      state.traversalSettleRemaining = Math.max(0, state.traversalSettleRemaining - request.dt);
      if (state.traversalSettleRemaining > 0) {
        state.mode = 'idle';
        return this.success(request.currentPosition.clone(), 'idle', state.activeTraversalLinkId, false);
      }
      state.traversalPhase = 'complete';
    }
    if (state.traversalPhase === 'complete') {
      const reserved = state.reservedLandingSurfaceId;
      if (reserved && this.landingReservations.get(reserved) === request.agentId) {
        this.landingReservations.delete(reserved);
      }
      state.reservedLandingSurfaceId = null;
      state.activeTraversalLinkId = null;
      state.traversalOwner = null;
      state.traversalPhase = 'idle';
      state.traversalAttemptCount = 0;
      state.traversalCooldownUntil = 0;
      if (state.traversalExitPosition) {
        desired.copyFrom(state.traversalExitPosition);
        state.traversalExitPosition = null;
      }
      state.traversalLandingPosition = null;
    }
    const current = request.currentPosition.clone();
    const homeDistance = Vector3.Distance(desired, request.homePosition);

    const goalChanged =
      !state.lastGoalPosition ||
      Vector3.Distance(state.lastGoalPosition, desired) > Math.max(0.35, capabilities.radius);
    state.routeGoal = desired.clone();
    state.pathAge += request.dt;
    if (goalChanged || state.pathAge > capabilities.maximumPathAge) {
      state.pathAge = 0;
      state.lastReplanAt = performance.now();
      state.pathGeneration += 1;
      state.lastGoalPosition = desired.clone();
      if (!goalChanged) state.lastBlockedReason = 'stale-path';
    }
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
    const swept = this.surfaces.sweepBody(
      current,
      dynamicAvoided,
      capabilities.radius + capabilities.navigationSkin,
      actorOffset,
      capabilities.minimumSupportRatio,
    );
    state.supportRatio = swept.supportRatio;
    if (!swept.clear) {
      const slid = this.tryObstacleSlide(request, current, dynamicAvoided, actorOffset);
      if (slid) {
        state.sweepResult = 'slide';
        return slid;
      }
      const traversal = this.findTraversalLink(request, current, desired);
      if (traversal) return this.useTraversal(request, traversal, actorOffset);
      state.sweepResult = 'blocked';
      return this.tryLocalDetour(request, swept.reason, actorOffset);
    }
    state.sweepResult = 'clear';

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
    const changedSurface = state.supportSurfaceId !== finalSupport.surfaceId;
    state.supportHeight = finalSupport.height;
    state.surfaceType = finalSupport.type;
    state.supportSurfaceId = finalSupport.surfaceId;
    state.supportRatio = this.surfaces.sampleFootprint(
      dynamicAvoided,
      capabilities.radius + capabilities.navigationSkin,
    ).ratio;
    if (changedSurface) {
      state.pathAge = 0;
      state.pathGeneration += 1;
      state.lastReplanAt = performance.now();
    }
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
    const { state, capabilities } = request;
    const radius = capabilities.radius + capabilities.navigationSkin;
    const landingValidation = this.surfaces.validateLanding(
      target, radius, Math.max(0, state.lastValidPosition.y - state.supportHeight),
      capabilities.minimumSupportRatio,
    );
    if (!landingValidation.valid) {
      state.traversalAttemptCount += 1;
      state.traversalCooldownUntil = performance.now() + 2200;
      return this.fail(request.currentPosition, state, 'invalid-landing');
    }
    const postLanding = this.surfaces.findConnectedExit(
      landingValidation.position, request.desiredPosition, radius,
      Math.max(0, state.lastValidPosition.y - state.supportHeight),
      capabilities.minimumSupportRatio,
    );
    const goalIsLanding = Vector3.Distance(landingValidation.position, request.desiredPosition) <= radius * 1.5;
    if (!postLanding && !goalIsLanding) {
      state.traversalAttemptCount += 1;
      state.traversalCooldownUntil = performance.now() + 2500;
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    const surfaceId = landingValidation.support.surfaceId;
    if (surfaceId) {
      const owner = this.landingReservations.get(surfaceId);
      if (owner && owner !== request.agentId) {
        return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
      }
      this.landingReservations.set(surfaceId, request.agentId);
      state.reservedLandingSurfaceId = surfaceId;
    }
    state.traversalPhase = mode === 'jump' ? 'takeoff' : 'airborne';
    state.traversalOwner = 'planner';
    state.traversalLandingPosition = landingValidation.position.clone();
    state.traversalExitPosition = postLanding?.clone() ?? null;
    state.traversalSettleRemaining = 0.2;
    state.traversalLastAttemptAt = performance.now();
    state.traversalAttemptCount += 1;
    state.mode = mode;
    state.failureReason = 'none';
    state.pathValid = true;
    return this.success(landingValidation.position.clone(), mode, state.activeTraversalLinkId, true);
  }

  private useTraversal(
    request: EnemyNavigationRequest,
    link: EnemyTraversalLink,
    actorOffset: number,
  ): EnemyNavigationResolution {
    const { capabilities, state } = request;
    const now = performance.now();
    if (now < state.traversalCooldownUntil || state.traversalAttemptCount >= 2) {
      return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    }
    if (link.maximumEnemyRadius && capabilities.radius > link.maximumEnemyRadius) return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    if (link.allowedRoles && !link.allowedRoles.includes(request.role)) return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    if (link.type === 'platform' && !capabilities.canUsePlatforms) return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    if (link.type === 'jump' && !capabilities.canJump) return this.fail(request.currentPosition, state, 'traversal-link-unavailable');
    if (link.type === 'drop' && !capabilities.canDrop) return this.fail(request.currentPosition, state, 'traversal-link-unavailable');

    state.activeTraversalLinkId = link.id;
    if (link.type === 'platform' || link.type === 'lift') {
      state.traversalPhase = 'approach';
      state.traversalOwner = 'planner';
      state.mode = 'platform';
      return this.success(link.entryPosition.clone(), 'platform', link.id, true);
    }
    return this.beginBallisticMove(
      request, link.exitPosition.clone(), link.exitPosition.y + actorOffset,
      link.type === 'drop' ? 'drop' : 'jump',
    );
  }

  private findTraversalLink(
    request: EnemyNavigationRequest,
    current: Vector3,
    desired: Vector3,
  ): EnemyTraversalLink | null {
    let best: EnemyTraversalLink | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    if (performance.now() < request.state.traversalCooldownUntil || request.state.traversalAttemptCount >= 2) return null;
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

  private tryObstacleSlide(
    request: EnemyNavigationRequest,
    current: Vector3,
    desired: Vector3,
    actorOffset: number,
  ): EnemyNavigationResolution | null {
    const movement = desired.subtract(current);
    movement.y = 0;
    if (movement.lengthSquared() <= 0.0001) return null;
    movement.normalize();
    const tangent = new Vector3(-movement.z, 0, movement.x);
    const radius = request.capabilities.radius + request.capabilities.navigationSkin;
    const stride = Math.max(0.18, Math.min(0.55, Vector3.Distance(current, desired)));

    for (const side of [1, -1]) {
      const candidate = current
        .add(movement.scale(stride * 0.3))
        .add(tangent.scale(stride * 0.85 * side));
      const support = this.surfaces.sampleSupport(candidate.x, candidate.z);
      candidate.y = support.height + actorOffset;
      const sweep = this.surfaces.sweepBody(
        current,
        candidate,
        radius,
        actorOffset,
        request.capabilities.minimumSupportRatio,
      );
      if (!sweep.clear) continue;
      const state = request.state;
      state.mode = 'walk';
      state.failureReason = 'none';
      state.lastBlockedReason = 'none';
      state.lastReplanAt = performance.now();
      state.pathAge = 0;
      state.pathGeneration += 1;
      state.pathValid = true;
      state.supportHeight = support.height;
      state.surfaceType = support.type;
      state.supportSurfaceId = support.surfaceId;
      state.supportRatio = sweep.supportRatio;
      state.lastValidPosition.copyFrom(candidate);
      state.blockedTime = 0;
      return this.success(candidate, 'walk', null, true);
    }
    return null;
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
    const stride = Math.max(0.35, request.capabilities.radius * 1.8);
    const radius = request.capabilities.radius + request.capabilities.navigationSkin;
    const candidates = [
      [0.45, 1], [0.45, -1],
      [0.05, 1.35], [0.05, -1.35],
      [-0.25, 1.15], [-0.25, -1.15],
    ] as const;

    for (const [forward, side] of candidates) {
      const candidate = current
        .add(toGoal.scale(stride * forward))
        .add(tangent.scale(stride * side));
      const support = this.surfaces.sampleSupport(candidate.x, candidate.z);
      if (!support.walkable) continue;
      candidate.y = support.height + actorOffset;
      const sweep = this.surfaces.sweepBody(
        current,
        candidate,
        radius,
        actorOffset,
        request.capabilities.minimumSupportRatio,
      );
      if (!sweep.clear) continue;
      request.state.mode = 'walk';
      request.state.failureReason = 'none';
      request.state.lastBlockedReason = initialReason;
      request.state.lastReplanAt = performance.now();
      request.state.pathAge = 0;
      request.state.pathGeneration += 1;
      request.state.pathValid = true;
      request.state.supportHeight = support.height;
      request.state.surfaceType = support.type;
      request.state.supportSurfaceId = support.surfaceId;
      request.state.supportRatio = sweep.supportRatio;
      request.state.sweepResult = 'slide';
      request.state.lastValidPosition.copyFrom(candidate);
      request.state.blockedTime = 0;
      return this.success(candidate, 'walk', null, true);
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
    state.sweepResult = 'blocked';
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
