import { BUILD_VERSION, CURRENT_SAVE_SCHEMA, SAVE_STORAGE_PREFIX } from '../version';
import type { AstralSaveData, SaveSlotId, SaveSummary } from './SaveTypes';

const SLOT_IDS: readonly SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3'];
const LEGACY_STORAGE_PREFIXES = ['astral-shift.save.0.6.7.6.'] as const;
type SaveMigration = (save: Record<string, unknown>) => Record<string, unknown>;

const migrations: Readonly<Record<number, SaveMigration>> = {
  1: save => ({
    ...save,
    schemaVersion: 2,
    buildVersion: typeof save.buildVersion === 'string' ? save.buildVersion : BUILD_VERSION,
  }),
};

export class SaveRuntime {
  slots(): readonly SaveSlotId[] { return SLOT_IDS; }

  has(slotId: SaveSlotId): boolean { return this.rawFor(slotId) !== null; }

  mostRecentSlot(): SaveSlotId | null {
    return this.summaries().sort((a, b) => b.savedAt - a.savedAt)[0]?.slotId ?? null;
  }

  save(slotId: SaveSlotId, data: AstralSaveData): void {
    localStorage.setItem(this.key(slotId), JSON.stringify({
      ...data,
      schemaVersion: CURRENT_SAVE_SCHEMA,
      buildVersion: BUILD_VERSION,
      summary: { ...data.summary, buildVersion: BUILD_VERSION },
    }));
  }

  load(slotId: SaveSlotId): AstralSaveData | null {
    const found = this.rawFor(slotId);
    if (!found) return null;
    const { raw, legacyKey } = found;
    try {
      const decoded = JSON.parse(raw) as unknown;
      const parsed = this.migrate(decoded);
      if (!parsed || !parsed.engineSnapshot || !parsed.summary) return null;
      if (legacyKey) {
        localStorage.setItem(this.key(slotId), JSON.stringify(parsed));
        localStorage.removeItem(legacyKey);
      }
      return parsed;
    } catch {
      return null;
    }
  }

  delete(slotId: SaveSlotId): void {
    localStorage.removeItem(this.key(slotId));
    for (const prefix of LEGACY_STORAGE_PREFIXES) localStorage.removeItem(`${prefix}${slotId}`);
  }

  summaries(): SaveSummary[] {
    return SLOT_IDS.flatMap(slotId => {
      const data = this.load(slotId);
      return data ? [{ slotId, ...data.summary }] : [];
    });
  }

  private migrate(value: unknown): AstralSaveData | null {
    if (!value || typeof value !== 'object') return null;
    let save = value as Record<string, unknown>;
    let schema = Number(save.schemaVersion);
    if (!Number.isInteger(schema) || schema < 1 || schema > CURRENT_SAVE_SCHEMA) return null;
    while (schema < CURRENT_SAVE_SCHEMA) {
      const migration = migrations[schema];
      if (!migration) return null;
      save = migration(save);
      schema = Number(save.schemaVersion);
    }
    return save as unknown as AstralSaveData;
  }

  private rawFor(slotId: SaveSlotId): { raw: string; legacyKey: string | null } | null {
    const current = localStorage.getItem(this.key(slotId));
    if (current !== null) return { raw: current, legacyKey: null };
    for (const prefix of LEGACY_STORAGE_PREFIXES) {
      const legacyKey = `${prefix}${slotId}`;
      const raw = localStorage.getItem(legacyKey);
      if (raw !== null) return { raw, legacyKey };
    }
    return null;
  }

  private key(slotId: SaveSlotId): string { return `${SAVE_STORAGE_PREFIX}${slotId}`; }
}
