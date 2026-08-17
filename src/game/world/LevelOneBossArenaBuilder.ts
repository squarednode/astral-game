import { Color3, MeshBuilder, TransformNode, Vector3, type Mesh } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import type { DynamicBoxCollider, TraversalSurface, WorldCollider, WorldLandmark } from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';
import { groundSurfaceMaterial } from './GroundSurfaceMaterials';

export function buildLevelOneBossArena(options: OutdoorZoneBuildOptions): LevelInstance {
  const root = new TransformNode('level-one-boss-pad', options.scene);
  const colliders: WorldCollider[] = [];
  const traversalSurfaces: TraversalSurface[] = [];
  const worldVolumes: WorldVolume[] = [];
  const dynamicColliders: DynamicBoxCollider[] = [];
  const landmarks: WorldLandmark[] = [];
  const traversalHighlights: Mesh[] = [];

  const groundMaterial = groundSurfaceMaterial(options.scene, 'sand');
  const arenaMaterial = groundSurfaceMaterial(options.scene, 'stone');
  const returnMaterial = options.material('boss-return-portal', new Color3(0.20, 0.75, 1), 0.35);
  const nextMaterial = options.material('boss-level2-portal', new Color3(0.50, 0.30, 1), 0.40);

  const ground = MeshBuilder.CreateBox('boss-pad-ground', { width:50, depth:50, height:0.16 }, options.scene);
  ground.position.y=0.08; ground.parent=root; ground.material=groundMaterial; ground.receiveShadows=true;
  ground.metadata={ astralGround:true }; ground.isPickable=true;
  traversalSurfaces.push({
    mode:'free', shape:'box', id:'boss-pad-surface', label:'Boss Pad', colliderLabel:'boss-pad-ground',
    center:new Vector3(0,0.16,0), halfWidth:25, halfDepth:25, surfaceHeight:0.16, entryPadding:0.8, exitDistance:1.1,
  });

  const arena = MeshBuilder.CreateCylinder('boss-arena-mark', { diameter:24, height:0.05, tessellation:48 }, options.scene);
  arena.position.set(0,0.19,2); arena.parent=root; arena.material=arenaMaterial; arena.isPickable=false;

  const returnPortal = MeshBuilder.CreateTorus('boss-return-portal', { diameter:5, thickness:0.35, tessellation:40 }, options.scene);
  returnPortal.position.set(0,2,-20); returnPortal.rotation.x=Math.PI/2; returnPortal.parent=root; returnPortal.material=returnMaterial;
  worldVolumes.push({
    id:'boss-return-portal', label:'Return to Level 1', kind:'trigger',
    footprint:{ shape:'box', centerX:0, centerZ:-20, halfWidth:3, halfDepth:3 },
    eventId:'level-one.boss-to-main', once:false,
  });

  const level2Portal = MeshBuilder.CreateTorus('boss-level2-portal', { diameter:5, thickness:0.35, tessellation:40 }, options.scene);
  level2Portal.position.set(0,2,20); level2Portal.rotation.x=Math.PI/2; level2Portal.parent=root; level2Portal.material=nextMaterial;
  worldVolumes.push({
    id:'boss-level2-portal', label:'Portal to Level 2', kind:'trigger',
    footprint:{ shape:'box', centerX:0, centerZ:20, halfWidth:3, halfDepth:3 },
    eventId:'level-one.boss-to-level2', once:false,
  });

  landmarks.push(
    { id:'boss-entry', label:'Wolf Keeper Arena Entry', position:new Vector3(0,0.16,-16) },
    { id:'boss-arena', label:'Wolf Keeper Arena', position:new Vector3(0,0.16,0) },
    { id:'boss-pack-left', label:'Boss Pack Left', position:new Vector3(-8,0.16,5) },
    { id:'boss-pack-right', label:'Boss Pack Right', position:new Vector3(8,0.16,5) },
    { id:'boss-spawn', label:'Wolf Keeper Spawn', position:new Vector3(0,0.16,8) },
    { id:'boss-return', label:'Return Portal', position:new Vector3(0,0.16,-20) },
    { id:'level2-portal', label:'Portal to Level 2', position:new Vector3(0,0.16,20) },
  );

  return {
    id:'boss', root, groundName:'boss-pad-ground', colliders, traversalSurfaces, worldVolumes,
    dynamicColliders, landmarks, traversalHighlights, update:()=>undefined,
    dispose:()=>root.dispose(false,false),
  };
}
