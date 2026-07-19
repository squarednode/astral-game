import type { TransformNode } from '@babylonjs/core';
import type { StatusComponent } from '../../game/status';

export const EntityComponentKeys = {
  transform: 'core.transform',
  metadata: 'core.metadata',
  health: 'gameplay.health',
  enemy: 'gameplay.enemy',
  statuses: 'gameplay.statuses',
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

export interface EnemyComponent {
  elite: boolean;
  spawnWave: number;
}

export type EntityStatusComponent = StatusComponent;
