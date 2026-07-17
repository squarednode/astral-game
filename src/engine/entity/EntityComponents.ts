import type { TransformNode } from '@babylonjs/core';

export const EntityComponentKeys = {
  transform: 'core.transform',
  metadata: 'core.metadata',
  health: 'gameplay.health',
} as const;

export interface TransformComponent {
  node: TransformNode;
}

export interface MetadataComponent {
  archetype: string;
  persistent: boolean;
}

export interface HealthComponent {
  current: number;
  maximum: number;
}
