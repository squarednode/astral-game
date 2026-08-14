import type { DialogueDefinition } from '../../actors';

export const actorDialogueDefinitions: readonly DialogueDefinition[] = [
  {
    id: 'dialogue.hunter.offer',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        speakerId: 'actor.hunter-mara',
        text: 'The wolves are pushing closer to town. Their mother is driving the pack deeper into the forest.',
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
        text: 'Find and defeat the Mother Wolf, and bring me four good pelts from the pack. Her fall should expose the path to the keeper controlling them.',
        nextNodeId: 'start',
      },
      {
        id: 'accepted',
        speakerId: 'actor.hunter-mara',
        text: 'Start with the Mother Wolf and gather four pelts from the pack. Once she falls, the keeper’s route should open. Defeat him and return to me.',
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
        text: 'The hunt is still active. Bring me four wolf pelts, defeat the Mother Wolf, then follow the opened route to the Wolf Keeper.',
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
        text: 'The Mother Wolf and her keeper are both gone, and you brought the four pelts I asked for. You finished what I could not do alone.',
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
        text: 'Then I am coming with you. The forest route is secure, and you have earned another hunter at your side.',
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
        text: 'The forest route is secure. I am ready for whatever comes next.',
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
