import {
  encounterArenaDefinitions as baseEncounterArenaDefinitions,
  encounterDefinitions as baseEncounterDefinitions,
} from './EncounterDefinitions';
import {
  levelOneEncounterArenaDefinitions,
  levelOneEncounterDefinitions,
} from './LevelOneEncounterDefinitions';

export const encounterArenaDefinitions = [
  ...baseEncounterArenaDefinitions,
  ...levelOneEncounterArenaDefinitions,
] as const;

export const encounterDefinitions = [
  ...baseEncounterDefinitions,
  ...levelOneEncounterDefinitions,
] as const;
