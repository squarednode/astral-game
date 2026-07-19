import type { StatusEffectDefinition } from '../definitions/combat';

export function createStatusDefinitionMap(definitions: readonly Readonly<StatusEffectDefinition>[]): ReadonlyMap<string, Readonly<StatusEffectDefinition>> {
  return new Map(definitions.map(definition => [definition.id, definition]));
}
