import type {
  EncounterArenaDefinition,
  EncounterDefinition,
} from './EncounterTypes';

export class EncounterRegistry {
  private readonly encounters = new Map<string, EncounterDefinition>();
  private readonly arenas = new Map<string, EncounterArenaDefinition>();

  registerEncounter(definition: EncounterDefinition): void {
    this.encounters.set(definition.id, definition);
  }

  registerArena(definition: EncounterArenaDefinition): void {
    this.arenas.set(definition.id, definition);
  }

  encounter(id: string): EncounterDefinition | undefined {
    return this.encounters.get(id);
  }

  arena(id: string): EncounterArenaDefinition | undefined {
    return this.arenas.get(id);
  }

  allEncounters(): readonly EncounterDefinition[] {
    return [...this.encounters.values()];
  }

  allArenas(): readonly EncounterArenaDefinition[] {
    return [...this.arenas.values()];
  }
}
