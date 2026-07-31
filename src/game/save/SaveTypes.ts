export type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3';

export interface SaveSummary {
  slotId: SaveSlotId;
  savedAt: number;
  playtimeSeconds: number;
  checkpointName: string;
  leaderName: string;
  partyLevels: number[];
  buildVersion: string;
}

export interface AstralSaveData {
  schemaVersion: number;
  buildVersion: string;
  savedAt: number;
  playtimeSeconds: number;
  checkpoint: unknown;
  engineSnapshot: unknown;
  loot: unknown[];
  equipmentByCharacter: Record<string, Record<string, unknown>>;
  merchantStock?: Record<string, Array<{ item: unknown; price: number }>>;
  merchantRefreshAt?: Record<string, number>;
  recruitmentFlow?: {
    starterId: string | null;
    campRecruitId: string | null;
    hunterRecruited: boolean;
    finalRecruitId: string | null;
  };
  summary: Omit<SaveSummary, 'slotId'>;
}
