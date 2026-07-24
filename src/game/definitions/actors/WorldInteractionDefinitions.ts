import type {
  AmbientDefinition,
  DestinationDefinition,
  MerchantDefinition,
  QuestDefinition,
  TransportDefinition,
} from '../../actors';

export const questDefinitions: readonly QuestDefinition[] = [
  {
    id: 'quest.wolf-problem',
    displayName: 'The Wolf Problem',
    description: 'Help Hunter Mara secure the forest route.',
    questGiver: 'Hunter Mara',
    turnInHint: 'Return to Hunter Mara at the NPC Camp once every objective is complete.',
    rewardSummary: ['75 copper', 'Unlock the forest route', 'Recruit Hunter Mara'],
    canAbandon: true,
    abandonPolicy: {
      clearObjectiveProgress: true,
      retainCollectedItems: true,
      returnToAvailable: true,
    },
    objectives: [
      {
        id: 'wolves',
        type: 'kill-tag',
        targetTags: ['wolf'],
        requiredAmount: 6,
        retroactive: false,
      },
      {
        id: 'pelts',
        type: 'collect-material',
        targetId: 'wolf-pelt',
        requiredAmount: 4,
        retroactive: true,
        consumeOnTurnIn: true,
      },
      {
        id: 'keeper',
        type: 'defeat-boss',
        requiredAmount: 1,
        retroactive: false,
      },
    ],
    rewards: [
      { type: 'give-currency', currencyId: 'copper', amount: 75 },
      {
        type: 'set-world-flag',
        flagId: 'forest-route-unlocked',
        value: true,
      },
    ],
  },
];

export const merchantDefinitions: readonly MerchantDefinition[] = [
  {
    id: 'merchant.camp-supplies',
    displayName: 'Camp Supplies',
    currencyId: 'copper',
    buybackRate: 0.35,
    sellRate: 1,
    entries: [
      {
        id: 'merchant.pack-upgrade',
        displayName: 'Reinforced Pack',
        price: 100,
        stock: 1,
        condition: {
          type: 'has-currency',
          currencyId: 'copper',
          amount: 100,
        },
        purchaseActions: [
          { type: 'remove-currency', currencyId: 'copper', amount: 100 },
          { type: 'expand-inventory', amount: 8 },
        ],
      },
    ],
  },
  {
    id: 'merchant.blacksmith',
    displayName: 'Orin’s Forge',
    currencyId: 'copper',
    buybackRate: 0.45,
    sellRate: 1.1,
    entries: [],
  },
];

export const destinationDefinitions: readonly DestinationDefinition[] = [
  {
    id: 'destination.test-area',
    displayName: 'Movement Validation Test Area',
    landmarkId: 'movement-course',
    facing: 0,
  },
  {
    id: 'destination.camp',
    displayName: 'NPC Camp',
    landmarkId: 'npc-camp',
    facing: Math.PI,
  },
];

export const transportDefinitions: readonly TransportDefinition[] = [
  {
    id: 'transport.forest-ferry',
    displayName: 'Forest Ferry',
    destinationId: 'destination.test-area',
    cost: 0,
    condition: {
      type: 'world-flag',
      flagId: 'forest-route-unlocked',
      value: true,
    },
    travelActions: [
      {
        type: 'travel-to-destination',
        destinationId: 'destination.test-area',
      },
    ],
  },
];

export const ambientDefinitions: readonly AmbientDefinition[] = [
  {
    id: 'ambient.hunter',
    behaviorIds: ['look-around', 'inspect-bow', 'watch-forest'],
    minimumDelay: 4,
    maximumDelay: 10,
  },
  {
    id: 'ambient.merchant',
    behaviorIds: ['check-stock', 'wave', 'lean'],
    minimumDelay: 5,
    maximumDelay: 12,
  },
  {
    id: 'ambient.captain',
    behaviorIds: ['watch-water', 'check-rope'],
    minimumDelay: 6,
    maximumDelay: 14,
  },
  {
    id: 'ambient.blacksmith',
    behaviorIds: ['hammer', 'inspect-metal', 'wipe-brow'],
    minimumDelay: 3,
    maximumDelay: 8,
  },
];
