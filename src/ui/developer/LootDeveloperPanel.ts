import type {
  GeneratedItemInstance,
  InventorySnapshot,
  ItemRarity,
} from '../../game/loot';
import { LootRegistry } from '../../game/loot';

export interface LootDeveloperPanelOptions {
  inventory(): readonly GeneratedItemInstance[];
  snapshot(): InventorySnapshot;
  groundLootCount(): number;
  generate(tableId: string, rarity?: ItemRarity): void;
  clearUnequipped(): void;
  setMinimumVisibleRarity(rarity: ItemRarity): void;
  setAutoPickupMaximum(rarity: ItemRarity | 'none'): void;
  upgradeCapacity(): void;
}

export class LootDeveloperPanel {
  private selectedTableId = 'loot.standard-enemy';

  constructor(
    private readonly host: HTMLElement,
    private readonly registry: LootRegistry,
    private readonly options: LootDeveloperPanelOptions,
  ) {
    this.host.addEventListener('click', this.onClick);
    this.host.addEventListener('change', this.onChange);
    this.render();
  }

  render(): void {
    const inventory = this.options.inventory();
    const snapshot = this.options.snapshot();
    const rarityCounts: Record<ItemRarity, number> = {
      common: 0,
      magic: 0,
      rare: 0,
      legendary: 0,
    };
    for (const item of inventory) rarityCounts[item.rarity] += 1;

    this.host.innerHTML = `
      <section class="loot-dev-panel">
        <header>
          <div>
            <strong>LOOT & EQUIPMENT</strong>
            <small>Ground drops, wallet, filters, and inventory telemetry</small>
          </div>
        </header>

        <div class="loot-dev-summary">
          <span>Items <b>${this.registry.allItems().length}</b></span>
          <span>Affixes <b>${this.registry.allAffixes().length}</b></span>
          <span>Tables <b>${this.registry.allTables().length}</b></span>
          <span>Inventory <b>${snapshot.used}/${snapshot.capacity}</b></span>
          <span>Ground <b>${this.options.groundLootCount()}</b></span>
          <span>Copper <b>${snapshot.copper}</b></span>
        </div>

        <label>
          Loot table
          <select data-action="table">
            ${this.registry
              .allTables()
              .map(
                table =>
                  `<option value="${table.id}" ${table.id === this.selectedTableId ? 'selected' : ''}>${table.id}</option>`,
              )
              .join('')}
          </select>
        </label>

        <label>
          Minimum visible rarity
          <select data-action="minimum-visible">
            ${this.rarityOptions(snapshot.filters.minimumVisibleRarity)}
          </select>
        </label>

        <label>
          Auto-pickup equipment through
          <select data-action="auto-pickup">
            <option value="none" ${snapshot.filters.autoPickupMaximumRarity === 'none' ? 'selected' : ''}>None</option>
            ${this.rarityOptions(
              snapshot.filters.autoPickupMaximumRarity === 'none'
                ? 'common'
                : snapshot.filters.autoPickupMaximumRarity,
            )}
          </select>
        </label>

        <div class="loot-dev-actions">
          <button data-action="generate">Drop Roll</button>
          <button data-action="generate-magic">Drop Magic</button>
          <button data-action="generate-rare">Drop Rare</button>
          <button data-action="generate-legendary">Drop Legendary</button>
          <button data-action="capacity">Upgrade Capacity +8</button>
          <button data-action="clear">Clear Unequipped</button>
        </div>

        <pre class="developer-hud-data">RARITIES
Common      ${rarityCounts.common}
Magic       ${rarityCounts.magic}
Rare        ${rarityCounts.rare}
Legendary   ${rarityCounts.legendary}

MATERIALS
${Object.entries(snapshot.materials)
  .map(([id, amount]) => `${id.padEnd(16)} ${amount}`)
  .join('\n') || 'None'}

RECENT INVENTORY
${inventory
  .slice(0, 10)
  .map(
    item =>
      `${item.rarity.padEnd(10)} L${String(item.itemLevel).padEnd(3)} ${item.name} [${item.slot}]`,
  )
  .join('\n') || 'No collected items.'}</pre>
      </section>
    `;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('change', this.onChange);
  }

  private rarityOptions(selected: ItemRarity): string {
    return (['common', 'magic', 'rare', 'legendary'] as const)
      .map(
        rarity =>
          `<option value="${rarity}" ${rarity === selected ? 'selected' : ''}>${rarity}</option>`,
      )
      .join('');
  }

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    switch (target.dataset.action) {
      case 'table':
        this.selectedTableId = target.value;
        break;
      case 'minimum-visible':
        this.options.setMinimumVisibleRarity(target.value as ItemRarity);
        break;
      case 'auto-pickup':
        this.options.setAutoPickupMaximum(
          target.value as ItemRarity | 'none',
        );
        break;
    }
    this.render();
  };

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button) return;

    switch (button.dataset.action) {
      case 'generate':
        this.options.generate(this.selectedTableId);
        break;
      case 'generate-magic':
        this.options.generate(this.selectedTableId, 'magic');
        break;
      case 'generate-rare':
        this.options.generate(this.selectedTableId, 'rare');
        break;
      case 'generate-legendary':
        this.options.generate(this.selectedTableId, 'legendary');
        break;
      case 'capacity':
        this.options.upgradeCapacity();
        break;
      case 'clear':
        this.options.clearUnequipped();
        break;
    }

    this.render();
  };
}
