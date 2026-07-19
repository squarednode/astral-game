import type { GeneratedItemInstance, ItemRarity } from './LootTypes';

export interface InventoryFilterSettings {
  minimumVisibleRarity: ItemRarity;
  autoPickupMaximumRarity: ItemRarity | 'none';
  hideUnusableEquipment: boolean;
  alwaysShowUpgrades: boolean;
}

export interface InventorySnapshot {
  capacity: number;
  used: number;
  available: number;
  copper: number;
  materials: Readonly<Record<string, number>>;
  filters: Readonly<InventoryFilterSettings>;
}

const RARITY_ORDER: Readonly<Record<ItemRarity, number>> = {
  common: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
};

export class InventoryRuntime {
  private capacity = 24;
  private copper = 0;
  private readonly materials = new Map<string, number>();
  private filters: InventoryFilterSettings = {
    minimumVisibleRarity: 'common',
    autoPickupMaximumRarity: 'none',
    hideUnusableEquipment: false,
    alwaysShowUpgrades: true,
  };

  getCapacity(): number {
    return this.capacity;
  }

  setCapacity(value: number): void {
    this.capacity = Math.max(1, Math.floor(value));
  }

  upgradeCapacity(amount = 8, maximum = 48): number {
    this.capacity = Math.min(maximum, this.capacity + Math.max(1, Math.floor(amount)));
    return this.capacity;
  }

  canStore(items: readonly GeneratedItemInstance[], incoming = 1): boolean {
    return items.length + incoming <= this.capacity;
  }

  addCopper(amount: number): number {
    this.copper += Math.max(0, Math.floor(amount));
    return this.copper;
  }

  spendCopper(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (this.copper < cost) return false;
    this.copper -= cost;
    return true;
  }

  addMaterial(materialId: string, amount: number): number {
    const next =
      (this.materials.get(materialId) ?? 0) +
      Math.max(0, Math.floor(amount));
    this.materials.set(materialId, next);
    return next;
  }

  removeMaterial(materialId: string, amount: number): boolean {
    const requested = Math.max(0, Math.floor(amount));
    const current = this.materials.get(materialId) ?? 0;
    if (current < requested) return false;
    const next = current - requested;
    if (next > 0) this.materials.set(materialId, next);
    else this.materials.delete(materialId);
    return true;
  }

  getCopper(): number {
    return this.copper;
  }

  getMaterial(materialId: string): number {
    return this.materials.get(materialId) ?? 0;
  }

  getFilters(): Readonly<InventoryFilterSettings> {
    return this.filters;
  }

  updateFilters(next: Partial<InventoryFilterSettings>): void {
    this.filters = { ...this.filters, ...next };
  }

  shouldShow(item: GeneratedItemInstance, isUpgrade: boolean): boolean {
    if (item.rarity === 'legendary') return true;
    if (isUpgrade && this.filters.alwaysShowUpgrades) return true;
    return RARITY_ORDER[item.rarity] >= RARITY_ORDER[this.filters.minimumVisibleRarity];
  }

  shouldAutoPickup(item: GeneratedItemInstance): boolean {
    if (item.rarity === 'legendary') return false;
    const maximum = this.filters.autoPickupMaximumRarity;
    return maximum !== 'none' &&
      RARITY_ORDER[item.rarity] <= RARITY_ORDER[maximum];
  }

  snapshot(items: readonly GeneratedItemInstance[]): InventorySnapshot {
    return {
      capacity: this.capacity,
      used: items.length,
      available: Math.max(0, this.capacity - items.length),
      copper: this.copper,
      materials: Object.fromEntries(this.materials),
      filters: this.filters,
    };
  }
}
