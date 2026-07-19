import type { GeneratedItemInstance, ItemRarity } from './LootTypes';

export type GroundLootKind = 'equipment' | 'currency' | 'material' | 'quest';

export interface GroundLootEquipmentPayload {
  kind: 'equipment';
  item: GeneratedItemInstance;
}

export interface GroundLootCurrencyPayload {
  kind: 'currency';
  currencyId: 'copper';
  amount: number;
}

export interface GroundLootMaterialPayload {
  kind: 'material';
  materialId: string;
  amount: number;
}

export interface GroundLootQuestPayload {
  kind: 'quest';
  questItemId: string;
  amount: number;
}

export type GroundLootPayload =
  | GroundLootEquipmentPayload
  | GroundLootCurrencyPayload
  | GroundLootMaterialPayload
  | GroundLootQuestPayload;

export interface GroundLootRecord {
  id: number;
  payload: GroundLootPayload;
  position: { x: number; y: number; z: number };
  protectedUntil: number;
  expiresAt: number;
  visible: boolean;
  pickupRadius: number;
  label: string;
  rarity?: ItemRarity;
}
