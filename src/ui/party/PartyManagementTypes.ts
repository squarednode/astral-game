export type GearFamily = 'fortified' | 'agile' | 'focused';
export type GearSlot = 'weapon' | 'armor' | 'relic';
export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';
export type SkillSlot = 1 | 2 | 3 | 4;
export type SkillId = 'Q' | 'E';

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

export interface PartySkillView {
  id: SkillId;
  name: string;
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
  skills: PartySkillView[];
  skillSlots: Partial<Record<SkillSlot, SkillId>>;
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
  destroyItems(itemIds: number[]): void;
  assignSkill(
    characterId: string,
    slot: SkillSlot,
    skillId: SkillId | null,
  ): void;
}
