import type {
  CharacterGrowthModifiers,
  CharacterProgressionDefinition,
  CharacterProgressionSnapshot,
  CharacterProgressionState,
  CharacterGrowthPackageDefinition,
  ExperienceCurveDefinition,
  ProgressionSerializedState,
} from './ProgressionTypes';

export interface ProgressionLevelEvent {
  characterId: string;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
}

export class CharacterProgressionRuntime {
  private readonly curves = new Map<string, ExperienceCurveDefinition>();
  private readonly growthPackages = new Map<string, CharacterGrowthPackageDefinition>();
  private readonly definitions = new Map<string, CharacterProgressionDefinition>();
  private readonly states = new Map<string, CharacterProgressionState>();
  private readonly listeners = new Set<() => void>();
  private readonly levelListeners = new Set<(event: ProgressionLevelEvent) => void>();

  constructor(
    curves: readonly ExperienceCurveDefinition[],
    growthPackages: readonly CharacterGrowthPackageDefinition[],
    definitions: readonly CharacterProgressionDefinition[],
  ) {
    curves.forEach(curve => this.curves.set(curve.id, curve));
    growthPackages.forEach(growth => this.growthPackages.set(growth.id, growth));
    definitions.forEach(definition => {
      this.definitions.set(definition.characterId, definition);
      const level = Math.max(1, definition.startingLevel ?? 1);
      this.states.set(definition.characterId, {
        characterId: definition.characterId,
        level,
        experience: Math.max(0, definition.startingExperience ?? 0),
        totalExperience: Math.max(0, definition.startingExperience ?? 0),
      });
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeLevelUps(listener: (event: ProgressionLevelEvent) => void): () => void {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
  }

  characterIds(): readonly string[] {
    return [...this.states.keys()];
  }

  addExperience(characterId: string, amount: number): number {
    const state = this.states.get(characterId);
    const definition = this.definitions.get(characterId);
    if (!state || !definition || amount <= 0) return 0;

    const curve = this.requireCurve(definition.curveId);
    const previousLevel = state.level;
    const granted = Math.max(0, Math.floor(amount));
    state.experience += granted;
    state.totalExperience += granted;

    while (state.level < curve.maximumLevel) {
      const required = curve.experienceRequiredForLevel(state.level);
      if (state.experience < required) break;
      state.experience -= required;
      state.level += 1;
    }

    const levelsGained = state.level - previousLevel;
    if (levelsGained > 0) {
      const event = {
        characterId,
        previousLevel,
        newLevel: state.level,
        levelsGained,
      };
      this.levelListeners.forEach(listener => listener(event));
    }
    this.changed();
    return levelsGained;
  }

  setLevel(characterId: string, level: number): void {
    const state = this.states.get(characterId);
    const definition = this.definitions.get(characterId);
    if (!state || !definition) return;
    const curve = this.requireCurve(definition.curveId);
    state.level = Math.min(curve.maximumLevel, Math.max(1, Math.floor(level)));
    state.experience = 0;
    this.changed();
  }

  reset(characterId: string): void {
    const state = this.states.get(characterId);
    const definition = this.definitions.get(characterId);
    if (!state || !definition) return;
    state.level = Math.max(1, definition.startingLevel ?? 1);
    state.experience = Math.max(0, definition.startingExperience ?? 0);
    state.totalExperience = state.experience;
    this.changed();
  }

  snapshot(characterId: string): CharacterProgressionSnapshot | null {
    const state = this.states.get(characterId);
    const definition = this.definitions.get(characterId);
    if (!state || !definition) return null;
    const curve = this.requireCurve(definition.curveId);
    const growth = this.requireGrowth(definition.growthPackageId);
    const required = state.level >= curve.maximumLevel
      ? 0
      : curve.experienceRequiredForLevel(state.level);
    return {
      ...state,
      experienceIntoLevel: state.experience,
      experienceForNextLevel: required,
      experienceProgress: required <= 0 ? 1 : Math.min(1, state.experience / required),
      maximumLevel: curve.maximumLevel,
      growth: this.growthModifiers(state.level, growth),
    };
  }

  snapshots(): readonly CharacterProgressionSnapshot[] {
    return this.characterIds()
      .map(id => this.snapshot(id))
      .filter((value): value is CharacterProgressionSnapshot => value !== null);
  }

  growthModifiers(characterId: string): CharacterGrowthModifiers {
    return this.snapshot(characterId)?.growth ?? {
      maximumHealth: 0,
      attack: 0,
      armor: 0,
      movementSpeed: 0,
    };
  }

  serialize(): ProgressionSerializedState {
    return {
      version: 1,
      characters: Object.fromEntries(
        [...this.states.entries()].map(([id, state]) => [id, { ...state }]),
      ),
    };
  }

  deserialize(serialized: ProgressionSerializedState): void {
    if (serialized.version !== 1) return;
    for (const [id, saved] of Object.entries(serialized.characters)) {
      const state = this.states.get(id);
      if (!state) continue;
      state.level = Math.max(1, Math.floor(saved.level));
      state.experience = Math.max(0, Math.floor(saved.experience));
      state.totalExperience = Math.max(state.experience, Math.floor(saved.totalExperience));
    }
    this.changed();
  }

  private growthModifiers(
    level: number,
    growth: CharacterGrowthPackageDefinition,
  ): CharacterGrowthModifiers {
    const gainedLevels = Math.max(0, level - 1);
    return {
      maximumHealth: gainedLevels * growth.maximumHealthPerLevel,
      attack: gainedLevels * growth.attackPerLevel,
      armor: gainedLevels * growth.armorPerLevel,
      movementSpeed: gainedLevels * growth.movementSpeedPerLevel,
    };
  }

  private requireCurve(id: string): ExperienceCurveDefinition {
    const curve = this.curves.get(id);
    if (!curve) throw new Error(`Unknown experience curve: ${id}`);
    return curve;
  }

  private requireGrowth(id: string): CharacterGrowthPackageDefinition {
    const growth = this.growthPackages.get(id);
    if (!growth) throw new Error(`Unknown growth package: ${id}`);
    return growth;
  }

  private changed(): void {
    this.listeners.forEach(listener => listener());
  }
}
