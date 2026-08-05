import type { LevelDefinition, WorldDefinition } from './LevelTypes';

export class LevelRegistry {
  private readonly worlds = new Map<string, WorldDefinition>();
  private readonly levels = new Map<string, LevelDefinition>();

  registerWorld(definition: WorldDefinition): void {
    if (this.worlds.has(definition.id)) throw new Error(`Duplicate world definition: ${definition.id}`);
    this.worlds.set(definition.id, definition);
  }

  registerLevel(definition: LevelDefinition): void {
    if (this.levels.has(definition.id)) throw new Error(`Duplicate level definition: ${definition.id}`);
    this.levels.set(definition.id, definition);
  }

  world(id: string): WorldDefinition | undefined { return this.worlds.get(id); }
  level(id: string): LevelDefinition | undefined { return this.levels.get(id); }
  allWorlds(): readonly WorldDefinition[] { return [...this.worlds.values()]; }
  allLevels(): readonly LevelDefinition[] { return [...this.levels.values()]; }

  validate(): readonly string[] {
    const issues: string[] = [];
    for (const world of this.worlds.values()) {
      if (!this.levels.has(world.startingLevelId)) issues.push(`${world.id}: missing starting level ${world.startingLevelId}`);
      for (const levelId of world.levelIds) if (!this.levels.has(levelId)) issues.push(`${world.id}: missing level ${levelId}`);
    }
    for (const level of this.levels.values()) {
      if (!this.worlds.has(level.worldId)) issues.push(`${level.id}: missing world ${level.worldId}`);
      if (!level.spawns.some(spawn => spawn.id === level.defaultSpawnId)) issues.push(`${level.id}: missing default spawn ${level.defaultSpawnId}`);
      const zoneIds = new Set(level.zones.map(zone => zone.id));
      for (const transition of level.transitions) {
        if (!zoneIds.has(transition.zoneId)) {
          issues.push(`${level.id}: transition ${transition.id} references missing zone ${transition.zoneId}`);
        }
        if (!transition.destinationLevelId) continue;
        const destination = this.levels.get(transition.destinationLevelId);
        if (!destination) {
          issues.push(`${level.id}: transition ${transition.id} references missing destination level ${transition.destinationLevelId}`);
          continue;
        }
        if (
          transition.destinationSpawnId &&
          !destination.spawns.some(spawn => spawn.id === transition.destinationSpawnId)
        ) {
          issues.push(`${level.id}: transition ${transition.id} references missing destination spawn ${transition.destinationSpawnId}`);
        }
      }
    }
    return issues;
  }
}
