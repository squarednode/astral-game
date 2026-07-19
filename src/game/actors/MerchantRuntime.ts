import type { GeneratedItemInstance } from '../loot';
import type { ActionExecutor } from './ActionExecutor';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type { MerchantDefinition } from './ActorComponentTypes';

export interface BuybackEntry {
  item: GeneratedItemInstance;
  price: number;
}

export class MerchantRuntime {
  private readonly definitions = new Map<string, MerchantDefinition>();
  private activeId: string | null = null;
  private readonly buyback: BuybackEntry[] = [];

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

  buyService(entryId: string): boolean {
    const entry = this.active()?.entries.find(candidate => candidate.id === entryId);
    if (!entry || !this.conditions.evaluate(entry.condition).passed) return false;
    return this.actions.executeAll(entry.purchaseActions);
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

  repurchase(index: number): BuybackEntry | null {
    const entry = this.buyback[index];
    if (!entry) return null;
    const paid = this.actions.execute({ type: 'remove-currency', currencyId: 'copper', amount: entry.price });
    if (!paid) return null;
    this.buyback.splice(index, 1);
    return entry;
  }
}
