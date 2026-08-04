export interface LevelPoint {
  x: number;
  y: number;
  z: number;
}

export type LevelZoneShape =
  | { type: 'circle'; center: LevelPoint; radius: number }
  | { type: 'box'; center: LevelPoint; halfWidth: number; halfDepth: number };

export type LevelZoneRole =
  | 'arrival'
  | 'travel'
  | 'safe'
  | 'encounter'
  | 'quest'
  | 'boss'
  | 'transition';

export interface LevelZoneDefinition {
  id: string;
  displayName: string;
  role: LevelZoneRole;
  shape: LevelZoneShape;
  checkpointId?: string;
  encounterIds?: readonly string[];
  tags?: readonly string[];
}

export interface LevelTransitionDefinition {
  id: string;
  displayName: string;
  zoneId: string;
  destinationLevelId?: string;
  destinationSpawnId?: string;
  requiredWorldFlags?: readonly string[];
}

export interface LevelSpawnDefinition {
  id: string;
  displayName: string;
  position: LevelPoint;
  facing?: number;
  tags?: readonly string[];
}

export interface LevelDefinition {
  id: string;
  worldId: string;
  displayName: string;
  order: number;
  builderId: string;
  defaultSpawnId: string;
  spawns: readonly LevelSpawnDefinition[];
  zones: readonly LevelZoneDefinition[];
  transitions: readonly LevelTransitionDefinition[];
  checkpointIds: readonly string[];
  encounterIds: readonly string[];
}

export interface WorldDefinition {
  id: string;
  displayName: string;
  startingLevelId: string;
  levelIds: readonly string[];
}

export interface LevelRuntimeSnapshot {
  worldId: string;
  worldName: string;
  levelId: string;
  levelName: string;
  currentZoneId: string | null;
  currentZoneName: string | null;
  currentZoneRole: LevelZoneRole | null;
  previousZoneId: string | null;
  enteredZoneAtSeconds: number | null;
}
