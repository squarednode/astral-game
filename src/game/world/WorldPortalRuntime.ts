import { Engine } from '@babylonjs/core';
import type { LevelInstanceSystem, LevelSpaceId } from './LevelInstanceSystem';

type EncounterSnapshotLike = { state?: string } | null;
type EncounterManagerLike = {
  start(encounterId: string): boolean;
  snapshot(encounterId: string): EncounterSnapshotLike;
};

type PortalGlobals = typeof globalThis & {
  __astralLevelInstanceSystem?: LevelInstanceSystem;
  __astralEncounterManager?: EncounterManagerLike;
  __astralWorldPortalTrigger?: (triggerId: string) => boolean;
};

const destinationFor = (triggerId: string): { space: LevelSpaceId; landmark: string } | null => {
  switch (triggerId) {
    case 'level-one.portal-to-town': return { space: 'town', landmark: 'town-entry' };
    case 'level-one.town-to-main': return { space: 'main', landmark: 'level1-town-portal' };
    case 'level-one.boss-to-main': return { space: 'main', landmark: 'level1-boss-portal' };
    case 'level-one.boss-to-level2': return { space: 'level2', landmark: 'level2-entry' };
    default: return null;
  }
};

function repositionSpaceActors(space: LevelSpaceId): void {
  const scene = Engine.Instances[0]?.scenes[0];
  const system = (globalThis as PortalGlobals).__astralLevelInstanceSystem;
  if (!scene || !system) return;

  const actorIds = [
    'actor.hunter-mara',
    'actor.camp-merchant',
    'actor.ferry-captain',
    'actor.village-elder',
    'actor.blacksmith',
    'actor.road-guide',
  ];
  actorIds.forEach(id => {
    scene.getMeshByName(id)?.setEnabled(false);
    scene.getMeshByName(`actor-marker-${id}`)?.setEnabled(false);
  });

  const place = (actorId: string, landmarkId: string): void => {
    const landmark = system.landmarks.find(candidate => candidate.id === landmarkId);
    const mesh = scene.getMeshByName(actorId);
    if (!landmark || !mesh) return;
    const height = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y * 2;
    mesh.position.set(landmark.position.x, landmark.position.y + height / 2, landmark.position.z);
    mesh.setEnabled(true);
    const marker = scene.getMeshByName(`actor-marker-${actorId}`);
    if (marker) {
      marker.position.set(landmark.position.x, landmark.position.y + height + 0.45, landmark.position.z);
      marker.setEnabled(true);
    }
  };

  if (space === 'main') place('actor.road-guide', 'level1-road-guide');
  if (space === 'town') {
    place('actor.hunter-mara', 'town-quest-giver');
    place('actor.blacksmith', 'town-blacksmith');
  }
}

function transfer(space: LevelSpaceId, landmarkId: string): boolean {
  const globals = globalThis as PortalGlobals;
  const system = globals.__astralLevelInstanceSystem;
  const scene = Engine.Instances[0]?.scenes[0];
  const player = scene?.getTransformNodeByName('playerRoot');
  if (!system || !player) return false;

  if (space === 'level2') {
    const bossState = globals.__astralEncounterManager?.snapshot('encounter.level1.boss')?.state;
    if (bossState !== 'completed') return true;
  }

  system.loadSpace(space);
  const landmark = system.landmarks.find(candidate => candidate.id === landmarkId);
  if (!landmark) return false;

  player.position.copyFrom(landmark.position);
  player.position.y = landmark.position.y;
  repositionSpaceActors(space);

  if (space === 'boss') {
    globals.__astralEncounterManager?.start('encounter.level1.boss');
  }
  return true;
}

export function installWorldPortalRuntime(): void {
  const globals = globalThis as PortalGlobals;
  globals.__astralWorldPortalTrigger = triggerId => {
    const destination = destinationFor(triggerId);
    if (!destination) return false;
    return transfer(destination.space, destination.landmark);
  };

  queueMicrotask(() => repositionSpaceActors('main'));
}
