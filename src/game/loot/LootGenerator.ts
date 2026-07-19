import type {
  EquipmentEffectModifier,
  EquipmentStatModifier,
  GeneratedItemInstance,
  ItemAffixDefinition,
  ItemRarity,
  LootGenerationContext,
  LootTableDefinition,
} from './LootTypes';
import { LootRegistry } from './LootRegistry';
import { describeEquipmentEffect } from './EquipmentEffectResolver';

const RARITY_AFFIX_COUNTS: Readonly<Record<ItemRarity, number>> = {
  common: 0,
  magic: 1,
  rare: 2,
  legendary: 2,
};

const RARITY_POWER_MULTIPLIERS: Readonly<Record<ItemRarity, number>> = {
  common: 1,
  magic: 1.3,
  rare: 1.65,
  legendary: 2.05,
};

export class LootGenerator {
  private nextInstanceId = 1;

  constructor(private readonly registry: LootRegistry) {}

  generateFromTable(
    tableId: string,
    context: LootGenerationContext,
  ): GeneratedItemInstance[] {
    const table = this.registry.getLootTable(tableId);
    if (!table) {
      throw new Error(`Unknown loot table: ${tableId}`);
    }

    const random = context.random ?? Math.random;
    const items: GeneratedItemInstance[] = [];

    for (let roll = 0; roll < table.rolls; roll++) {
      const entry = this.weightedEntry(table, context.itemLevel, random);
      if (!entry) continue;
      const item = this.generateItem(entry.itemDefinitionId, table, context);
      if (item) items.push(item);
    }

    return items;
  }

  generateItem(
    definitionId: string,
    table: LootTableDefinition,
    context: LootGenerationContext,
  ): GeneratedItemInstance | null {
    const definition = this.registry.getItem(definitionId);
    if (!definition || context.itemLevel < definition.minimumLevel) return null;

    const random = context.random ?? Math.random;
    const rarity =
      context.forcedRarity ??
      table.guaranteedRarity ??
      this.rollRarity(table, random);

    const affixes = this.rollAffixes(
      definition.allowedAffixTags ?? definition.tags,
      context.itemLevel,
      RARITY_AFFIX_COUNTS[rarity],
      random,
    );

    const itemLevelScale = 1 + Math.max(0, context.itemLevel - 1) * 0.12;
    const power = Math.max(
      1,
      Math.round(
        definition.basePower *
          itemLevelScale *
          RARITY_POWER_MULTIPLIERS[rarity],
      ),
    );

    const modifiers: EquipmentStatModifier[] = [
      ...definition.baseModifiers.map(modifier =>
        this.scaleModifier(modifier, itemLevelScale),
      ),
      ...affixes.flatMap(affix =>
        affix.modifiers.map(modifier =>
          this.scaleModifier(modifier, itemLevelScale),
        ),
      ),
      { statId: 'power', mode: 'flat', value: power, sourceId: definition.id },
    ];
    const effects: EquipmentEffectModifier[] = [
      ...(definition.baseEffects ?? []).map(effect => ({
        ...effect,
        sourceId: effect.sourceId ?? definition.id,
      })),
      ...affixes.flatMap(affix =>
        (affix.effects ?? []).map(effect => ({
          ...effect,
          sourceId: effect.sourceId ?? affix.id,
        })),
      ),
    ];

    const legendaryPower =
      rarity === 'legendary' && definition.uniquePowerId
        ? this.registry.getLegendaryPower(definition.uniquePowerId)
        : undefined;

    const displayName = [
      affixes.find(affix => affix.position === 'prefix')?.name,
      definition.name,
      affixes.find(affix => affix.position === 'suffix')?.name,
    ].filter(Boolean).join(' ');

    const compatibility = this.compatibilityFields(modifiers);

    const instanceId = this.nextInstanceId++;

    return {
      id: instanceId,
      instanceId,
      definitionId: definition.id,
      name: displayName,
      rarity,
      itemLevel: context.itemLevel,
      power,
      family: definition.family,
      slot: definition.slot,
      tags: [...definition.tags],
      affixIds: affixes.map(affix => affix.id),
      modifiers,
      effects,
      favorite: false,
      visualProfileId: definition.visualProfileId,
      legendaryPowerId: legendaryPower?.id,
      legendaryPower: legendaryPower?.description,
      effectDescriptions: effects.map(describeEquipmentEffect),
      ...compatibility,
    };
  }

  private weightedEntry(
    table: LootTableDefinition,
    itemLevel: number,
    random: () => number,
  ) {
    const entries = table.entries.filter(
      entry =>
        (entry.minimumLevel ?? 1) <= itemLevel &&
        (entry.maximumLevel ?? Number.POSITIVE_INFINITY) >= itemLevel,
    );
    const total =
      table.noDropWeight +
      entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    let cursor = random() * total;

    if (cursor < table.noDropWeight) return null;
    cursor -= table.noDropWeight;

    for (const entry of entries) {
      cursor -= Math.max(0, entry.weight);
      if (cursor <= 0) return entry;
    }

    return entries.at(-1) ?? null;
  }

  private rollRarity(
    table: LootTableDefinition,
    random: () => number,
  ): ItemRarity {
    const order: ItemRarity[] = ['common', 'magic', 'rare', 'legendary'];
    const total = order.reduce(
      (sum, rarity) => sum + Math.max(0, table.rarityWeights[rarity]),
      0,
    );
    let cursor = random() * total;

    for (const rarity of order) {
      cursor -= Math.max(0, table.rarityWeights[rarity]);
      if (cursor <= 0) return rarity;
    }

    return 'common';
  }

  private rollAffixes(
    tags: readonly string[],
    itemLevel: number,
    count: number,
    random: () => number,
  ): ItemAffixDefinition[] {
    const candidates = this.registry.allAffixes().filter(
      affix =>
        affix.minimumLevel <= itemLevel &&
        affix.tags.some(tag => tags.includes(tag)),
    );
    const selected: ItemAffixDefinition[] = [];

    while (selected.length < count && candidates.length > 0) {
      const available = candidates.filter(
        candidate =>
          !selected.some(existing => existing.position === candidate.position),
      );
      if (available.length === 0) break;

      const total = available.reduce(
        (sum, candidate) => sum + Math.max(0, candidate.weight),
        0,
      );
      let cursor = random() * total;
      let chosen = available[0];

      for (const candidate of available) {
        cursor -= Math.max(0, candidate.weight);
        if (cursor <= 0) {
          chosen = candidate;
          break;
        }
      }

      selected.push(chosen);
    }

    return selected;
  }

  private scaleModifier(
    modifier: EquipmentStatModifier,
    scale: number,
  ): EquipmentStatModifier {
    return {
      ...modifier,
      value:
        modifier.mode === 'percent'
          ? modifier.value
          : Math.round(modifier.value * scale * 100) / 100,
    };
  }

  private compatibilityFields(modifiers: readonly EquipmentStatModifier[]) {
    const flat = (statId: EquipmentStatModifier['statId']) =>
      modifiers
        .filter(modifier => modifier.statId === statId && modifier.mode === 'flat')
        .reduce((sum, modifier) => sum + modifier.value, 0);

    return {
      attackBonus: Math.round(flat('attack')),
      maxHpBonus: Math.round(flat('maximum-health')),
      swapBonus: Math.round(flat('swap-damage')),
      focus: Math.round(flat('focus')),
      precision: Math.round(flat('precision')),
      technique: Math.round(flat('technique')),
      armor: Math.round(flat('armor')),
      movementSpeedPercent: modifiers
        .filter(modifier => modifier.statId === 'movement-speed')
        .reduce((sum, modifier) => sum + modifier.value, 0),
      statusPotencyPercent: modifiers
        .filter(modifier => modifier.statId === 'status-potency')
        .reduce((sum, modifier) => sum + modifier.value, 0),
      statusResistancePercent: modifiers
        .filter(modifier => modifier.statId === 'status-resistance')
        .reduce((sum, modifier) => sum + modifier.value, 0),
    };
  }
}
