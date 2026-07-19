export type ActorStateId =
  | 'spawned'
  | 'idle'
  | 'targeted'
  | 'interacting'
  | 'talking'
  | 'trading'
  | 'travelling'
  | 'performing'
  | 'returning'
  | 'disabled'
  | 'hidden';

export type ActorComponentType =
  | 'interaction'
  | 'dialogue'
  | 'merchant'
  | 'quest'
  | 'transport'
  | 'ambient'
  | 'patrol'
  | 'schedule'
  | 'reputation'
  | 'save';

export interface ActorPosition {
  x: number;
  y: number;
  z: number;
}

export interface ActorComponentReference {
  type: ActorComponentType;
  definitionId: string;
}

export interface ActorDefinition {
  id: string;
  displayName: string;
  roleTags: readonly string[];
  position: ActorPosition;
  visualProfileId: string;
  interactionProfileId?: string;
  components: readonly ActorComponentReference[];
  persistentId?: string;
  defaultState?: ActorStateId;
}

export interface ActorVisualProfile {
  id: string;
  primitive: 'capsule' | 'box' | 'cylinder' | 'sphere';
  scale: number;
  height: number;
  highlightIntensity: number;
  promptOffset: number;
  modelAssetId?: string;
  portraitAssetId?: string;
  animationSetId?: string;
}

export interface InteractionProfile {
  id: string;
  promptVerb: string;
  range: number;
  priority: number;
  highlightMode: 'outline' | 'glow' | 'none';
  disabledPrompt?: string;
}

export interface ActorRuntimeSnapshot {
  actorId: string;
  displayName: string;
  state: ActorStateId;
  goal: string;
  distanceToPlayer: number;
  targeted: boolean;
  available: boolean;
  failedCondition?: string;
  components: readonly ActorComponentType[];
}
