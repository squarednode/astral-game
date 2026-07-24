import type { GeneratedItemInstance } from '../loot';
import type { ActionExecutor } from './ActionExecutor';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type { ConditionResult } from './ConditionTypes';
import type { MerchantDefinition } from './ActorComponentTypes';

export interface MerchantRuntimeSerializedState {
  activeId: string | null;
  buyback: BuybackEntry[];
  servicePurchases: Record<string, number>;
}

export interface BuybackEntry {
  item: GeneratedItemInstance;
  price: number;
}

export class MerchantRuntime {
  private readonly definitions = new Map<string, MerchantDefinition>();
  private activeId: string | null = null;
  private readonly buyback: BuybackEntry[] = [];
  private readonly servicePurchases = new Map<string, number>();

  constructor(
    definitions: readonly MerchantDefinition[],
    private readonly conditions: ConditionEvaluator,
    private readonly actions: ActionExecutor,
  ) {
    definitions.forEach(definition => this.definitions.set(definition.id, definition));
  }

  open(id: string): boolean {
    if (!this.definitions.has(id)) return false;
    this.activeId = id;
    return true;
  }

  close(): void { this.activeId = null; }
  active(): MerchantDefinition | null { return this.activeId ? this.definitions.get(this.activeId) ?? null : null; }
  buybackEntries(): readonly BuybackEntry[] { return this.buyback; }
  serialize(): MerchantRuntimeSerializedState {
    return { activeId: this.activeId, buyback: this.buyback.map(entry => ({ ...entry })), servicePurchases: Object.fromEntries(this.servicePurchases) };
  }

  deserialize(state: MerchantRuntimeSerializedState): void {
    this.activeId = state.activeId && this.definitions.has(state.activeId)
      ? state.activeId
      : null;
    this.buyback.splice(0, this.buyback.length, ...(state.buyback ?? []).slice(0, 20));
    this.servicePurchases.clear();
    for (const [id, count] of Object.entries(state.servicePurchases ?? {})) this.servicePurchases.set(id, Math.max(0, Math.floor(count)));
  }


  serviceAvailability(entryId: string): ConditionResult {
    const entry = this.active()?.entries.find(candidate => candidate.id === entryId);
    if (!entry) return { passed: false, reason: 'Service is unavailable' };
    if (entry.stock !== undefined && (this.servicePurchases.get(entry.id) ?? 0) >= entry.stock) {
      return { passed: false, reason: 'Sold out' };
    }
    return this.conditions.evaluate(entry.condition);
  }

  buyService(entryId: string): boolean {
    const entry = this.active()?.entries.find(candidate => candidate.id === entryId);
    if (!entry || !this.serviceAvailability(entryId).passed) return false;
    const purchased = this.actions.executeAll(entry.purchaseActions);
    if (purchased) this.servicePurchases.set(entry.id, (this.servicePurchases.get(entry.id) ?? 0) + 1);
    return purchased;
  }

  sell(item: GeneratedItemInstance): number {
    const merchant = this.active();
    if (!merchant) return 0;
    const price = Math.max(1, Math.floor(item.power * merchant.buybackRate));
    this.actions.execute({ type: 'give-currency', currencyId: 'copper', amount: price });
    this.buyback.unshift({ item, price: Math.max(price + 1, Math.ceil(price / merchant.buybackRate)) });
    if (this.buyback.length > 20) this.buyback.length = 20;
    return price;
  }

  repurchase(index: number, acceptItem: (item: GeneratedItemInstance) => boolean): boolean {
    const entry = this.buyback[index];
    if (!entry) return false;
    const paid = this.actions.execute({ type: 'remove-currency', currencyId: 'copper', amount: entry.price });
    if (!paid) return false;
    if (!acceptItem(entry.item)) {
      this.actions.execute({ type: 'give-currency', currencyId: 'copper', amount: entry.price });
      return false;
    }
    this.buyback.splice(index, 1);
    return true;
  }
}
