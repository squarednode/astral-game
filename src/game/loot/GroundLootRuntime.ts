import type {
  GeneratedItemInstance,
  ItemRarity,
} from './LootTypes';
import type {
  GroundLootPayload,
  GroundLootRecord,
} from './GroundLootTypes';

const EQUIPMENT_LIFETIME_MS: Readonly<Record<ItemRarity, number>> = {
  common: 45_000,
  magic: 60_000,
  rare: 90_000,
  legendary: 300_000,
};

export class GroundLootRuntime {
  private nextId = 1;
  private readonly records = new Map<number, GroundLootRecord>();

  spawnEquipment(
    item: GeneratedItemInstance,
    position: { x: number; y: number; z: number },
    visible: boolean,
    now = performance.now(),
  ): GroundLootRecord {
    return this.spawn(
      { kind: 'equipment', item },
      position,
      item.name,
      item.rarity,
      visible,
      item.rarity === 'legendary' ? 30_000 : 5_000,
      Number.POSITIVE_INFINITY,
      1.15,
      now,
    );
  }

  spawnCurrency(
    amount: number,
    position: { x: number; y: number; z: number },
    now = performance.now(),
  ): GroundLootRecord {
    return this.spawn(
      { kind: 'currency', currencyId: 'copper', amount },
      position,
      `${amount} Copper`,
      undefined,
      true,
      0,
      30_000,
      1.8,
      now,
    );
  }

  spawnMaterial(
    materialId: string,
    amount: number,
    position: { x: number; y: number; z: number },
    now = performance.now(),
  ): GroundLootRecord {
    return this.spawn(
      { kind: 'material', materialId, amount },
      position,
      `${amount} ${materialId}`,
      undefined,
      true,
      0,
      45_000,
      1.8,
      now,
    );
  }

  all(): readonly GroundLootRecord[] {
    return [...this.records.values()];
  }

  get(id: number): GroundLootRecord | undefined {
    return this.records.get(id);
  }

  remove(id: number): void {
    this.records.delete(id);
  }

  update(now = performance.now()): number[] {
    const expired: number[] = [];
    for (const [id, record] of this.records) {
      if (record.expiresAt <= now && record.protectedUntil <= now) {
        expired.push(id);
        this.records.delete(id);
      }
    }
    return expired;
  }

  private spawn(
    payload: GroundLootPayload,
    position: { x: number; y: number; z: number },
    label: string,
    rarity: ItemRarity | undefined,
    visible: boolean,
    protectedDurationMs: number,
    lifetimeMs: number,
    pickupRadius: number,
    now: number,
  ): GroundLootRecord {
    const record: GroundLootRecord = {
      id: this.nextId++,
      payload,
      position: { ...position },
      protectedUntil: now + protectedDurationMs,
      expiresAt: now + lifetimeMs,
      visible,
      pickupRadius,
      label,
      rarity,
    };
    this.records.set(record.id, record);
    return record;
  }
}
