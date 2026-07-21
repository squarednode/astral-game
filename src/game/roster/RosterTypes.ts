export interface RosterCharacterDefinition {
  characterId: string;
  unlockedByDefault?: boolean;
  activeByDefault?: boolean;
  recruitmentSource?: string;
}

export interface RosterSnapshot {
  maximumActiveCharacters: number;
  leaderId: string | null;
  unlockedCharacterIds: readonly string[];
  activeCharacterIds: readonly string[];
  reserveCharacterIds: readonly string[];
}

export interface RosterSerializedState {
  version: 1;
  leaderId: string | null;
  unlockedCharacterIds: string[];
  activeCharacterIds: string[];
}
