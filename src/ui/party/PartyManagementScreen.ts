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
type SortMode =
  | 'recommended'
  | 'power'
  | 'rarity'
  | 'recent'
  | 'type'
  | 'family'
  | 'name';
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
  private model: PartyManagementModel = {
    characters: [],
    items: [],
    maximumActiveCharacters: 3,
    resources: {
      copper: 0,
      capacity: 24,
      used: 0,
      available: 24,
      materials: {},
    },
  };
  private selectedItemId: number | null = null;
  private selectedCharacterId: string | null = null;
  private hoveredItemId: number | null = null;
  private filter: Filter = 'all';
  private sortMode: SortMode =
    (localStorage.getItem('astral.partyInventorySort') as SortMode | null) ??
    'recommended';
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
    this.host.addEventListener('mouseover', this.onMouseOver);
    this.host.addEventListener('mouseout', this.onMouseOut);
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

    this.draw();
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('input', this.onInput);
    this.host.removeEventListener('change', this.onChange);
    this.host.removeEventListener('mouseover', this.onMouseOver);
    this.host.removeEventListener('mouseout', this.onMouseOut);
  }

  private draw(): void {
    const selectedCharacter = this.getSelectedCharacter();
    const previewItemId = this.hoveredItemId ?? this.selectedItemId;
    const selectedItem = this.model.items.find(
      item => item.id === previewItemId,
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

        ${this.resourceStrip()}

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

  private resourceStrip(): string {
    const resources = this.model.resources;
    const materials = Object.entries(resources.materials)
      .filter(([, amount]) => amount > 0)
      .sort(([a], [b]) => a.localeCompare(b));

    return `
      <section class="pm-resource-strip">
        <div class="pm-resource-card currency">
          <span>Wallet</span>
          <strong>${resources.copper}</strong>
          <small>Copper</small>
        </div>

        <div class="pm-resource-card capacity">
          <span>Equipment Bag</span>
          <strong>${resources.used} / ${resources.capacity}</strong>
          <small>${resources.available} slots available</small>
        </div>

        <div class="pm-resource-materials">
          <div class="pm-resource-heading">
            <span>Materials</span>
            <small>Stored separately from equipment</small>
          </div>
          <div class="pm-material-list">
            ${materials.length
              ? materials
                  .map(
                    ([id, amount]) => `
                      <div class="pm-material-chip">
                        <span>${this.materialLabel(id)}</span>
                        <strong>${amount}</strong>
                      </div>
                    `,
                  )
                  .join('')
              : '<div class="pm-material-empty">No materials collected</div>'}
          </div>
        </div>
      </section>
    `;
  }

  private materialLabel(id: string): string {
    if (id.startsWith('quest:')) {
      return `Quest · ${this.titleCase(id.slice(6))}`;
    }
    return this.titleCase(id);
  }

  private titleCase(value: string): string {
    return value
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
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
          <span>${character.role} · Level ${character.level}</span>
          <small>${character.rosterStatus === 'active' ? 'Active Party' : 'Reserve'}${character.leader ? ' · Leader' : ''} · ${character.experienceForNextLevel > 0 ? `${character.experienceIntoLevel}/${character.experienceForNextLevel} XP` : 'Maximum Level'}</small>
        </div>
        <b>${this.characterGearScore(character)}</b>
        ${character.controlled ? '<em>Controlled</em>' : ''}
        <span class="pm-roster-badge ${character.rosterStatus}">${character.rosterStatus}</span>
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
          <p>${character.role} · Level ${character.level}</p>
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

      <div class="pm-health pm-experience" title="${character.experienceForNextLevel > 0 ? `${Math.max(0, character.experienceForNextLevel - character.experienceIntoLevel)} XP remaining` : 'Maximum level reached'}">
        <span>${character.experienceForNextLevel > 0 ? `Experience ${character.experienceIntoLevel} / ${character.experienceForNextLevel}` : 'Experience · Maximum Level'}</span>
        <div>
          <i style="width:${Math.round(character.experienceProgress * 100)}%"></i>
        </div>
      </div>

      <div class="pm-roster-actions">
        <div>
          <strong>${character.rosterStatus === 'active' ? 'Active Party' : 'Reserve'}</strong>
          <span>${character.leader ? 'Current leader' : `Party limit ${this.model.characters.filter(candidate => candidate.rosterStatus === 'active').length}/${this.model.maximumActiveCharacters}`}</span>
        </div>
        ${character.rosterStatus === 'active'
          ? `${character.leader ? '' : `<button data-action="set-leader" data-character-id="${character.id}">Make Leader</button>`}
             <button data-action="move-reserve" data-character-id="${character.id}" ${this.model.characters.filter(candidate => candidate.rosterStatus === 'active').length <= 1 ? 'disabled' : ''}>Move to Reserve</button>`
          : `<button data-action="add-party" data-character-id="${character.id}">Add to Party</button>`}
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
                <h3>${selectedItem.favorite ? '★ ' : ''}${selectedItem.name}</h3>
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
              ${this.deltaRow(
                'Armor',
                selectedItem.armor,
                character.equipment[selectedItem.slot]?.armor ?? 0,
              )}
              ${this.percentDeltaRow(
                'Move Speed',
                selectedItem.movementSpeedPercent,
                character.equipment[selectedItem.slot]?.movementSpeedPercent ?? 0,
              )}
              ${this.percentDeltaRow(
                'Status Potency',
                selectedItem.statusPotencyPercent,
                character.equipment[selectedItem.slot]?.statusPotencyPercent ?? 0,
              )}
              ${this.percentDeltaRow(
                'Status Resist',
                selectedItem.statusResistancePercent,
                character.equipment[selectedItem.slot]?.statusResistancePercent ?? 0,
              )}
            </div>

            ${selectedItem.effectDescriptions.length
              ? `
                <div class="pm-equipment-effects">
                  <span>Equipment Effects</span>
                  ${selectedItem.effectDescriptions
                    .map(effect => `<strong>${this.escape(effect)}</strong>`)
                    .join('')}
                </div>
              `
              : ''}

            ${selectedItem.legendaryPower
              ? `<div class="pm-legendary-power">${selectedItem.legendaryPower}</div>`
              : ''}

            <div class="pm-equip-footer ${comparison!.tone}">
              <div>
                <strong>${comparison!.label}</strong>
                <span>
                  ${comparison!.delta >= 0 ? '+' : ''}${comparison!.delta} score
                  · ${comparison!.percent >= 0 ? '+' : ''}${comparison!.percent}% overall
                </span>
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
        <p>Assign abilities unlocked in the character's skill tree to slots 1–4. Level 1 characters begin with no equipped skills.</p>
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
      <div class="pm-progression-summary">
        <strong>Level ${character.level}</strong>
        <span>${character.experienceForNextLevel > 0
          ? `${character.experienceIntoLevel} / ${character.experienceForNextLevel} XP · ${Math.max(0, character.experienceForNextLevel - character.experienceIntoLevel)} remaining`
          : 'Maximum Level'}</span>
        <div class="pm-progression-growth">
          <span>Progression Growth</span>
          <b>+${character.growth.maximumHealth} Health</b>
          <b>+${character.growth.attack} Attack</b>
          <b>+${character.growth.armor.toFixed(1)} Armor</b>
          <b>+${character.growth.movementSpeed.toFixed(2)} Move Speed</b>
        </div>
      </div>
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
            ${this.sortOption('type', 'Item Type')}
            ${this.sortOption('family', 'Family')}
            ${this.sortOption('name', 'Name')}
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
        <span>${this.selectedItemId === null ? 'No item selected' : 'Selected item actions'}</span>
        <button
          data-action="favorite-selected"
          ${this.selectedItemId === null ? 'disabled' : ''}
        >
          ${this.selectedItemId !== null && this.model.items.find(item => item.id === this.selectedItemId)?.favorite ? '★ Unfavorite' : '☆ Favorite'}
        </button>
        <button
          class="danger"
          data-action="destroy-selected"
          ${this.canDestroySelected() ? '' : 'disabled'}
        >
          Destroy selected item
        </button>
        <button
          class="danger subtle"
          data-action="destroy-visible-low"
          ${filteredItems.length === 0 ? 'disabled' : ''}
        >
          Destroy visible common/magic
        </button>
        <small>Equipped and favorited items are protected.</small>
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

    return `
      <article
        class="pm-item-card ${item.rarity} ${item.id === this.selectedItemId ? 'active' : ''}"
        data-hover-item-id="${item.id}"
      >
        <button
          class="pm-item-main"
          data-action="select-item"
          data-item-id="${item.id}"
        >
          <div class="pm-item-top">
            <span>${item.favorite ? '★ ' : ''}${item.rarity}</span>
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
        case 'type':
          return a.slot.localeCompare(b.slot) ||
            RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
            b.power - a.power;
        case 'family':
          return a.family.localeCompare(b.family) ||
            RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
            b.power - a.power;
        case 'name':
          return a.name.localeCompare(b.name);
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
    percent: number;
    label: string;
    tone: 'upgrade' | 'sidegrade' | 'downgrade';
  } {
    const current = character.equipment[item.slot];
    const candidate = this.itemScore(item, character);
    const currentScore = current ? this.itemScore(current, character) : 0;
    const delta = Math.round(candidate - currentScore);
    const percent = Math.round(
      currentScore <= 0
        ? candidate > 0
          ? 100
          : 0
        : ((candidate - currentScore) / currentScore) * 100,
    );

    if (delta >= 8) {
      return { delta, percent, label: 'Strong upgrade', tone: 'upgrade' };
    }
    if (delta >= 1) {
      return { delta, percent, label: 'Upgrade', tone: 'upgrade' };
    }
    if (delta >= -2) {
      return { delta, percent, label: 'Sidegrade', tone: 'sidegrade' };
    }
    return { delta, percent, label: 'Downgrade', tone: 'downgrade' };
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
      item.swapBonus * 0.35 +
      item.armor * weights.armor +
      item.movementSpeedPercent * 100 * weights.mobility +
      item.statusPotencyPercent * 100 * weights.status +
      item.statusResistancePercent * 100 * weights.resistance +
      item.effectDescriptions.length * weights.effects
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
        armor: 1.1,
        mobility: 0.45,
        status: 0.45,
        resistance: 0.8,
        effects: 3,
      };
    }

    if (characterId === 'warden') {
      return {
        attack: 0.55,
        health: 0.85,
        focus: 1,
        precision: 0.4,
        technique: 0.75,
        armor: 0.75,
        mobility: 0.5,
        status: 1.1,
        resistance: 0.9,
        effects: 3.5,
      };
    }

    return {
      attack: 0.9,
      health: 0.35,
      focus: 0.5,
      precision: 1,
      technique: 0.95,
      armor: 0.35,
      mobility: 1,
      status: 0.8,
      resistance: 0.45,
      effects: 4,
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

  private percentDeltaRow(
    label: string,
    candidate: number,
    current: number,
  ): string {
    const delta = candidate - current;
    const tone = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
    const format = (value: number) =>
      `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;

    return `
      <div class="${tone}">
        <span>${label}</span>
        <strong>${format(candidate)}</strong>
        <small>${delta === 0 ? 'No change' : `${format(delta)} vs equipped`}</small>
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

  private canDestroySelected(): boolean {
    if (this.selectedItemId === null) return false;
    const item = this.model.items.find(candidate => candidate.id === this.selectedItemId);
    return Boolean(item && !item.favorite && !this.equippedBy(item.id));
  }

  private readonly onMouseOver = (event: MouseEvent): void => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-hover-item-id]');
    if (!card) return;
    const id = Number(card.dataset.hoverItemId);
    if (this.hoveredItemId === id) return;
    this.hoveredItemId = id;
    this.draw();
  };

  private readonly onMouseOut = (event: MouseEvent): void => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-hover-item-id]');
    if (!card) return;
    const related = event.relatedTarget as Node | null;
    if (related && card.contains(related)) return;
    this.hoveredItemId = null;
    this.draw();
  };

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

      case 'set-leader':
        this.actions.setLeader(target.dataset.characterId!);
        return;

      case 'move-reserve':
        this.actions.moveToReserve(target.dataset.characterId!);
        return;

      case 'add-party': {
        const characterId = target.dataset.characterId!;
        const active = this.model.characters.filter(character => character.rosterStatus === 'active');
        if (active.length < this.model.maximumActiveCharacters) {
          this.actions.addToParty(characterId);
          return;
        }
        const names = active.map((character, index) => `${index + 1}. ${character.name}`).join('\n');
        const choice = window.prompt(`Party is full. Enter the number of the character to move to reserve:\n\n${names}`);
        const index = Number(choice) - 1;
        if (index >= 0 && index < active.length) {
          this.actions.addToParty(characterId, active[index].id);
        }
        return;
      }

      case 'equip':
        this.actions.equip(
          Number(target.dataset.itemId),
          target.dataset.characterId!,
        );
        return;

      case 'favorite-selected':
        if (this.selectedItemId !== null) {
          this.actions.toggleFavorite(this.selectedItemId);
        }
        return;

      case 'destroy-selected': {
        if (this.selectedItemId === null) return;
        const item = this.model.items.find(candidate => candidate.id === this.selectedItemId);
        if (!item || item.favorite || this.equippedBy(item.id)) return;
        if (window.confirm(`Destroy ${item.name}?`)) {
          this.destroy([item.id]);
        }
        return;
      }

      case 'destroy-visible-low': {
        const candidates = this.getFilteredItems().filter(
          item =>
            !item.favorite &&
            !this.equippedBy(item.id) &&
            (item.rarity === 'common' || item.rarity === 'magic'),
        );
        if (candidates.length === 0) return;
        const common = candidates.filter(item => item.rarity === 'common').length;
        const magic = candidates.filter(item => item.rarity === 'magic').length;
        const confirmed = window.confirm(
          `Destroy ${candidates.length} visible items?\n\nCommon: ${common}\nMagic: ${magic}\n\nEquipped and favorited items are excluded.`,
        );
        if (confirmed) this.destroy(candidates.map(item => item.id));
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

  };

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;

    if (target.dataset.input === 'sort') {
      this.sortMode = target.value as SortMode;
      localStorage.setItem('astral.partyInventorySort', this.sortMode);
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
    if (this.selectedItemId !== null && ids.includes(this.selectedItemId)) {
      this.selectedItemId = null;
    }
  }
}
