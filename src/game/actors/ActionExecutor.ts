import type { ActionContext, ActionDefinition } from './ActionTypes';

export class ActionExecutor {
  constructor(private readonly context: ActionContext) {}

  execute(action: ActionDefinition): boolean {
    switch (action.type) {
      case 'show-notification':
        this.context.notify(action.text, action.tone);
        return true;
      case 'set-world-flag':
        this.context.setWorldFlag(action.flagId, action.value);
        return true;
      case 'increment-world-counter':
        this.context.incrementWorldCounter(
          action.counterId,
          action.amount ?? 1,
        );
        return true;
      case 'give-currency':
        this.context.giveCurrency(action.currencyId, action.amount);
        return true;
      case 'remove-currency':
        return this.context.removeCurrency(action.currencyId, action.amount);
      case 'give-material':
        this.context.giveMaterial(action.materialId, action.amount);
        return true;
      case 'remove-material':
        return this.context.removeMaterial(action.materialId, action.amount);
      case 'expand-inventory':
        this.context.expandInventory(action.amount);
        return true;
      case 'start-dialogue':
        this.context.startDialogue(action.dialogueId);
        return true;
      case 'open-merchant':
        this.context.openMerchant(action.merchantId);
        return true;
      case 'start-quest':
        this.context.startQuest(action.questId);
        return true;
      case 'complete-quest':
        return this.context.completeQuest(action.questId);
      case 'abandon-quest':
        return this.context.abandonQuest(action.questId);
      case 'advance-quest':
        this.context.advanceQuest(
          action.questId,
          action.objectiveId,
          action.amount,
        );
        return true;
      case 'travel':
      case 'travel-to-destination':
        return this.context.travelToDestination(action.destinationId);
      case 'set-actor-state':
        this.context.setActorState(action.actorId, action.state);
        return true;
    }
  }

  executeAll(actions: readonly ActionDefinition[] = []): boolean {
    return actions.every(action => this.execute(action));
  }
}
