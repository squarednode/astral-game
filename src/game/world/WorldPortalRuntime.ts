import { Engine, Vector3 } from '@babylonjs/core';
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

interface PortalDestination {
  space: LevelSpaceId;
  landmark: string;
  offset?: Vector3;
}

const destinationFor = (triggerId: string): PortalDestination | null => {
  switch (triggerId) {
    case 'level-one.portal-to-town':
      return { space: 'town', landmark: 'town-entry' };
    case 'level-one.town-to-main':
      return {
        space: 'main',
        landmark: 'level1-town-portal',
        offset: new Vector3(-6, 0, 0),
      };
    case 'level-one.portal-to-boss':
      return { space: 'boss', landmark: 'boss-entry' };
    case 'level-one.boss-to-main':
      return {
        space: 'main',
        landmark: 'level1-boss-portal',
        offset: new Vector3(-6, 0, 0),
      };
    case 'level-one.boss-to-level2':
      return { space: 'level2', landmark: 'level2-entry' };
    default:
      return null;
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
    mesh.position.set(
      landmark.position.x,
      landmark.position.y + height / 2,
      landmark.position.z,
    );
    mesh.setEnabled(true);
    const marker = scene.getMeshByName(`actor-marker-${actorId}`);
    if (marker) {
      marker.position.set(
        landmark.position.x,
        landmark.position.y + height + 0.45,
        landmark.position.z,
      );
      marker.setEnabled(true);
    }
  };

  if (space === 'main') place('actor.road-guide', 'level1-road-guide');
  if (space === 'town') {
    place('actor.hunter-mara', 'town-quest-giver');
    place('actor.blacksmith', 'town-blacksmith');
  }
}

function transfer(destination: PortalDestination): boolean {
  const globals = globalThis as PortalGlobals;
  const system = globals.__astralLevelInstanceSystem;
  const scene = Engine.Instances[0]?.scenes[0];
  const player = scene?.getTransformNodeByName('playerRoot');
  if (!system || !player) return false;

  if (destination.space === 'level2') {
    const bossState = globals.__astralEncounterManager
      ?.snapshot('encounter.level1.boss')
      ?.state;
    if (bossState !== 'completed') return true;
  }

  system.loadSpace(destination.space);
  const landmark = system.landmarks.find(
    candidate => candidate.id === destination.landmark,
  );
  if (!landmark) return false;

  player.position.copyFrom(landmark.position);
  if (destination.offset) player.position.addInPlace(destination.offset);
  player.position.y = landmark.position.y;
  repositionSpaceActors(destination.space);

  if (destination.space === 'boss') {
    globals.__astralEncounterManager?.start('encounter.level1.boss');
  }
  return true;
}

export function installWorldPortalRuntime(): void {
  const globals = globalThis as PortalGlobals;
  globals.__astralWorldPortalTrigger = triggerId => {
    const destination = destinationFor(triggerId);
    if (!destination) return false;
    return transfer(destination);
  };

  queueMicrotask(() => repositionSpaceActors('main'));
}
