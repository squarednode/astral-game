import './PortalInteractionStyles.css';
import { ArcRotateCamera, Engine, Vector3 } from '@babylonjs/core';
import { prepareProceduralRunnerCameraHandoff } from '../camera/ProceduralRunnerCamera';
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
  triggerId: string;
  space: LevelSpaceId;
  landmark: string;
  label: string;
  sourceSpace: LevelSpaceId;
  sourceLandmark: string;
  offset?: Vector3;
  locked?: () => string | null;
}

let installed = false;
let nearbyPortal: PortalDestination | null = null;

function encounterCompleted(id: string): boolean {
  return (globalThis as PortalGlobals).__astralEncounterManager?.snapshot(id)?.state === 'completed';
}

const portals = (): readonly PortalDestination[] => [
  {
    triggerId: 'level-one.portal-to-town',
    sourceSpace: 'main',
    sourceLandmark: 'level1-town-portal',
    space: 'town',
    landmark: 'town-entry',
    label: 'Enter Town',
  },
  {
    triggerId: 'level-one.town-to-main',
    sourceSpace: 'town',
    sourceLandmark: 'town-return',
    space: 'main',
    landmark: 'level1-town-portal',
    label: 'Return to Verdant Path',
    offset: new Vector3(-6, 0, 0),
  },
  {
    triggerId: 'level-one.portal-to-boss',
    sourceSpace: 'main',
    sourceLandmark: 'level1-boss-portal',
    space: 'boss',
    landmark: 'boss-entry',
    label: 'Enter Wolf Keeper Lair',
    locked: () => encounterCompleted('encounter.level1.mother-wolf')
      ? null
      : 'Defeat the Mother Wolf first',
  },
  {
    triggerId: 'level-one.boss-to-main',
    sourceSpace: 'boss',
    sourceLandmark: 'boss-return',
    space: 'main',
    landmark: 'level1-boss-portal',
    label: 'Return to Verdant Path',
    offset: new Vector3(-6, 0, 0),
  },
  {
    triggerId: 'level-one.boss-to-level2',
    sourceSpace: 'boss',
    sourceLandmark: 'level2-portal',
    space: 'level2',
    landmark: 'level2-entry',
    label: 'Enter Level 2',
    locked: () => encounterCompleted('encounter.level1.boss')
      ? null
      : 'Defeat the Wolf Keeper first',
  },
];

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

  if (destination.locked?.()) return false;

  system.loadSpace(destination.space);
  const landmark = system.landmarks.find(
    candidate => candidate.id === destination.landmark,
  );
  if (!landmark) return false;

  player.position.copyFrom(landmark.position);
  if (destination.offset) player.position.addInPlace(destination.offset);
  player.position.y = landmark.position.y;
  repositionSpaceActors(destination.space);

  if (destination.space === 'main') {
    const camera = scene.getCameraByName('camera');
    const heading = destination.offset?.clone() ?? new Vector3(-1, 0, 0);
    if (camera instanceof ArcRotateCamera) {
      prepareProceduralRunnerCameraHandoff(camera, player, heading);
    }
  }

  if (destination.space === 'boss') {
    globals.__astralEncounterManager?.start('encounter.level1.boss');
  }
  return true;
}

function nearestPortal(): PortalDestination | null {
  const globals = globalThis as PortalGlobals;
  const system = globals.__astralLevelInstanceSystem;
  const scene = Engine.Instances[0]?.scenes[0];
  const player = scene?.getTransformNodeByName('playerRoot');
  if (!system || !player) return null;

  let best: PortalDestination | null = null;
  let bestDistance = 4.25;
  for (const portal of portals()) {
    if (portal.sourceSpace !== system.activeSpaceId) continue;
    const landmark = system.landmarks.find(candidate => candidate.id === portal.sourceLandmark);
    if (!landmark) continue;
    const distance = Math.hypot(
      player.position.x - landmark.position.x,
      player.position.z - landmark.position.z,
    );
    if (distance <= bestDistance) {
      best = portal;
      bestDistance = distance;
    }
  }
  return best;
}

function updatePrompt(prompt: HTMLDivElement): void {
  nearbyPortal = nearestPortal();
  if (!nearbyPortal) {
    prompt.hidden = true;
    return;
  }

  const lockReason = nearbyPortal.locked?.() ?? null;
  prompt.hidden = false;
  prompt.innerHTML = lockReason
    ? `<kbd>E</kbd>${nearbyPortal.label} · ${lockReason}`
    : `<kbd>E</kbd>${nearbyPortal.label}`;
}

export function installWorldPortalRuntime(): void {
  if (installed) return;
  installed = true;

  const globals = globalThis as PortalGlobals;

  // World volumes still provide portal proximity/visual compatibility in a few
  // authored builders. Consume their trigger events without travelling so a
  // player can stand on a portal until they deliberately press Interact.
  globals.__astralWorldPortalTrigger = triggerId =>
    portals().some(portal => portal.triggerId === triggerId);

  const prompt = document.createElement('div');
  prompt.className = 'world-portal-prompt';
  prompt.hidden = true;
  document.body.appendChild(prompt);

  const tick = (): void => {
    updatePrompt(prompt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  window.addEventListener('keydown', event => {
    if (event.code !== 'KeyE' || event.repeat) return;
    const portal = nearbyPortal ?? nearestPortal();
    if (!portal) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (portal.locked?.()) return;
    transfer(portal);
    nearbyPortal = null;
    prompt.hidden = true;
  }, true);

  queueMicrotask(() => repositionSpaceActors('main'));
}
