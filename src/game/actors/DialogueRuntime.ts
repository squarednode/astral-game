import type { ActionExecutor } from './ActionExecutor';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type {
  DialogueChoiceView,
  DialogueDefinition,
  DialogueNodeDefinition,
  DialogueSnapshot,
} from './DialogueTypes';

export class DialogueRuntime {
  private readonly definitions = new Map<string, DialogueDefinition>();
  private currentDefinition: DialogueDefinition | null = null;
  private currentNode: DialogueNodeDefinition | null = null;

  constructor(
    private readonly conditions: ConditionEvaluator,
    private readonly actions: ActionExecutor,
  ) {}

  register(definition: DialogueDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  registerMany(definitions: readonly DialogueDefinition[]): void {
    definitions.forEach(definition => this.register(definition));
  }

  start(dialogueId: string): boolean {
    const definition = this.definitions.get(dialogueId);
    if (!definition) return false;
    this.currentDefinition = definition;
    return this.enterNode(definition.startNodeId);
  }

  choose(choiceId: string): boolean {
    const choice = this.currentNode?.choices?.find(
      candidate => candidate.id === choiceId,
    );
    if (!choice) return false;

    const condition = this.conditions.evaluate(choice.condition);
    if (!condition.passed) return false;
    if (!this.actions.executeAll(choice.actions)) return false;

    if (choice.nextNodeId) return this.enterNode(choice.nextNodeId);
    this.close();
    return true;
  }

  continue(): boolean {
    if (!this.currentNode) return false;
    if (this.currentNode.nextNodeId) {
      return this.enterNode(this.currentNode.nextNodeId);
    }
    if (this.currentNode.end || !this.currentNode.choices?.length) {
      this.close();
      return true;
    }
    return false;
  }

  close(): void {
    this.currentDefinition = null;
    this.currentNode = null;
  }

  snapshot(): DialogueSnapshot {
    const choices: DialogueChoiceView[] =
      this.currentNode?.choices?.map(choice => {
        const result = this.conditions.evaluate(choice.condition);
        return {
          id: choice.id,
          text: choice.text,
          enabled: result.passed,
          disabledReason:
            result.passed
              ? undefined
              : choice.disabledReason ?? result.reason,
        };
      }) ?? [];

    return {
      dialogueId: this.currentDefinition?.id ?? null,
      nodeId: this.currentNode?.id ?? null,
      speakerId: this.currentNode?.speakerId ?? null,
      text: this.currentNode?.text ?? '',
      choices,
      active: Boolean(this.currentNode),
    };
  }

  private enterNode(nodeId: string): boolean {
    const node = this.currentDefinition?.nodes.find(
      candidate => candidate.id === nodeId,
    );
    if (!node) return false;
    if (!this.conditions.evaluate(node.condition).passed) return false;
    this.currentNode = node;
    this.actions.executeAll(node.actionsOnEnter);
    return true;
  }
}
