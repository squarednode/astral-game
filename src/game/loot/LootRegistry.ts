import type {
  ItemAffixDefinition,
  ItemBaseDefinition,
  LegendaryPowerDefinition,
  LootTableDefinition,
} from './LootTypes';

export class LootRegistry {
  private readonly items = new Map<string, Readonly<ItemBaseDefinition>>();
  private readonly affixes = new Map<string, Readonly<ItemAffixDefinition>>();
  private readonly powers = new Map<string, Readonly<LegendaryPowerDefinition>>();
  private readonly tables = new Map<string, Readonly<LootTableDefinition>>();

  registerItem(definition: ItemBaseDefinition): void {
    this.assertUnique(this.items, definition.id, 'item');
    this.items.set(definition.id, Object.freeze(definition));
  }

  registerAffix(definition: ItemAffixDefinition): void {
    this.assertUnique(this.affixes, definition.id, 'affix');
    this.affixes.set(definition.id, Object.freeze(definition));
  }

  registerLegendaryPower(definition: LegendaryPowerDefinition): void {
    this.assertUnique(this.powers, definition.id, 'legendary power');
    this.powers.set(definition.id, Object.freeze(definition));
  }

  registerLootTable(definition: LootTableDefinition): void {
    this.assertUnique(this.tables, definition.id, 'loot table');
    this.tables.set(definition.id, Object.freeze(definition));
  }

  getItem(id: string): Readonly<ItemBaseDefinition> | undefined {
    return this.items.get(id);
  }

  getAffix(id: string): Readonly<ItemAffixDefinition> | undefined {
    return this.affixes.get(id);
  }

  getLegendaryPower(id: string): Readonly<LegendaryPowerDefinition> | undefined {
    return this.powers.get(id);
  }

  getLootTable(id: string): Readonly<LootTableDefinition> | undefined {
    return this.tables.get(id);
  }

  allItems(): readonly Readonly<ItemBaseDefinition>[] {
    return [...this.items.values()];
  }

  allAffixes(): readonly Readonly<ItemAffixDefinition>[] {
    return [...this.affixes.values()];
  }

  allTables(): readonly Readonly<LootTableDefinition>[] {
    return [...this.tables.values()];
  }

  private assertUnique<T>(
    map: Map<string, T>,
    id: string,
    kind: string,
  ): void {
    if (map.has(id)) {
      throw new Error(`Duplicate ${kind} definition: ${id}`);
    }
  }
}
