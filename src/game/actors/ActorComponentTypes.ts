import type { ActionDefinition } from './ActionTypes';
import type { ConditionDefinition } from './ConditionTypes';

export interface QuestObjectiveDefinition {
  id: string;
  type:
    | 'kill-tag'
    | 'collect-material'
    | 'interact'
    | 'enter-zone'
    | 'talk-to-actor'
    | 'complete-encounter'
    | 'defeat-boss';
  targetId?: string;
  targetTags?: readonly string[];
  requiredAmount: number;
}

export interface QuestDefinition {
  id: string;
  displayName: string;
  description: string;
  availability?: ConditionDefinition;
  objectives: readonly QuestObjectiveDefinition[];
  rewards?: readonly ActionDefinition[];
  repeatable?: boolean;
}

export interface MerchantEntryDefinition {
  id: string;
  displayName: string;
  price: number;
  condition?: ConditionDefinition;
  purchaseActions: readonly ActionDefinition[];
  stock?: number;
}

export interface MerchantDefinition {
  id: string;
  displayName: string;
  currencyId: 'copper';
  buybackRate: number;
  sellRate: number;
  entries: readonly MerchantEntryDefinition[];
}

export interface TransportDefinition {
  id: string;
  displayName: string;
  destinationId: string;
  cost?: number;
  condition?: ConditionDefinition;
  travelActions: readonly ActionDefinition[];
}

export interface AmbientDefinition {
  id: string;
  behaviorIds: readonly string[];
  minimumDelay: number;
  maximumDelay: number;
}

export interface ScheduleEntryDefinition {
  id: string;
  startHour: number;
  endHour: number;
  locationId: string;
  ambientDefinitionId?: string;
}
