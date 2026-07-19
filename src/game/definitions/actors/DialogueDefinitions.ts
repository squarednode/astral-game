import type { DialogueDefinition } from '../../actors';

export const actorDialogueDefinitions: readonly DialogueDefinition[] = [
  {
    id: 'dialogue.hunter-mara',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.hunter-mara',
        text: 'The wolves are pushing closer to camp. I could use another capable hunter.',
        choices: [
          {
            id: 'ask',
            text: 'What needs to be done?',
            nextNodeId: 'details',
          },
          {
            id: 'accept',
            text: 'I will help.',
            actions: [
              { type: 'start-quest', questId: 'quest.wolf-problem' },
              {
                type: 'set-world-flag',
                flagId: 'quest.wolf-problem.accepted',
                value: true,
              },
            ],
            nextNodeId: 'accepted',
          },
          {
            id: 'leave',
            text: 'Not right now.',
          },
        ],
      },
      {
        id: 'details',
        speakerId: 'actor.hunter-mara',
        text: 'Cull the pack, recover their pelts, and find what is driving them from the forest.',
        nextNodeId: 'start',
      },
      {
        id: 'accepted',
        speakerId: 'actor.hunter-mara',
        text: 'Bring me four pelts. If you see their keeper, do not underestimate it.',
        end: true,
      },
    ],
  },
  {
    id: 'dialogue.camp-merchant',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.camp-merchant',
        text: 'Supplies, blades, and packs. Everything an explorer needs.',
        choices: [
          {
            id: 'trade',
            text: 'Show me your stock.',
            actions: [
              { type: 'open-merchant', merchantId: 'merchant.camp-supplies' },
            ],
          },
          {
            id: 'pack',
            text: 'Can you reinforce my pack?',
            condition: { type: 'has-currency', currencyId: 'copper', amount: 100 },
            disabledReason: 'Requires 100 copper',
            actions: [
              { type: 'remove-currency', currencyId: 'copper', amount: 100 },
              { type: 'expand-inventory', amount: 8 },
              {
                type: 'show-notification',
                text: 'Equipment bag expanded by 8 slots.',
                tone: 'success',
              },
            ],
          },
          { id: 'leave', text: 'Maybe later.' },
        ],
      },
    ],
  },
  {
    id: 'dialogue.ferry-captain',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.ferry-captain',
        text: 'The ferry runs once the forest route is secure.',
        choices: [
          {
            id: 'travel',
            text: 'Take me across.',
            condition: {
              type: 'world-flag',
              flagId: 'forest-route-unlocked',
              value: true,
            },
            disabledReason: 'Secure the forest route first',
            actions: [
              { type: 'travel', destinationId: 'destination.forest-shore' },
            ],
          },
          { id: 'leave', text: 'I will return later.' },
        ],
      },
    ],
  },
  {
    id: 'dialogue.village-elder',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.village-elder',
        text: 'Astral currents are changing. The old paths are waking again.',
        choices: [
          {
            id: 'ask',
            text: 'What should I do?',
            nextNodeId: 'guidance',
          },
          { id: 'leave', text: 'I will keep watch.' },
        ],
      },
      {
        id: 'guidance',
        speakerId: 'actor.village-elder',
        text: 'Help Mara, earn the camp’s trust, and prepare for the crossing.',
        end: true,
      },
    ],
  },
  {
    id: 'dialogue.blacksmith',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.blacksmith',
        text: 'Bring me good materials and I will make something worth carrying.',
        choices: [
          {
            id: 'trade',
            text: 'Show me your weapons.',
            actions: [
              { type: 'open-merchant', merchantId: 'merchant.blacksmith' },
            ],
          },
          {
            id: 'pelts',
            text: 'I have wolf pelts.',
            condition: { type: 'has-material', materialId: 'wolf-pelt', amount: 4 },
            disabledReason: 'Requires 4 Wolf Pelts',
            actions: [
              { type: 'remove-material', materialId: 'wolf-pelt', amount: 4 },
              { type: 'give-currency', currencyId: 'copper', amount: 30 },
              {
                type: 'show-notification',
                text: 'Orin purchased 4 Wolf Pelts for 30 copper.',
                tone: 'success',
              },
            ],
          },
          { id: 'leave', text: 'Another time.' },
        ],
      },
    ],
  },
];
