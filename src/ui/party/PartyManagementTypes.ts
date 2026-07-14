export type GearFamily = 'fortified' | 'agile' | 'focused';
export type GearSlot = 'weapon' | 'armor' | 'relic';
export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';

export interface PartyEquipmentItem {
  id: number;
  name: string;
  rarity: ItemRarity;
  family: GearFamily;
  slot: GearSlot;
  power: number;
  attackBonus: number;
  maxHpBonus: number;
  swapBonus: number;
  focus: number;
  precision: number;
  technique: number;
  legendaryPower?: string;
}

export interface PartyCharacterView {
  id: string;
  name: string;
  role: string;
  preferredFamily: GearFamily;
  hp: number;
  maxHp: number;
  controlled: boolean;
  equipment: Partial<Record<GearSlot, PartyEquipmentItem>>;
  summary: {
    power: number;
    defense: number;
    mobility: number;
    support: number;
  };
}

export interface PartyManagementModel {
  characters: PartyCharacterView[];
  items: PartyEquipmentItem[];
}

export interface PartyManagementActions {
  close(): void;
  equip(itemId: number, characterId: string): void;
}
