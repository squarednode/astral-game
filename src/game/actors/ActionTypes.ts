export type ActionDefinition =
  | { type: 'show-notification'; text: string; tone?: string }
  | { type: 'set-world-flag'; flagId: string; value: boolean }
  | { type: 'increment-world-counter'; counterId: string; amount?: number }
  | { type: 'give-currency'; currencyId: 'copper'; amount: number }
  | { type: 'remove-currency'; currencyId: 'copper'; amount: number }
  | { type: 'give-material'; materialId: string; amount: number }
  | { type: 'remove-material'; materialId: string; amount: number }
  | { type: 'expand-inventory'; amount: number }
  | { type: 'start-dialogue'; dialogueId: string }
  | { type: 'open-merchant'; merchantId: string }
  | { type: 'start-quest'; questId: string }
  | { type: 'complete-quest'; questId: string }
  | { type: 'abandon-quest'; questId: string }
  | { type: 'advance-quest'; questId: string; objectiveId?: string; amount?: number }
  | { type: 'travel'; destinationId: string }
  | { type: 'travel-to-destination'; destinationId: string }
  | { type: 'set-actor-state'; actorId: string; state: string };

export interface ActionContext {
  notify(text: string, tone?: string): void;
  setWorldFlag(id: string, value: boolean): void;
  incrementWorldCounter(id: string, amount: number): void;
  giveCurrency(id: 'copper', amount: number): void;
  removeCurrency(id: 'copper', amount: number): boolean;
  giveMaterial(id: string, amount: number): void;
  removeMaterial(id: string, amount: number): boolean;
  expandInventory(amount: number): void;
  startDialogue(id: string): void;
  openMerchant(id: string): void;
  startQuest(id: string): void;
  completeQuest(id: string): boolean;
  abandonQuest(id: string): boolean;
  advanceQuest(id: string, objectiveId?: string, amount?: number): void;
  travelToDestination(destinationId: string): boolean;
  setActorState(actorId: string, state: string): void;
}
