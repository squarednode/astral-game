import { Color3, MeshBuilder, TransformNode, Vector3, type Mesh } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import type { DynamicBoxCollider, TraversalSurface, WorldCollider, WorldLandmark } from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';

export function buildLevelOneTown(options: OutdoorZoneBuildOptions): LevelInstance {
  const root = new TransformNode('level-one-town', options.scene);
  const colliders: WorldCollider[] = [];
  const traversalSurfaces: TraversalSurface[] = [];
  const worldVolumes: WorldVolume[] = [];
  const dynamicColliders: DynamicBoxCollider[] = [];
  const landmarks: WorldLandmark[] = [];
  const traversalHighlights: Mesh[] = [];

  const groundMaterial = options.material('town-ground', new Color3(0.24, 0.29, 0.16));
  const pathMaterial = options.material('town-path', new Color3(0.34, 0.27, 0.17));
  const tentMaterial = options.material('town-tent', new Color3(0.38, 0.20, 0.12));
  const woodMaterial = options.material('town-wood', new Color3(0.25, 0.14, 0.07));
  const fireMaterial = options.material('town-fire', new Color3(1, 0.35, 0.06), 0.4);
  const portalMaterial = options.material('town-portal', new Color3(0.20, 0.75, 1), 0.35);

  const ground = MeshBuilder.CreateBox('town-ground', { width: 50, depth: 50, height: 0.16 }, options.scene);
  ground.position.y = 0.08;
  ground.parent = root;
  ground.material = groundMaterial;
  ground.receiveShadows = true;
  ground.metadata = { astralGround: true };
  ground.isPickable = true;
  traversalSurfaces.push({
    mode:'free', shape:'box', id:'town-ground-surface', label:'Town Ground', colliderLabel:'town-ground',
    center:new Vector3(0,0.16,0), halfWidth:25, halfDepth:25, surfaceHeight:0.16, entryPadding:0.8, exitDistance:1.1,
  });

  const path = MeshBuilder.CreateBox('town-entry-path', { width: 12, depth: 23, height: 0.05 }, options.scene);
  path.position.set(0,0.19,-13.5); path.parent=root; path.material=pathMaterial;

  const tent = MeshBuilder.CreateBox('town-quest-tent', { width: 8, depth: 5, height: 3.4 }, options.scene);
  tent.position.set(-9,1.7,11); tent.parent=root; tent.material=tentMaterial;
  colliders.push({ kind:'box', label:'town-quest-tent', centerX:-9, centerZ:11, halfWidth:4, halfDepth:2.5, interaction:'solid' });

  const table = MeshBuilder.CreateBox('town-blacksmith-table', { width: 4.5, depth: 2.2, height: 1.2 }, options.scene);
  table.position.set(10,0.6,7); table.parent=root; table.material=woodMaterial;
  colliders.push({ kind:'box', label:'town-blacksmith-table', centerX:10, centerZ:7, halfWidth:2.25, halfDepth:1.1, interaction:'solid' });

  const fire = MeshBuilder.CreateCylinder('town-fire-pit', { diameter:3.2, height:0.3, tessellation:24 }, options.scene);
  fire.position.set(0,0.3,3); fire.parent=root; fire.material=fireMaterial;
  colliders.push({ kind:'circle', label:'town-fire-pit', centerX:0, centerZ:3, radius:1.6, interaction:'solid' });

  const portal = MeshBuilder.CreateTorus('town-return-portal', { diameter:5, thickness:0.35, tessellation:40 }, options.scene);
  portal.position.set(0,2,-20); portal.rotation.x=Math.PI/2; portal.parent=root; portal.material=portalMaterial;
  worldVolumes.push({
    id:'town-return-portal', label:'Return to Verdant Path', kind:'trigger',
    footprint:{ shape:'box', centerX:0, centerZ:-20, halfWidth:3, halfDepth:3 },
    eventId:'level-one.town-to-main', once:false,
  });

  landmarks.push(
    { id:'town-entry', label:'Forest Town', position:new Vector3(0,0.16,-16) },
    { id:'town-quest-giver', label:'Town Quest Giver', position:new Vector3(-7,0.16,7) },
    { id:'town-blacksmith', label:'Town Blacksmith', position:new Vector3(8,0.16,5) },
    { id:'town-return', label:'Return Portal', position:new Vector3(0,0.16,-20) },
  );

  return {
    id:'town', root, groundName:'town-ground', colliders, traversalSurfaces, worldVolumes,
    dynamicColliders, landmarks, traversalHighlights, update:()=>undefined, dispose:()=>root.dispose(false,true),
  };
}
