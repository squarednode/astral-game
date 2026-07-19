import type { DialogueDefinition } from '../../actors';

export const actorDialogueDefinitions: readonly DialogueDefinition[] = [
  {
    id: 'dialogue.hunter.offer',
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
            ],
            nextNodeId: 'accepted',
          },
          { id: 'leave', text: 'Not right now.' },
        ],
      },
      {
        id: 'details',
        speakerId: 'actor.hunter-mara',
        text: 'Cull the pack, recover four pelts, and defeat the creature driving them from the forest.',
        nextNodeId: 'start',
      },
      {
        id: 'accepted',
        speakerId: 'actor.hunter-mara',
        text: 'Good. Your hunt begins now. Bring me four pelts when the keeper is dealt with.',
        end: true,
      },
    ],
  },
  {
    id: 'dialogue.hunter.progress',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.hunter-mara',
        text: 'The hunt is still active. Keep pressure on the pack and watch for their keeper.',
        choices: [
          { id: 'leave', text: 'I will return when it is done.' },
        ],
      },
    ],
  },
  {
    id: 'dialogue.hunter.ready',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.hunter-mara',
        text: 'You made it back. Hand over the four pelts and I will mark the forest route as secure.',
        choices: [
          {
            id: 'complete',
            text: 'Complete the quest.',
            actions: [
              { type: 'complete-quest', questId: 'quest.wolf-problem' },
            ],
            nextNodeId: 'completed',
          },
          { id: 'leave', text: 'I need another moment.' },
        ],
      },
      {
        id: 'completed',
        speakerId: 'actor.hunter-mara',
        text: 'Well done. The ferry route is open, and the captain can take you onward.',
        end: true,
      },
    ],
  },
  {
    id: 'dialogue.hunter.completed',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.hunter-mara',
        text: 'The forest route remains secure. The captain is ready when you are.',
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
            text: 'Take me to the test area.',
            condition: {
              type: 'world-flag',
              flagId: 'forest-route-unlocked',
              value: true,
            },
            disabledReason: 'Secure the forest route first',
            actions: [
              {
                type: 'travel-to-destination',
                destinationId: 'destination.test-area',
              },
            ],
          },
          { id: 'leave', text: 'I will return later.' },
        ],
      },
    ],
  },
  {
    id: 'dialogue.elder.before-quest',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.village-elder',
        text: 'Astral currents are changing. Speak with Hunter Mara; she needs help securing the forest.',
        choices: [
          { id: 'leave', text: 'I will find her.' },
        ],
      },
    ],
  },
  {
    id: 'dialogue.elder.quest-active',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.village-elder',
        text: 'Mara tells me the hunt has begun. Finish what you started and return safely.',
        end: true,
      },
    ],
  },
  {
    id: 'dialogue.elder.quest-completed',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.village-elder',
        text: 'The village already feels safer. The open route is proof of what you accomplished.',
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
            condition: {
              type: 'has-material',
              materialId: 'wolf-pelt',
              amount: 4,
            },
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
