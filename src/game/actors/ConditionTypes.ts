export type ConditionDefinition =
  | { type: 'always' }
  | { type: 'world-flag'; flagId: string; value?: boolean }
  | { type: 'world-counter-at-least'; counterId: string; amount: number }
  | { type: 'has-currency'; currencyId: 'copper'; amount: number }
  | { type: 'has-material'; materialId: string; amount: number }
  | { type: 'inventory-space'; amount?: number }
  | { type: 'actor-state'; actorId: string; state: string }
  | { type: 'all'; conditions: readonly ConditionDefinition[] }
  | { type: 'any'; conditions: readonly ConditionDefinition[] }
  | { type: 'not'; condition: ConditionDefinition };

export interface ConditionResult {
  passed: boolean;
  reason?: string;
}

export interface ConditionContext {
  getWorldFlag(id: string): boolean;
  getWorldCounter(id: string): number;
  getCurrency(id: 'copper'): number;
  getMaterial(id: string): number;
  hasInventorySpace(amount: number): boolean;
  getActorState(id: string): string | undefined;
}
