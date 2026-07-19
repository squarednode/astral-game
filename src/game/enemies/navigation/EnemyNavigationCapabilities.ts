import type { EnemyDefinition } from '../../definitions/EnemyDefinitions';
import type { EnemyNavigationCapabilities } from './EnemyNavigationTypes';

export function capabilitiesForEnemy(
  definition: Readonly<EnemyDefinition>,
): EnemyNavigationCapabilities {
  const large = definition.role === 'brute' || definition.role === 'boss';
  const low = definition.role === 'crab';
  const agile =
    definition.role === 'assassin' ||
    definition.role === 'wolf' ||
    definition.role === 'mother-wolf' ||
    definition.role === 'grunt' ||
    definition.role === 'archer';

  return {
    radius: Math.max(0.35, definition.targetRadius * 0.72),
    height: Math.max(0.6, definition.targetHeight),
    maximumStepHeight: large ? 0.3 : low ? 0.22 : 0.42,
    maximumJumpHeight: agile ? 1.65 : 0,
    maximumJumpDistance: agile ? 3.2 : 0,
    maximumSafeDrop: large ? 0.75 : low ? 0.45 : 2.2,
    canJump: agile,
    canDrop: !large,
    canUsePlatforms: !low,
    canClimb: false,
    flying: false,
  };
}
