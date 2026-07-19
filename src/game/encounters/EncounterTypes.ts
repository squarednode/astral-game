export type EncounterState =
  | 'inactive'
  | 'available'
  | 'arming'
  | 'active'
  | 'phase-transition'
  | 'completed'
  | 'failed'
  | 'resetting'
  | 'disabled';

export interface EncounterPosition {
  x: number;
  y: number;
  z: number;
}

export interface EncounterSpawnPointDefinition {
  id: string;
  position: EncounterPosition;
  tags: readonly string[];
}

export interface EncounterBoundarySettings {
  policy: 'none' | 'immediate-reset' | 'grace-reset';
  graceSeconds?: number;
  enemyLeashToArena?: boolean;
  pauseSpawningDuringGrace?: boolean;
}

export interface EncounterArenaDefinition {
  id: string;
  displayName: string;
  center: EncounterPosition;
  radius: number;
  triggerRadius: number;
  /** @deprecated Use boundary.policy. Retained for older encounter data. */
  boundaryPolicy?: 'none' | 'soft' | 'hard';
  boundary?: EncounterBoundarySettings;
  spawnPoints: readonly EncounterSpawnPointDefinition[];
  playerEntry?: EncounterPosition;
  playerReturn?: EncounterPosition;
}

export interface EncounterSpawnEntryDefinition {
  enemyDefinitionId: string;
  quantity: number;
  elite?: boolean;
  variantId?: string;
  modifierId?: string;
  spawnPointTags?: readonly string[];
  tags?: readonly string[];
  spawnCost?: number;
}

export interface EncounterSpawnGroupDefinition {
  id: string;
  entries: readonly EncounterSpawnEntryDefinition[];
  formation?: 'scatter' | 'line' | 'arc' | 'surround';
  spawnDelaySeconds?: number;
  maximumAlive?: number;
}

export interface EncounterReinforcementDefinition {
  id: string;
  trigger:
    | { type: 'alive-at-most'; value: number }
    | { type: 'elapsed-seconds'; value: number }
    | { type: 'enemy-tag-defeated'; tag: string };
  spawnGroupIds: readonly string[];
  repeatable?: boolean;
}

/**
 * Maintains encounter pressure while a tagged anchor (normally a boss) lives.
 * Empty waves and partial replenishment can use different delays.
 */
export interface EncounterReinforcementControllerDefinition {
  id: string;
  enabled?: boolean;
  anchorTag?: string;
  stopWhenAnchorDies?: boolean;
  spawnGroupIds: readonly string[];
  targetAlive: number;
  lowPopulationThreshold: number;
  emptyWaveDelaySeconds: number;
  replenishDelaySeconds: number;
  checkIntervalSeconds?: number;
  maximumAlive: number;
  maximumTotalSpawned: number;
  spawnBudget?: number;
}

export interface EncounterPhaseDefinition {
  id: string;
  displayName: string;
  spawnGroupIds: readonly string[];
  reinforcements?: readonly EncounterReinforcementDefinition[];
  reinforcementControllers?: readonly EncounterReinforcementControllerDefinition[];
  transitionDelaySeconds?: number;
}

export interface EncounterRewardDefinition {
  copper?: number;
  guaranteedRarity?: 'common' | 'magic' | 'rare' | 'legendary';
  worldFlags?: Readonly<Record<string, boolean>>;
}

export interface EncounterResetPolicy {
  repeatable: boolean;
  resetDelaySeconds?: number;
  preserveCollectedLoot: boolean;
}

export interface EncounterDefinition {
  id: string;
  displayName: string;
  arenaId: string;
  activation: 'trigger' | 'interaction' | 'manual';
  phases: readonly EncounterPhaseDefinition[];
  spawnGroups: readonly EncounterSpawnGroupDefinition[];
  rewards?: EncounterRewardDefinition;
  resetPolicy: EncounterResetPolicy;
}

export interface EncounterEnemyOwnership {
  encounterId: string;
  phaseId: string;
  spawnGroupId: string;
  spawnSequence: number;
}

export interface EncounterSpawnRequest {
  enemyDefinitionId: string;
  position: EncounterPosition;
  elite: boolean;
  variantId?: string;
  modifierId?: string;
  ownership: EncounterEnemyOwnership;
}

export interface EncounterEnemyRecord extends EncounterEnemyOwnership {
  entityId: string;
  alive: boolean;
  enemyDefinitionId: string;
  tags: readonly string[];
}

export interface EncounterReinforcementControllerSnapshot {
  id: string;
  active: boolean;
  anchorAlive: boolean;
  eligibleAlive: number;
  targetAlive: number;
  timerRemaining: number | null;
  maximumAlive: number;
  maximumTotalSpawned: number;
  totalSpawned: number;
  nextSpawnCount: number;
}

export interface EncounterSnapshot {
  id: string;
  displayName: string;
  state: EncounterState;
  currentPhaseIndex: number;
  currentPhaseId: string | null;
  currentPhaseName: string | null;
  phaseCount: number;
  aliveEnemies: number;
  spawnedEnemies: number;
  defeatedEnemies: number;
  pendingSpawns: number;
  elapsedSeconds: number;
  transitionRemaining: number;
  reinforcementStates: Readonly<Record<string, number>>;
  reinforcementControllers: readonly EncounterReinforcementControllerSnapshot[];
  outsideBoundary: boolean;
  boundaryGraceRemaining: number | null;
  failureReason?: string;
  rewardGranted: boolean;
}

export interface EncounterSerializedState {
  version: 1;
  encounters: Readonly<Record<string, {
    state: EncounterState;
    currentPhaseIndex: number;
    elapsedSeconds: number;
    rewardGranted: boolean;
    completedCount: number;
  }>>;
}

export interface EncounterRuntimeCallbacks {
  spawnEnemy(request: EncounterSpawnRequest): string | null;
  removeEnemy(entityId: string): void;
  grantReward(encounterId: string, reward: EncounterRewardDefinition): void;
  emit(type: string, payload: Record<string, unknown>): void;
  notify(title: string, detail?: string): void;
}
