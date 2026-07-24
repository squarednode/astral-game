import type { AstralSaveData, SaveSlotId, SaveSummary } from './SaveTypes';

const SLOT_IDS: readonly SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3'];

export class SaveRuntime {
  private readonly prefix = 'astral-shift.save.0.6.7.6.';

  slots(): readonly SaveSlotId[] { return SLOT_IDS; }

  has(slotId: SaveSlotId): boolean { return localStorage.getItem(this.key(slotId)) !== null; }

  mostRecentSlot(): SaveSlotId | null {
    return this.summaries().sort((a, b) => b.savedAt - a.savedAt)[0]?.slotId ?? null;
  }

  save(slotId: SaveSlotId, data: AstralSaveData): void {
    localStorage.setItem(this.key(slotId), JSON.stringify(data));
  }

  load(slotId: SaveSlotId): AstralSaveData | null {
    const raw = localStorage.getItem(this.key(slotId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<AstralSaveData>;
      if (parsed.schemaVersion !== 1 || !parsed.engineSnapshot || !parsed.summary) return null;
      return parsed as AstralSaveData;
    } catch {
      return null;
    }
  }

  delete(slotId: SaveSlotId): void { localStorage.removeItem(this.key(slotId)); }

  summaries(): SaveSummary[] {
    return SLOT_IDS.flatMap(slotId => {
      const data = this.load(slotId);
      return data ? [{ slotId, ...data.summary }] : [];
    });
  }

  private key(slotId: SaveSlotId): string { return `${this.prefix}${slotId}`; }
}
