import type {
  GeneratedItemInstance,
  ItemRarity,
} from '../../game/loot';
import { LootGenerator, LootRegistry } from '../../game/loot';

export interface LootDeveloperPanelOptions {
  inventory(): readonly GeneratedItemInstance[];
  generate(tableId: string, rarity?: ItemRarity): void;
  clearUnequipped(): void;
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
            <small>Definitions, generation, and inventory telemetry</small>
          </div>
        </header>

        <div class="loot-dev-summary">
          <span>Items <b>${this.registry.allItems().length}</b></span>
          <span>Affixes <b>${this.registry.allAffixes().length}</b></span>
          <span>Tables <b>${this.registry.allTables().length}</b></span>
          <span>Inventory <b>${inventory.length}</b></span>
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

        <div class="loot-dev-actions">
          <button data-action="generate">Generate Roll</button>
          <button data-action="generate-magic">Magic</button>
          <button data-action="generate-rare">Rare</button>
          <button data-action="generate-legendary">Legendary</button>
          <button data-action="clear">Clear Unequipped</button>
        </div>

        <pre class="developer-hud-data">RARITIES
Common      ${rarityCounts.common}
Magic       ${rarityCounts.magic}
Rare        ${rarityCounts.rare}
Legendary   ${rarityCounts.legendary}

RECENT
${inventory
  .slice(0, 10)
  .map(
    item =>
      `${item.rarity.padEnd(10)} L${String(item.itemLevel).padEnd(3)} ${item.name} [${item.slot}]`,
  )
  .join('\n') || 'No generated items.'}</pre>
      </section>
    `;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('change', this.onChange);
  }

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    if (target.dataset.action === 'table') {
      this.selectedTableId = target.value;
    }
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
      case 'clear':
        this.options.clearUnequipped();
        break;
    }

    this.render();
  };
}
