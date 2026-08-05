import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance, LevelSpaceId } from './LevelInstanceSystem';
import type {
  DynamicBoxCollider,
  TraversalSurface,
  WorldCollider,
  WorldLandmark,
} from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';

export class LevelInstanceBuilder {
  readonly root: TransformNode;
  readonly colliders: WorldCollider[] = [];
  readonly traversalSurfaces: TraversalSurface[] = [];
  readonly worldVolumes: WorldVolume[] = [];
  readonly dynamicColliders: DynamicBoxCollider[] = [];
  readonly landmarks: WorldLandmark[] = [];
  readonly traversalHighlights: Mesh[] = [];
  private groundName = '';

  constructor(readonly id: LevelSpaceId, readonly options: OutdoorZoneBuildOptions) {
    this.root = new TransformNode(`level-space-${id}-root`, options.scene);
  }

  ground(name: string, x: number, z: number, width: number, depth: number, color: Color3, top = 0.24): Mesh {
    const mesh = this.box(name, x, z, width, depth, top, color);
    mesh.metadata = { ...(mesh.metadata ?? {}), astralGround: true, levelSpaceId: this.id };
    this.groundName ||= mesh.name;
    return mesh;
  }

  box(name: string, x: number, z: number, width: number, depth: number, height: number, color: Color3): Mesh {
    const mesh = MeshBuilder.CreateBox(`${this.id}-${name}`, { width, depth, height }, this.options.scene);
    mesh.position.set(x, height / 2, z);
    mesh.parent = this.root;
    mesh.material = this.options.material(`${this.id}-${name}`, color);
    mesh.receiveShadows = true;
    this.options.shadows.addShadowCaster(mesh);
    return mesh;
  }

  water(name: string, x: number, z: number, width: number, depth: number, y: number): Mesh {
    const mesh = MeshBuilder.CreateGround(`${this.id}-${name}`, { width, height: depth, subdivisions: 1 }, this.options.scene);
    mesh.position.set(x, y, z);
    mesh.parent = this.root;
    mesh.material = this.options.material('level-water', new Color3(0.05, 0.36, 0.62), 0.1);
    mesh.visibility = 0.92;
    return mesh;
  }

  rock(name: string, x: number, z: number, radius: number, collide = true): Mesh {
    const mesh = MeshBuilder.CreateIcoSphere(`${this.id}-${name}`, { radius, subdivisions: 1 }, this.options.scene);
    mesh.position.set(x, radius * 0.72, z);
    mesh.scaling.set(1.3, 0.82, 1.05);
    mesh.parent = this.root;
    mesh.material = this.options.material('level-rock', new Color3(0.29, 0.31, 0.3));
    this.options.shadows.addShadowCaster(mesh);
    if (collide) this.circleCollider(name, x, z, radius * 0.7);
    return mesh;
  }

  tree(name: string, x: number, z: number, scale = 1): void {
    const trunk = MeshBuilder.CreateCylinder(`${this.id}-${name}-trunk`, { height: 4.2 * scale, diameterTop: 0.5 * scale, diameterBottom: 0.8 * scale, tessellation: 10 }, this.options.scene);
    trunk.position.set(x, 2.1 * scale, z);
    trunk.parent = this.root;
    trunk.material = this.options.material('level-tree-trunk', new Color3(0.28, 0.17, 0.08));
    const crown = MeshBuilder.CreateIcoSphere(`${this.id}-${name}-crown`, { radius: 1.9 * scale, subdivisions: 2 }, this.options.scene);
    crown.position.set(x, 4.6 * scale, z);
    crown.scaling.y = 1.15;
    crown.parent = this.root;
    crown.material = this.options.material('level-tree-crown', new Color3(0.13, 0.34, 0.16));
    this.options.shadows.addShadowCaster(trunk);
    this.options.shadows.addShadowCaster(crown);
    this.circleCollider(name, x, z, 0.55 * scale);
  }

  portal(name: string, x: number, z: number): void {
    const ring = MeshBuilder.CreateTorus(`${this.id}-${name}`, { diameter: 3.2, thickness: 0.3, tessellation: 32 }, this.options.scene);
    ring.position.set(x, 1.65, z);
    ring.rotation.x = Math.PI / 2;
    ring.parent = this.root;
    ring.material = this.options.material(`${this.id}-portal`, new Color3(0.75, 0.04, 0.08), 0.7);
  }

  boxCollider(label: string, x: number, z: number, width: number, depth: number, interaction: WorldCollider['interaction'] = 'solid', clearanceHeight = 0.65): void {
    this.colliders.push({ kind: 'box', label: `${this.id}-${label}`, centerX: x, centerZ: z, halfWidth: width / 2, halfDepth: depth / 2, interaction, clearanceHeight });
  }

  circleCollider(label: string, x: number, z: number, radius: number, interaction: WorldCollider['interaction'] = 'solid', clearanceHeight = 0.65): void {
    this.colliders.push({ kind: 'circle', label: `${this.id}-${label}`, centerX: x, centerZ: z, radius, interaction, clearanceHeight });
  }

  bridge(name: string, x: number, z: number, width: number, depth: number, top = 0.28): void {
    const mesh = this.box(name, x, z, width, depth, top, new Color3(0.38, 0.23, 0.1));
    const label = `${this.id}-${name}`;
    this.boxCollider(name, x, z, width, depth, 'traversable', top);
    this.traversalSurfaces.push({ mode: 'free', shape: 'box', id: `${label}-surface`, label: name, colliderLabel: label, center: new Vector3(x, top, z), halfWidth: width / 2, halfDepth: depth / 2, surfaceHeight: top, entryPadding: 0.75, exitDistance: 0.65 });
    this.traversalHighlights.push(mesh);
  }

  landmark(id: string, label: string, x: number, z: number, y = 0.25): void {
    this.landmarks.push({ id, label, position: new Vector3(x, y, z) });
  }

  finish(update: (dt: number) => void = () => undefined): LevelInstance {
    if (!this.groundName) throw new Error(`Level space ${this.id} has no ground mesh.`);
    return {
      id: this.id,
      root: this.root,
      groundName: this.groundName,
      colliders: this.colliders,
      traversalSurfaces: this.traversalSurfaces,
      worldVolumes: this.worldVolumes,
      dynamicColliders: this.dynamicColliders,
      landmarks: this.landmarks,
      traversalHighlights: this.traversalHighlights,
      update,
      dispose: () => this.root.dispose(false, false),
    };
  }
}
