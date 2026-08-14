import type { DialogueDefinition } from '../../actors';

export const roadGuideDialogueDefinition: DialogueDefinition = {
  id: 'dialogue.road-guide',
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speakerId: 'actor.road-guide',
      text: 'Take the road on the right to town. Danger awaits ahead.',
      end: true,
    },
  ],
};
