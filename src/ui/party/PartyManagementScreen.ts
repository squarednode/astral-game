import type {
  GearFamily,
  GearSlot,
  PartyCharacterView,
  PartyEquipmentItem,
  PartyManagementActions,
  PartyManagementModel,
  SkillId,
  SkillSlot,
} from './PartyManagementTypes';

type Filter = 'all' | GearSlot | GearFamily | 'legendary' | 'recent';
type SortMode = 'recommended' | 'power' | 'rarity' | 'recent';
type CharacterTab = 'equipment' | 'skills' | 'stats';

const RARITY_ORDER = {
  common: 1,
  magic: 2,
  rare: 3,
  legendary: 4,
} as const;

const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  relic: 'Relic',
};

const FAMILY_LABELS: Record<GearFamily, string> = {
  fortified: 'Fortified',
  agile: 'Agile',
  focused: 'Focused',
};

export class PartyManagementScreen {
  private model: PartyManagementModel = { characters: [], items: [] };
  private selectedItemId: number | null = null;
  private selectedCharacterId: string | null = null;
  private selectedIds = new Set<number>();
  private filter: Filter = 'all';
  private sortMode: SortMode = 'recommended';
  private activeTab: CharacterTab = 'equipment';
  private search = '';

  constructor(
    private readonly host: HTMLDivElement,
    private readonly actions: PartyManagementActions,
  ) {
    this.host.classList.add('party-management-host');
    this.host.addEventListener('click', this.onClick);
    this.host.addEventListener('input', this.onInput);
    this.host.addEventListener('change', this.onChange);
  }

  setOpen(open: boolean): void {
    this.host.classList.toggle('hidden', !open);
  }

  isOpen(): boolean {
    return !this.host.classList.contains('hidden');
  }

  render(model: PartyManagementModel): void {
    this.model = model;

    if (!this.selectedCharacterId) {
      this.selectedCharacterId =
        model.characters.find(character => character.controlled)?.id ??
        model.characters[0]?.id ??
        null;
    }

    if (
      this.selectedItemId !== null &&
      !model.items.some(item => item.id === this.selectedItemId)
    ) {
      this.selectedItemId = null;
    }

    this.selectedIds = new Set(
      [...this.selectedIds].filter(id =>
        model.items.some(item => item.id === id),
      ),
    );

    this.draw();
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('input', this.onInput);
    this.host.removeEventListener('change', this.onChange);
  }

  private draw(): void {
    const selectedCharacter = this.getSelectedCharacter();
    const selectedItem = this.model.items.find(
      item => item.id === this.selectedItemId,
    );
    const filteredItems = this.getFilteredItems();
    const partyPower = this.model.characters.reduce(
      (sum, character) => sum + this.characterGearScore(character),
      0,
    );

    this.host.innerHTML = `
      <div class="party-management-shell">
        <header class="pm-header">
          <div>
            <div class="pm-eyebrow">Command Center</div>
            <h1>Party Management</h1>
            <p>Character selection here is independent from the controlled character.</p>
          </div>
          <div class="pm-header-actions">
            <div class="pm-party-power">
              <span>Party Power</span>
              <strong>${partyPower}</strong>
            </div>
            <button class="pm-close" data-action="close" aria-label="Close">×</button>
          </div>
        </header>

        <section class="pm-character-strip">
          ${this.model.characters
            .map(character => this.characterSelector(character))
            .join('')}
        </section>

        <main class="pm-workspace">
          <section class="pm-character-panel">
            ${selectedCharacter
              ? this.characterPanel(selectedCharacter, selectedItem)
              : '<div class="pm-empty-selection">No character available.</div>'}
          </section>

          <section class="pm-inventory">
            ${this.inventoryPanel(filteredItems, selectedCharacter)}
          </section>
        </main>
      </div>
    `;
  }

  private characterSelector(character: PartyCharacterView): string {
    const selected = character.id === this.selectedCharacterId;

    return `
      <button
        class="pm-character-selector ${selected ? 'selected' : ''} ${character.controlled ? 'controlled' : ''}"
        data-action="select-character"
        data-character-id="${character.id}"
      >
        <div class="pm-avatar">${character.name.slice(0, 1)}</div>
        <div>
          <strong>${character.name}</strong>
          <span>${character.role}</span>
          <small>${FAMILY_LABELS[character.preferredFamily]}</small>
        </div>
        <b>${this.characterGearScore(character)}</b>
        ${character.controlled ? '<em>Controlled</em>' : ''}
      </button>
    `;
  }

  private characterPanel(
    character: PartyCharacterView,
    selectedItem?: PartyEquipmentItem,
  ): string {
    return `
      <div class="pm-character-heading">
        <div>
          <div class="pm-eyebrow">Selected Character</div>
          <h2>${character.name}</h2>
          <p>${character.role}</p>
        </div>
        <div class="pm-family ${character.preferredFamily}">
          ${FAMILY_LABELS[character.preferredFamily]}
        </div>
      </div>

      <div class="pm-health">
        <span>Health ${Math.ceil(character.hp)} / ${Math.ceil(character.maxHp)}</span>
        <div>
          <i style="width:${Math.max(0, character.hp / character.maxHp * 100)}%"></i>
        </div>
      </div>

      <nav class="pm-tabs">
        ${this.tabButton('equipment', 'Equipment')}
        ${this.tabButton('skills', 'Skills')}
        ${this.tabButton('stats', 'Statistics')}
      </nav>

      ${this.activeTab === 'equipment'
        ? this.equipmentTab(character, selectedItem)
        : this.activeTab === 'skills'
          ? this.skillsTab(character)
          : this.statsTab(character)}
    `;
  }

  private equipmentTab(
    character: PartyCharacterView,
    selectedItem?: PartyEquipmentItem,
  ): string {
    const comparison = selectedItem
      ? this.compareForCharacter(selectedItem, character)
      : null;

    return `
      <div class="pm-equipped-list">
        ${(['weapon', 'armor', 'relic'] as GearSlot[])
          .map(slot => this.equipmentSlot(character, slot))
          .join('')}
      </div>

      ${selectedItem
        ? `
          <div class="pm-selected-item ${selectedItem.rarity}">
            <div class="pm-selected-heading">
              <div>
                <span>${selectedItem.rarity.toUpperCase()} · ${SLOT_LABELS[selectedItem.slot]}</span>
                <h3>${selectedItem.name}</h3>
                <div class="pm-family ${selectedItem.family}">
                  ${FAMILY_LABELS[selectedItem.family]}
                </div>
              </div>
              <strong>${selectedItem.power}</strong>
            </div>

            <div class="pm-stat-deltas">
              ${this.deltaRow(
                'Attack',
                selectedItem.attackBonus,
                character.equipment[selectedItem.slot]?.attackBonus ?? 0,
              )}
              ${this.deltaRow(
                'Health',
                selectedItem.maxHpBonus,
                character.equipment[selectedItem.slot]?.maxHpBonus ?? 0,
              )}
              ${this.deltaRow(
                'Focus',
                selectedItem.focus,
                character.equipment[selectedItem.slot]?.focus ?? 0,
              )}
              ${this.deltaRow(
                'Precision',
                selectedItem.precision,
                character.equipment[selectedItem.slot]?.precision ?? 0,
              )}
              ${this.deltaRow(
                'Technique',
                selectedItem.technique,
                character.equipment[selectedItem.slot]?.technique ?? 0,
              )}
            </div>

            ${selectedItem.legendaryPower
              ? `<div class="pm-legendary-power">${selectedItem.legendaryPower}</div>`
              : ''}

            <div class="pm-equip-footer ${comparison!.tone}">
              <div>
                <strong>${comparison!.label}</strong>
                <span>${comparison!.delta >= 0 ? '+' : ''}${comparison!.delta} overall</span>
              </div>
              <button
                data-action="equip"
                data-character-id="${character.id}"
                data-item-id="${selectedItem.id}"
              >
                Equip to ${character.name}
              </button>
            </div>
          </div>
        `
        : `
          <div class="pm-empty-selection">
            <strong>Select an inventory item</strong>
            <span>Its tradeoffs will be compared against ${character.name}'s equipped slot.</span>
          </div>
        `}
    `;
  }

  private skillsTab(character: PartyCharacterView): string {
    return `
      <div class="pm-skills">
        <p>Assign the character's existing abilities to slots 1–4.</p>
        ${([1, 2, 3, 4] as SkillSlot[])
          .map(slot => {
            const assigned = character.skillSlots[slot] ?? '';
            return `
              <label class="pm-skill-slot">
                <span>Slot ${slot}</span>
                <select
                  data-input="skill-slot"
                  data-character-id="${character.id}"
                  data-skill-slot="${slot}"
                >
                  <option value="">Unassigned</option>
                  ${character.skills
                    .map(skill => `
                      <option
                        value="${skill.id}"
                        ${assigned === skill.id ? 'selected' : ''}
                      >
                        ${skill.name}
                      </option>
                    `)
                    .join('')}
                </select>
              </label>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private statsTab(character: PartyCharacterView): string {
    return `
      <div class="pm-summary-bars large">
        ${this.summaryBar('Power', character.summary.power)}
        ${this.summaryBar('Defense', character.summary.defense)}
        ${this.summaryBar('Mobility', character.summary.mobility)}
        ${this.summaryBar('Support', character.summary.support)}
      </div>
      <div class="pm-stat-note">
        These are build summaries, not final combat formulas.
      </div>
    `;
  }

  private inventoryPanel(
    filteredItems: PartyEquipmentItem[],
    selectedCharacter?: PartyCharacterView,
  ): string {
    const selectedVisibleCount = filteredItems.filter(item =>
      this.selectedIds.has(item.id),
    ).length;

    return `
      <div class="pm-inventory-header">
        <div>
          <h2>Shared Inventory</h2>
          <p>
            ${filteredItems.length} of ${this.model.items.length} shown
            ${selectedCharacter ? `· ranked for ${selectedCharacter.name}` : ''}
          </p>
        </div>
        <div class="pm-tools">
          <input
            class="pm-search"
            data-input="search"
            type="search"
            value="${this.escape(this.search)}"
            placeholder="Search items"
          />
          <select class="pm-sort" data-input="sort">
            ${this.sortOption('recommended', 'Recommended')}
            ${this.sortOption('power', 'Power')}
            ${this.sortOption('rarity', 'Rarity')}
            ${this.sortOption('recent', 'Recent')}
          </select>
        </div>
      </div>

      <div class="pm-filters">
        ${this.filterButton('all', 'All')}
        ${this.filterButton('weapon', 'Weapons')}
        ${this.filterButton('armor', 'Armor')}
        ${this.filterButton('relic', 'Relics')}
        ${this.filterButton('fortified', 'Fortified')}
        ${this.filterButton('agile', 'Agile')}
        ${this.filterButton('focused', 'Focused')}
        ${this.filterButton('legendary', 'Legendary')}
        ${this.filterButton('recent', 'Recent')}
      </div>

      <div class="pm-maintenance">
        <span>${this.selectedIds.size} selected</span>
        <button data-action="select-visible">
          Select visible (${filteredItems.length})
        </button>
        <button data-action="clear-selection">Clear selection</button>
        <button
          class="danger"
          data-action="destroy-selected"
          ${this.selectedIds.size === 0 ? 'disabled' : ''}
        >
          Destroy selected
        </button>
        <button
          class="danger subtle"
          data-action="destroy-visible-low"
          ${filteredItems.length === 0 ? 'disabled' : ''}
        >
          Destroy visible common/magic
        </button>
        ${selectedVisibleCount > 0
          ? `<small>${selectedVisibleCount} selected items are visible</small>`
          : ''}
      </div>

      <div class="pm-item-scroll">
        <div class="pm-item-grid">
          ${filteredItems.length
            ? filteredItems.map(item => this.itemCard(item, selectedCharacter)).join('')
            : '<div class="pm-empty-inventory">No items match the current filters.</div>'}
        </div>
      </div>
    `;
  }

  private equipmentSlot(
    character: PartyCharacterView,
    slot: GearSlot,
  ): string {
    const item = character.equipment[slot];

    if (!item) {
      return `
        <div class="pm-equipped-slot empty">
          <span>${SLOT_LABELS[slot]}</span>
          <strong>Empty</strong>
        </div>
      `;
    }

    return `
      <button
        class="pm-equipped-slot ${item.rarity}"
        data-action="select-item"
        data-item-id="${item.id}"
      >
        <span>${SLOT_LABELS[slot]}</span>
        <strong>${item.name}</strong>
        <small>${item.rarity} · ${item.power} power</small>
      </button>
    `;
  }

  private itemCard(
    item: PartyEquipmentItem,
    selectedCharacter?: PartyCharacterView,
  ): string {
    const comparison = selectedCharacter
      ? this.compareForCharacter(item, selectedCharacter)
      : null;
    const equippedBy = this.equippedBy(item.id);
    const selected = this.selectedIds.has(item.id);

    return `
      <article
        class="pm-item-card ${item.rarity} ${item.id === this.selectedItemId ? 'active' : ''}"
      >
        <button
          class="pm-item-main"
          data-action="select-item"
          data-item-id="${item.id}"
        >
          <div class="pm-item-top">
            <span>${item.rarity}</span>
            <b>${item.power}</b>
          </div>
          <strong>${item.name}</strong>
          <small>${SLOT_LABELS[item.slot]} · ${FAMILY_LABELS[item.family]}</small>
          ${comparison
            ? `
              <div class="pm-recommendation ${comparison.tone}">
                <span>${comparison.label}</span>
                <strong>${comparison.delta >= 0 ? '+' : ''}${comparison.delta}</strong>
              </div>
            `
            : ''}
          ${equippedBy ? `<em>Equipped: ${equippedBy}</em>` : ''}
        </button>
        <label class="pm-select-item">
          <input
            type="checkbox"
            data-input="bulk-select"
            data-item-id="${item.id}"
            ${selected ? 'checked' : ''}
            ${equippedBy ? 'disabled' : ''}
          />
          <span>${equippedBy ? 'Equipped' : 'Select'}</span>
        </label>
      </article>
    `;
  }

  private getFilteredItems(): PartyEquipmentItem[] {
    const search = this.search.trim().toLowerCase();
    const selectedCharacter = this.getSelectedCharacter();

    const items = this.model.items.filter((item, index) => {
      if (search && !item.name.toLowerCase().includes(search)) return false;

      switch (this.filter) {
        case 'all': return true;
        case 'weapon':
        case 'armor':
        case 'relic':
          return item.slot === this.filter;
        case 'fortified':
        case 'agile':
        case 'focused':
          return item.family === this.filter;
        case 'legendary':
          return item.rarity === 'legendary';
        case 'recent':
          return index <= 5;
      }
    });

    return [...items].sort((a, b) => {
      switch (this.sortMode) {
        case 'power':
          return b.power - a.power;
        case 'rarity':
          return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
            b.power - a.power;
        case 'recent':
          return b.id - a.id;
        case 'recommended':
        default:
          if (!selectedCharacter) return b.power - a.power;
          return (
            this.compareForCharacter(b, selectedCharacter).delta -
            this.compareForCharacter(a, selectedCharacter).delta
          );
      }
    });
  }

  private compareForCharacter(
    item: PartyEquipmentItem,
    character: PartyCharacterView,
  ): {
    delta: number;
    label: string;
    tone: 'upgrade' | 'sidegrade' | 'downgrade';
  } {
    const current = character.equipment[item.slot];
    const candidate = this.itemScore(item, character);
    const currentScore = current ? this.itemScore(current, character) : 0;
    const delta = Math.round(candidate - currentScore);

    if (delta >= 8) return { delta, label: 'Strong upgrade', tone: 'upgrade' };
    if (delta >= 1) return { delta, label: 'Upgrade', tone: 'upgrade' };
    if (delta >= -2) return { delta, label: 'Sidegrade', tone: 'sidegrade' };
    return { delta, label: 'Downgrade', tone: 'downgrade' };
  }

  private itemScore(
    item: PartyEquipmentItem,
    character: PartyCharacterView,
  ): number {
    const familyMultiplier =
      item.family === character.preferredFamily ? 1.1 : 1;
    const weights = this.roleWeights(character.id);

    return (
      item.power +
      item.attackBonus * weights.attack +
      item.maxHpBonus * weights.health * 0.16 +
      item.focus * weights.focus +
      item.precision * weights.precision +
      item.technique * weights.technique +
      item.swapBonus * 0.35
    ) * familyMultiplier;
  }

  private roleWeights(characterId: string) {
    if (characterId === 'vanguard') {
      return {
        attack: 1,
        health: 0.8,
        focus: 0.35,
        precision: 0.45,
        technique: 0.6,
      };
    }

    if (characterId === 'warden') {
      return {
        attack: 0.55,
        health: 0.85,
        focus: 1,
        precision: 0.4,
        technique: 0.75,
      };
    }

    return {
      attack: 0.9,
      health: 0.35,
      focus: 0.5,
      precision: 1,
      technique: 0.95,
    };
  }

  private characterGearScore(character: PartyCharacterView): number {
    return Math.round(
      Object.values(character.equipment).reduce(
        (total, item) => total + (item ? this.itemScore(item, character) : 0),
        0,
      ),
    );
  }

  private getSelectedCharacter(): PartyCharacterView | undefined {
    return this.model.characters.find(
      character => character.id === this.selectedCharacterId,
    );
  }

  private equippedBy(itemId: number): string | null {
    for (const character of this.model.characters) {
      if (Object.values(character.equipment).some(item => item?.id === itemId)) {
        return character.name;
      }
    }
    return null;
  }

  private tabButton(tab: CharacterTab, label: string): string {
    return `
      <button
        class="${this.activeTab === tab ? 'active' : ''}"
        data-action="tab"
        data-tab="${tab}"
      >
        ${label}
      </button>
    `;
  }

  private filterButton(filter: Filter, label: string): string {
    return `
      <button
        class="${this.filter === filter ? 'active' : ''}"
        data-action="filter"
        data-filter="${filter}"
      >
        ${label}
      </button>
    `;
  }

  private sortOption(value: SortMode, label: string): string {
    return `
      <option value="${value}" ${this.sortMode === value ? 'selected' : ''}>
        ${label}
      </option>
    `;
  }

  private summaryBar(label: string, value: number): string {
    return `
      <div class="pm-summary-row">
        <span>${label}</span>
        <div><i style="width:${Math.max(4, Math.min(100, value))}%"></i></div>
        <strong>${Math.round(value)}</strong>
      </div>
    `;
  }

  private deltaRow(label: string, candidate: number, current: number): string {
    const delta = candidate - current;
    const tone = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';

    return `
      <div class="${tone}">
        <span>${label}</span>
        <strong>${this.formatSigned(candidate)}</strong>
        <small>${delta === 0 ? 'No change' : `${this.formatSigned(delta)} vs equipped`}</small>
      </div>
    `;
  }

  private formatSigned(value: number): string {
    return `${value > 0 ? '+' : ''}${value}`;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character]!);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-action]',
    );
    if (!target) return;

    switch (target.dataset.action) {
      case 'close':
        this.actions.close();
        return;

      case 'select-character':
        this.selectedCharacterId = target.dataset.characterId ?? null;
        this.draw();
        return;

      case 'tab':
        this.activeTab = target.dataset.tab as CharacterTab;
        this.draw();
        return;

      case 'filter':
        this.filter = target.dataset.filter as Filter;
        this.draw();
        return;

      case 'select-item':
        this.selectedItemId = Number(target.dataset.itemId);
        this.activeTab = 'equipment';
        this.draw();
        return;

      case 'equip':
        this.actions.equip(
          Number(target.dataset.itemId),
          target.dataset.characterId!,
        );
        return;

      case 'select-visible': {
        for (const item of this.getFilteredItems()) {
          if (!this.equippedBy(item.id)) this.selectedIds.add(item.id);
        }
        this.draw();
        return;
      }

      case 'clear-selection':
        this.selectedIds.clear();
        this.draw();
        return;

      case 'destroy-selected':
        this.destroy([...this.selectedIds]);
        return;

      case 'destroy-visible-low': {
        const ids = this.getFilteredItems()
          .filter(
            item =>
              !this.equippedBy(item.id) &&
              (item.rarity === 'common' || item.rarity === 'magic'),
          )
          .map(item => item.id);
        this.destroy(ids);
        return;
      }
    }
  };

  private readonly onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;

    if (target.dataset.input === 'search') {
      this.search = target.value;
      this.draw();
      const input =
        this.host.querySelector<HTMLInputElement>('[data-input="search"]');
      input?.focus();
      input?.setSelectionRange(this.search.length, this.search.length);
      return;
    }

    if (target.dataset.input === 'bulk-select') {
      const id = Number(target.dataset.itemId);
      target.checked ? this.selectedIds.add(id) : this.selectedIds.delete(id);
    }
  };

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;

    if (target.dataset.input === 'sort') {
      this.sortMode = target.value as SortMode;
      this.draw();
      return;
    }

    if (target.dataset.input === 'skill-slot') {
      this.actions.assignSkill(
        target.dataset.characterId!,
        Number(target.dataset.skillSlot) as SkillSlot,
        (target.value || null) as SkillId | null,
      );
    }
  };

  private destroy(ids: number[]): void {
    if (ids.length === 0) return;
    this.actions.destroyItems(ids);
    this.selectedIds.clear();
    if (this.selectedItemId !== null && ids.includes(this.selectedItemId)) {
      this.selectedItemId = null;
    }
  }
}
