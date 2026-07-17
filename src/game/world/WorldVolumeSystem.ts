import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type {
  WaterEntryBank,
  WaterHazardVolume,
  WorldVolume,
  WorldVolumeResult,
} from './WorldVolumeTypes';

export class WorldVolumeSystem {
  private waterEntryBank: WaterEntryBank | null = null;
  private activeWaterVolumeId: string | null = null;
  private drownRemaining: number | null = null;
  private activeVolumeIds = new Set<string>();
  private readonly consumedVolumeIds = new Set<string>();
  private readonly debugMeshes: Mesh[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly volumes: ReadonlyArray<WorldVolume>,
  ) {
    this.createDebugMeshes();
  }

  reset(): void {
    this.waterEntryBank = null;
    this.activeWaterVolumeId = null;
    this.drownRemaining = null;
    this.activeVolumeIds.clear();
  }

  setDebugVisible(visible: boolean): void {
    this.debugMeshes.forEach(mesh => {
      mesh.visibility = visible ? 0.34 : 0;
    });
  }

  update(
    previousPosition: Vector3,
    position: Vector3,
    supportHeight: number,
    dt: number,
  ): WorldVolumeResult {
    const result: WorldVolumeResult = {
      position: position.clone(),
      speedMultiplier: 1,
      disableJump: false,
      disableDodge: false,
      activeVolumeIds: [],
      enteredVolumeIds: [],
      exitedVolumeIds: [],
      triggerEvents: [],
      spawnRequests: [],
      constraintMessages: [],
      damageAmount: 0,
      forceDelta: Vector3.Zero(),
      inDeepWater: false,
      drownRemaining: null,
      drowned: false,
    };

    // Any resolved raised support wins over water beneath it. This keeps
    // bridges, logs, rocks, and platforms dry without adding exclusions to
    // individual water volumes.
    const mayEnterWater =
      supportHeight <= 0.08 &&
      position.y <= supportHeight + 0.22;
    const nextActiveIds = new Set<string>();

    for (const volume of this.volumes) {
      if (!this.contains(volume, result.position)) continue;
      if (volume.kind === 'water-hazard' && !mayEnterWater) continue;
      if (
        volume.kind === 'modifier' &&
        volume.groundContactOnly &&
        supportHeight > 0.08
      ) {
        continue;
      }

      const entering = !this.activeVolumeIds.has(volume.id);
      nextActiveIds.add(volume.id);
      result.activeVolumeIds.push(volume.id);
      if (entering) result.enteredVolumeIds.push(volume.id);

      switch (volume.kind) {
        case 'modifier':
          this.applyMovementModifier(volume, result);
          break;
        case 'hazard':
          result.speedMultiplier = Math.min(
            result.speedMultiplier,
            volume.speedMultiplier ?? 1,
          );
          result.disableJump ||= Boolean(volume.disableJump);
          result.disableDodge ||= Boolean(volume.disableDodge);
          result.damageAmount += volume.damagePerSecond * dt;
          break;
        case 'water-hazard':
          this.applyWaterHazard(volume, result, dt);
          break;
        case 'force':
          result.speedMultiplier = Math.min(
            result.speedMultiplier,
            volume.speedMultiplier ?? 1,
          );
          result.disableJump ||= Boolean(volume.disableJump);
          result.disableDodge ||= Boolean(volume.disableDodge);
          result.forceDelta.x += volume.velocityX * dt;
          result.forceDelta.z += volume.velocityZ * dt;
          result.position.x += volume.velocityX * dt;
          result.position.z += volume.velocityZ * dt;
          break;
        case 'constraint':
          // Constraint volumes reject entry. They are the reusable replacement
          // for ledge rails and special traversal clamps.
          result.position.copyFrom(previousPosition);
          if (entering && volume.message) {
            result.constraintMessages.push(volume.message);
          }
          break;
        case 'trigger':
          if (
            entering &&
            (!volume.once || !this.consumedVolumeIds.has(volume.id))
          ) {
            result.triggerEvents.push(volume.eventId);
            if (volume.once) this.consumedVolumeIds.add(volume.id);
          }
          break;
        case 'spawn':
          if (
            entering &&
            (!volume.once || !this.consumedVolumeIds.has(volume.id))
          ) {
            result.spawnRequests.push({
              volumeId: volume.id,
              spawnId: volume.spawnId,
              spawnType: volume.spawnType,
              count: volume.count,
              position: result.position.clone(),
            });
            if (volume.once) this.consumedVolumeIds.add(volume.id);
          }
          break;
      }
    }

    for (const priorId of this.activeVolumeIds) {
      if (!nextActiveIds.has(priorId)) {
        result.exitedVolumeIds.push(priorId);
      }
    }
    this.activeVolumeIds = nextActiveIds;

    if (!result.inDeepWater) {
      this.waterEntryBank = null;
      this.activeWaterVolumeId = null;
      this.drownRemaining = null;
    }

    return result;
  }

  private applyMovementModifier(
    volume: {
      speedMultiplier: number;
      disableJump?: boolean;
      disableDodge?: boolean;
    },
    result: WorldVolumeResult,
  ): void {
    result.speedMultiplier = Math.min(
      result.speedMultiplier,
      volume.speedMultiplier,
    );
    result.disableJump ||= Boolean(volume.disableJump);
    result.disableDodge ||= Boolean(volume.disableDodge);
  }

  private applyWaterHazard(
    volume: WaterHazardVolume,
    result: WorldVolumeResult,
    dt: number,
  ): void {
    result.inDeepWater = true;
    this.applyMovementModifier(volume, result);

    if (this.activeWaterVolumeId !== volume.id) {
      this.activeWaterVolumeId = volume.id;
      this.waterEntryBank = this.determineEntryBank(
        volume,
        result.position,
      );
      this.drownRemaining = volume.drownSeconds;
    }

    this.drownRemaining = Math.max(
      0,
      (this.drownRemaining ?? volume.drownSeconds) - dt,
    );

    result.position = this.constrainTowardEntryBank(
      volume,
      result.position,
    );
    result.drownRemaining = this.drownRemaining;

    if (this.drownRemaining <= 0) {
      result.drowned = true;
      result.position = this.createRecoveryPosition(
        volume,
        result.position,
      );
      this.drownRemaining = volume.drownSeconds;
    }
  }

  private createRecoveryPosition(
    volume: WaterHazardVolume,
    position: Vector3,
  ): Vector3 {
    const recovery = position.clone();
    const footprint = volume.footprint;

    if (volume.bankAxis === 'x') {
      recovery.x =
        this.waterEntryBank === 'negative'
          ? footprint.centerX - footprint.halfWidth - 0.75
          : footprint.centerX + footprint.halfWidth + 0.75;
    } else {
      recovery.z =
        this.waterEntryBank === 'negative'
          ? footprint.centerZ - footprint.halfDepth - 0.75
          : footprint.centerZ + footprint.halfDepth + 0.75;
    }

    recovery.y = 0;
    return recovery;
  }

  private determineEntryBank(
    volume: WaterHazardVolume,
    position: Vector3,
  ): WaterEntryBank {
    const coordinate =
      volume.bankAxis === 'x' ? position.x : position.z;

    return coordinate < volume.bankCenter
      ? 'negative'
      : 'positive';
  }

  private constrainTowardEntryBank(
    volume: WaterHazardVolume,
    position: Vector3,
  ): Vector3 {
    if (!this.waterEntryBank) return position.clone();

    const constrained = position.clone();
    const coordinate =
      volume.bankAxis === 'x' ? position.x : position.z;
    const limit =
      this.waterEntryBank === 'negative'
        ? volume.bankCenter - volume.recoveryPadding
        : volume.bankCenter + volume.recoveryPadding;
    const constrainedCoordinate =
      this.waterEntryBank === 'negative'
        ? Math.min(coordinate, limit)
        : Math.max(coordinate, limit);

    if (volume.bankAxis === 'x') {
      constrained.x = constrainedCoordinate;
    } else {
      constrained.z = constrainedCoordinate;
    }

    return constrained;
  }

  private contains(
    volume: WorldVolume,
    position: Vector3,
  ): boolean {
    if (
      volume.minimumY !== undefined &&
      position.y < volume.minimumY
    ) {
      return false;
    }
    if (
      volume.maximumY !== undefined &&
      position.y > volume.maximumY
    ) {
      return false;
    }

    const footprint = volume.footprint;
    return (
      Math.abs(position.x - footprint.centerX) <=
        footprint.halfWidth &&
      Math.abs(position.z - footprint.centerZ) <=
        footprint.halfDepth
    );
  }

  private createDebugMeshes(): void {
    for (const volume of this.volumes) {
      const footprint = volume.footprint;
      const mesh = MeshBuilder.CreateBox(
        `world-volume-debug-${volume.id}`,
        {
          width: footprint.halfWidth * 2,
          depth: footprint.halfDepth * 2,
          height: 0.08,
        },
        this.scene,
      );
      mesh.position.set(footprint.centerX, 0.1, footprint.centerZ);

      const material = new StandardMaterial(
        `world-volume-debug-material-${volume.id}`,
        this.scene,
      );
      const color = this.debugColor(volume);
      material.diffuseColor = color;
      material.emissiveColor = color.scale(0.55);
      material.alpha = 0.42;
      mesh.material = material;
      mesh.visibility = 0;
      this.debugMeshes.push(mesh);
    }
  }

  private debugColor(volume: WorldVolume): Color3 {
    switch (volume.kind) {
      case 'modifier': return new Color3(0.1, 0.55, 1);
      case 'hazard':
      case 'water-hazard': return new Color3(0.9, 0.15, 0.12);
      case 'force': return new Color3(0.1, 0.9, 0.85);
      case 'constraint': return new Color3(1, 0.72, 0.12);
      case 'trigger': return new Color3(0.95, 0.85, 0.18);
      case 'spawn': return new Color3(0.68, 0.28, 0.95);
    }
  }
}
