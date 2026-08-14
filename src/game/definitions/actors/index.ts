export * from './ActorDefinitions';
import { actorDialogueDefinitions as baseActorDialogueDefinitions } from './DialogueDefinitions';
import { roadGuideDialogueDefinition } from './RoadGuideDialogue';
export const actorDialogueDefinitions = [
  ...baseActorDialogueDefinitions,
  roadGuideDialogueDefinition,
] as const;
export * from './WorldInteractionDefinitions';
export * from './EngineAlphaDefinitions';
