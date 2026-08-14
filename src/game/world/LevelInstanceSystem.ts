import { TransformNode, type Mesh } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type {
  DynamicBoxCollider,
  ElevatorStateId,
  OutdoorZone,
  TraversalSurface,
  WorldCollider,
  WorldLandmark,
} from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';
import type { StateMachineSnapshot } from '../../engine/state';

export type LevelSpaceId = 'main' | 'town' | 'boss' | 'level2' | 'testing';

export interface LevelInstance {
  readonly id: LevelSpaceId;
  readonly root: TransformNode;
  readonly groundName: string;
  readonly colliders: WorldCollider[];
  readonly traversalSurfaces: TraversalSurface[];
  readonly worldVolumes: WorldVolume[];
  readonly dynamicColliders: DynamicBoxCollider[];
  readonly landmarks: WorldLandmark[];
  readonly traversalHighlights: Mesh[];
  update(dt: number): void;
  dispose(): void;
}

export type LevelInstanceFactory = (options: OutdoorZoneBuildOptions) => LevelInstance;

export interface LevelInstanceZone extends OutdoorZone {
  readonly activeSpaceId: LevelSpaceId;
  loadSpace(id: LevelSpaceId): void;
  findLandmark(id: string): { spaceId: LevelSpaceId; landmark: WorldLandmark } | null;
  snapshot(): {
    activeSpaceId: LevelSpaceId;
    loadedRootName: string;
    colliderCount: number;
    surfaceCount: number;
    volumeCount: number;
    landmarkCount: number;
  };
}

const replaceContents = <T>(target: T[], source: readonly T[]): void => {
  target.splice(0, target.length, ...source);
};

export class LevelInstanceSystem implements LevelInstanceZone {
  readonly colliders: WorldCollider[] = [];
  readonly traversalSurfaces: TraversalSurface[] = [];
  readonly worldVolumes: WorldVolume[] = [];
  readonly dynamicColliders: DynamicBoxCollider[] = [];
  readonly landmarks: WorldLandmark[] = [];

  private active: LevelInstance;
  private highlightVisible = false;
  private readonly landmarkCatalog = new Map<string, { spaceId: LevelSpaceId; landmark: WorldLandmark }>();

  constructor(
    private readonly options: OutdoorZoneBuildOptions,
    private readonly factories: Readonly<Record<LevelSpaceId, LevelInstanceFactory>>,
    initialSpace: LevelSpaceId = 'main',
  ) {
    this.active = this.factories[initialSpace](this.options);
    this.indexLandmarks(initialSpace, this.active.landmarks);
    this.publish(this.active);
  }

  get activeSpaceId(): LevelSpaceId { return this.active.id; }
  get groundName(): string { return this.active.groundName; }

  loadSpace(id: LevelSpaceId): void {
    if (id === this.active.id) return;
    const previous = this.active;
    const next = this.factories[id](this.options);
    this.indexLandmarks(id, next.landmarks);
    this.active = next;
    this.publish(next);
    this.setTraversalHighlightVisible(this.highlightVisible);
    previous.dispose();
  }

  findLandmark(id: string): { spaceId: LevelSpaceId; landmark: WorldLandmark } | null {
    const active = this.landmarks.find(candidate => candidate.id === id);
    if (active) return { spaceId: this.active.id, landmark: active };

    const indexed = this.landmarkCatalog.get(id);
    if (indexed) return indexed;

    for (const spaceId of Object.keys(this.factories) as LevelSpaceId[]) {
      if (spaceId === this.active.id) continue;
      const temporary = this.factories[spaceId](this.options);
      this.indexLandmarks(spaceId, temporary.landmarks);
      temporary.dispose();
      const found = this.landmarkCatalog.get(id);
      if (found) return found;
    }
    return null;
  }

  update(dt: number): void { this.active.update(dt); }

  getElevatorStateSnapshot(): StateMachineSnapshot<ElevatorStateId> {
    return {
      id: `level-instance-${this.active.id}`,
      currentState: 'bottom-idle',
      previousState: null,
      timeInState: 0,
      timer: { elapsed: 0, duration: null, remaining: null, progress: null, complete: false },
      transitionCount: 0,
      rejectedTransitionCount: 0,
      updateCount: 0,
      pendingTransition: null,
      interactionCount: 0,
      handledInteractionCount: 0,
      timerCompletionCount: 0,
      blackboardRevision: 0,
    };
  }

  setTraversalHighlightVisible(visible: boolean): void {
    this.highlightVisible = visible;
    this.active.traversalHighlights.forEach(mesh => {
      const material = mesh.material as any;
      if (!material?.emissiveColor) return;
      material.emissiveColor.set(visible ? 0.2 : 0, visible ? 0.65 : 0, visible ? 0.9 : 0);
    });
  }

  snapshot() {
    return {
      activeSpaceId: this.active.id,
      loadedRootName: this.active.root.name,
      colliderCount: this.colliders.length,
      surfaceCount: this.traversalSurfaces.length,
      volumeCount: this.worldVolumes.length,
      landmarkCount: this.landmarks.length,
    };
  }

  private publish(instance: LevelInstance): void {
    replaceContents(this.colliders, instance.colliders);
    replaceContents(this.traversalSurfaces, instance.traversalSurfaces);
    replaceContents(this.worldVolumes, instance.worldVolumes);
    replaceContents(this.dynamicColliders, instance.dynamicColliders);
    replaceContents(this.landmarks, instance.landmarks);
  }

  private indexLandmarks(spaceId: LevelSpaceId, landmarks: readonly WorldLandmark[]): void {
    landmarks.forEach(landmark => {
      this.landmarkCatalog.set(landmark.id, {
        spaceId,
        landmark: {
          ...landmark,
          position: landmark.position.clone(),
        },
      });
    });
  }
}
