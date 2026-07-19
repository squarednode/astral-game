import type { WorldMarkerProfile, WorldTriggerDefinition } from '../../actors';

export const worldMarkerProfiles: readonly WorldMarkerProfile[] = [
  { id: 'marker.quest.available', kind: 'quest-available', symbol: '?', color: { r: .72, g: .42, b: 1 }, pulse: true, priority: 30 },
  { id: 'marker.quest.active', kind: 'quest-active', symbol: '…', color: { r: .55, g: .65, b: .82 }, pulse: false, priority: 10 },
  { id: 'marker.quest.turn-in', kind: 'quest-turn-in', symbol: '!', color: { r: 1, g: .85, b: .15 }, pulse: true, priority: 40 },
  { id: 'marker.merchant', kind: 'merchant', symbol: '$', color: { r: 1, g: .55, b: .18 }, pulse: false, priority: 15 },
  { id: 'marker.blacksmith', kind: 'blacksmith', symbol: '⚒', color: { r: .9, g: .32, b: .18 }, pulse: false, priority: 20 },
  { id: 'marker.travel', kind: 'travel', symbol: '⛵', color: { r: .2, g: .75, b: 1 }, pulse: false, priority: 15 },
  { id: 'marker.story', kind: 'story', symbol: '◆', color: { r: .42, g: .9, b: .62 }, pulse: false, priority: 5 },
  { id: 'marker.dungeon', kind: 'dungeon', symbol: '◇', color: { r: .82, g: .3, b: .3 }, pulse: true, priority: 25 },
];

export const worldTriggerDefinitions: readonly WorldTriggerDefinition[] = [
  {
    id: 'trigger.test-area-arrival',
    displayName: 'Test Area Arrival',
    shape: { type: 'sphere', center: { x: 0, y: 0, z: 0 }, radius: 0.1 },
    activation: 'enter',
    once: false,
    cooldownSeconds: 2,
    condition: { type: 'world-flag', flagId: 'engine-alpha.test-trigger-enabled', value: true },
    actions: [
      { type: 'show-notification', text: 'World trigger activated.', tone: 'success' },
      { type: 'increment-world-counter', counterId: 'world.trigger.activations', amount: 1 },
    ],
  },
];
