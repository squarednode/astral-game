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
  }

  setDebugVisible(visible: boolean): void {
    this.debugMeshes.forEach(mesh => {
      mesh.visibility = visible ? 0.34 : 0;
    });
  }

  update(
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
      inDeepWater: false,
      drownRemaining: null,
      drowned: false,
    };

    // Raised surfaces such as bridges, logs, rocks, and platforms take
    // precedence over water volumes beneath them.
    const mayEnterWater = supportHeight <= 0.08 && position.y <= 0.22;

    const activeVolumes = this.volumes.filter(volume =>
      this.contains(volume, position),
    );

    for (const volume of activeVolumes) {
      if (
        volume.kind === 'water-hazard' &&
        !mayEnterWater
      ) {
        continue;
      }

      result.activeVolumeIds.push(volume.id);
      result.speedMultiplier = Math.min(
        result.speedMultiplier,
        volume.speedMultiplier,
      );
      result.disableJump ||= Boolean(volume.disableJump);
      result.disableDodge ||= Boolean(volume.disableDodge);

      if (volume.kind === 'water-hazard') {
        this.applyWaterHazard(volume, result, dt);
      }
    }

    if (!result.inDeepWater) {
      this.waterEntryBank = null;
      this.activeWaterVolumeId = null;
      this.drownRemaining = null;
    }

    return result;
  }

  private applyWaterHazard(
    volume: WaterHazardVolume,
    result: WorldVolumeResult,
    dt: number,
  ): void {
    result.inDeepWater = true;

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
      volume.bankAxis === 'x'
        ? position.x
        : position.z;

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
      volume.bankAxis === 'x'
        ? position.x
        : position.z;

    // The player may move sideways and back toward the entry bank, but may
    // not advance farther through the river toward the opposite bank.
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

      mesh.position.set(
        footprint.centerX,
        0.1,
        footprint.centerZ,
      );

      const material = new StandardMaterial(
        `world-volume-debug-material-${volume.id}`,
        this.scene,
      );

      const color =
        volume.kind === 'water-hazard'
          ? new Color3(0.9, 0.15, 0.12)
          : new Color3(0.1, 0.55, 1);

      material.diffuseColor = color;
      material.emissiveColor = color.scale(0.55);
      material.alpha = 0.42;
      mesh.material = material;
      mesh.visibility = 0;
      this.debugMeshes.push(mesh);
    }
  }
}
