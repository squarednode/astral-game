import type {
  ActorDefinition,
  ActorVisualProfile,
  InteractionProfile,
} from './ActorTypes';
import type { DialogueDefinition } from './DialogueTypes';

export class ActorRegistry {
  private readonly actors = new Map<string, ActorDefinition>();
  private readonly visuals = new Map<string, ActorVisualProfile>();
  private readonly interactions = new Map<string, InteractionProfile>();
  private readonly dialogues = new Map<string, DialogueDefinition>();

  registerActor(definition: ActorDefinition): void {
    this.actors.set(definition.id, definition);
  }

  registerVisual(definition: ActorVisualProfile): void {
    this.visuals.set(definition.id, definition);
  }

  registerInteraction(definition: InteractionProfile): void {
    this.interactions.set(definition.id, definition);
  }

  registerDialogue(definition: DialogueDefinition): void {
    this.dialogues.set(definition.id, definition);
  }

  actor(id: string): ActorDefinition | undefined {
    return this.actors.get(id);
  }

  visual(id: string): ActorVisualProfile | undefined {
    return this.visuals.get(id);
  }

  interaction(id: string): InteractionProfile | undefined {
    return this.interactions.get(id);
  }

  dialogue(id: string): DialogueDefinition | undefined {
    return this.dialogues.get(id);
  }

  allActors(): readonly ActorDefinition[] {
    return [...this.actors.values()];
  }

  allDialogues(): readonly DialogueDefinition[] {
    return [...this.dialogues.values()];
  }
}
