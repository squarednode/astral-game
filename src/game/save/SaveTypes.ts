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
  schemaVersion: 1;
  buildVersion: '0.6.7.6' | '0.6.7.7a' | '0.6.7.8' | '0.6.7.9' | '0.6.8.0' | '0.6.8.1';
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
