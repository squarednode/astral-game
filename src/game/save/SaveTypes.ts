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
  buildVersion: '0.6.7.6';
  savedAt: number;
  playtimeSeconds: number;
  checkpoint: unknown;
  engineSnapshot: unknown;
  loot: unknown[];
  equipmentByCharacter: Record<string, Record<string, unknown>>;
  summary: Omit<SaveSummary, 'slotId'>;
}
