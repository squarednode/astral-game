import type {
  RosterCharacterDefinition,
  RosterSerializedState,
  RosterSnapshot,
} from './RosterTypes';

export class RosterRuntime {
  private readonly knownIds = new Set<string>();
  private readonly unlockedIds = new Set<string>();
  private activeIds: string[] = [];
  private leader: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    definitions: readonly RosterCharacterDefinition[],
    readonly maximumActiveCharacters = 3,
  ) {
    for (const definition of definitions) {
      this.knownIds.add(definition.characterId);
      if (definition.unlockedByDefault) {
        this.unlockedIds.add(definition.characterId);
      }
      if (
        definition.unlockedByDefault &&
        definition.activeByDefault &&
        this.activeIds.length < maximumActiveCharacters
      ) {
        this.activeIds.push(definition.characterId);
      }
    }
    this.leader = this.activeIds[0] ?? null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isUnlocked(characterId: string): boolean {
    return this.unlockedIds.has(characterId);
  }

  isActive(characterId: string): boolean {
    return this.activeIds.includes(characterId);
  }

  leaderId(): string | null {
    return this.leader;
  }

  unlock(characterId: string, addToParty = true): boolean {
    if (!this.knownIds.has(characterId)) return false;
    const changed = !this.unlockedIds.has(characterId);
    this.unlockedIds.add(characterId);
    if (addToParty && this.activeIds.length < this.maximumActiveCharacters) {
      this.activeIds.push(characterId);
      if (!this.leader) this.leader = characterId;
    }
    if (changed) this.changed();
    return changed;
  }

  addToActive(characterId: string, replaceCharacterId?: string): boolean {
    if (!this.isUnlocked(characterId)) return false;
    if (this.isActive(characterId)) return true;

    if (this.activeIds.length >= this.maximumActiveCharacters) {
      if (!replaceCharacterId || !this.isActive(replaceCharacterId)) return false;
      if (replaceCharacterId === this.leader) this.leader = characterId;
      this.activeIds = this.activeIds.filter(id => id !== replaceCharacterId);
    }

    this.activeIds.push(characterId);
    this.changed();
    return true;
  }

  moveToReserve(characterId: string): boolean {
    if (!this.isActive(characterId) || this.activeIds.length <= 1) return false;
    this.activeIds = this.activeIds.filter(id => id !== characterId);
    if (this.leader === characterId) this.leader = this.activeIds[0] ?? null;
    this.changed();
    return true;
  }

  setLeader(characterId: string): boolean {
    if (!this.isActive(characterId) || this.leader === characterId) return false;
    this.leader = characterId;
    this.changed();
    return true;
  }

  snapshot(): RosterSnapshot {
    const unlockedCharacterIds = [...this.unlockedIds];
    return {
      maximumActiveCharacters: this.maximumActiveCharacters,
      leaderId: this.leader,
      unlockedCharacterIds,
      activeCharacterIds: [...this.activeIds],
      reserveCharacterIds: unlockedCharacterIds.filter(id => !this.activeIds.includes(id)),
    };
  }

  serialize(): RosterSerializedState {
    return {
      version: 1,
      leaderId: this.leader,
      unlockedCharacterIds: [...this.unlockedIds],
      activeCharacterIds: [...this.activeIds],
    };
  }

  deserialize(state: RosterSerializedState): void {
    if (state.version !== 1) return;
    this.unlockedIds.clear();
    state.unlockedCharacterIds
      .filter(id => this.knownIds.has(id))
      .forEach(id => this.unlockedIds.add(id));
    this.activeIds = state.activeCharacterIds
      .filter(id => this.unlockedIds.has(id))
      .slice(0, this.maximumActiveCharacters);
    this.leader = state.leaderId && this.activeIds.includes(state.leaderId)
      ? state.leaderId
      : this.activeIds[0] ?? null;
    this.changed();
  }

  private changed(): void {
    this.listeners.forEach(listener => listener());
  }
}
