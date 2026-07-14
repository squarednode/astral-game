import type {
  GearFamily,
  GearSlot,
  PartyCharacterView,
  PartyEquipmentItem,
  PartyManagementActions,
  PartyManagementModel,
} from './PartyManagementTypes';

type Filter = 'all' | GearSlot | GearFamily | 'legendary' | 'recent';
type SortMode = 'recommended' | 'power' | 'rarity' | 'recent';

const RARITY_ORDER = { common: 1, magic: 2, rare: 3, legendary: 4 } as const;
const SLOT_LABELS: Record<GearSlot, string> = { weapon: 'Weapon', armor: 'Armor', relic: 'Relic' };
const FAMILY_LABELS: Record<GearFamily, string> = { fortified: 'Fortified', agile: 'Agile', focused: 'Focused' };

export class PartyManagementScreen {
  private model: PartyManagementModel = { characters: [], items: [] };
  private selectedItemId: number | null = null;
  private filter: Filter = 'all';
  private sortMode: SortMode = 'recommended';
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
    if (this.selectedItemId !== null && !model.items.some(item => item.id === this.selectedItemId)) {
      this.selectedItemId = null;
    }
    this.draw();
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('input', this.onInput);
    this.host.removeEventListener('change', this.onChange);
  }

  private draw(): void {
    const selectedItem = this.model.items.find(item => item.id === this.selectedItemId);
    const filteredItems = this.getFilteredItems();
    const partyPower = this.model.characters.reduce((sum, c) => sum + this.characterGearScore(c), 0);

    this.host.innerHTML = `
      <div class="party-management-shell">
        <header class="pm-header">
          <div>
            <div class="pm-eyebrow">Command Center</div>
            <h1>Party Management</h1>
            <p>One shared inventory. Three independently equipped characters.</p>
          </div>
          <div class="pm-header-actions">
            <div class="pm-party-power"><span>Party Power</span><strong>${partyPower}</strong></div>
            <button class="pm-close" data-action="close" aria-label="Close">x</button>
          </div>
        </header>

        <section class="pm-character-grid">
          ${this.model.characters.map(c => this.characterCard(c, selectedItem)).join('')}
        </section>

        <section class="pm-selection">
          ${selectedItem ? this.selectedItemPanel(selectedItem) : this.emptySelection()}
        </section>

        <section class="pm-inventory">
          <div class="pm-inventory-header">
            <div><h2>Shared Inventory</h2><p>${filteredItems.length} of ${this.model.items.length} items shown</p></div>
            <div class="pm-tools">
              <input class="pm-search" data-input="search" type="search" value="${this.escape(this.search)}" placeholder="Search items" />
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
          <div class="pm-item-grid">
            ${filteredItems.length ? filteredItems.map(item => this.itemCard(item)).join('') : '<div class="pm-empty-inventory">No items match the current filters.</div>'}
          </div>
        </section>
      </div>`;
  }

  private characterCard(character: PartyCharacterView, item?: PartyEquipmentItem): string {
    const comparison = item ? this.compareForCharacter(item, character) : null;
    return `
      <article class="pm-character-card ${character.controlled ? 'controlled' : ''}">
        <div class="pm-character-top">
          <div class="pm-avatar">${character.name.slice(0, 1)}</div>
          <div class="pm-character-copy">
            <div class="pm-character-name">${character.name}${character.controlled ? '<span>Controlled</span>' : ''}</div>
            <div class="pm-role">${character.role}</div>
            <div class="pm-family ${character.preferredFamily}">${FAMILY_LABELS[character.preferredFamily]}</div>
          </div>
          <div class="pm-score">${this.characterGearScore(character)}</div>
        </div>
        <div class="pm-health"><span>Health ${Math.ceil(character.hp)} / ${Math.ceil(character.maxHp)}</span><div><i style="width:${Math.max(0, character.hp / character.maxHp * 100)}%"></i></div></div>
        <div class="pm-summary-bars">
          ${this.summaryBar('Power', character.summary.power)}
          ${this.summaryBar('Defense', character.summary.defense)}
          ${this.summaryBar('Mobility', character.summary.mobility)}
          ${this.summaryBar('Support', character.summary.support)}
        </div>
        <div class="pm-slots">${(['weapon','armor','relic'] as GearSlot[]).map(slot => this.slot(character, slot)).join('')}</div>
        ${item ? `<div class="pm-character-comparison ${comparison!.tone}"><div><span>${comparison!.label}</span><strong>${comparison!.delta >= 0 ? '+' : ''}${comparison!.delta}</strong></div><small>${item.family === character.preferredFamily ? 'Preferred family bonus applied' : 'Off-family gear'}</small><button data-action="equip" data-character-id="${character.id}" data-item-id="${item.id}">Equip to ${character.name}</button></div>` : ''}
      </article>`;
  }

  private slot(character: PartyCharacterView, slot: GearSlot): string {
    const item = character.equipment[slot];
    if (!item) return `<div class="pm-slot empty"><span>${SLOT_LABELS[slot]}</span><strong>Empty</strong></div>`;
    return `<button class="pm-slot ${item.rarity}" data-action="select-item" data-item-id="${item.id}"><span>${SLOT_LABELS[slot]}</span><strong>${item.name}</strong><small>${item.power} power</small></button>`;
  }

  private selectedItemPanel(item: PartyEquipmentItem): string {
    const equippedBy = this.equippedBy(item.id);
    return `
      <div class="pm-selected-item ${item.rarity}">
        <div class="pm-selected-heading">
          <div><span>${item.rarity.toUpperCase()} - ${SLOT_LABELS[item.slot]}</span><h2>${item.name}</h2><div class="pm-family ${item.family}">${FAMILY_LABELS[item.family]}</div></div>
          <div class="pm-selected-power">${item.power}</div>
        </div>
        <div class="pm-stat-grid">
          ${this.stat('Attack', item.attackBonus)}${this.stat('Health', item.maxHpBonus)}${this.stat('Focus', item.focus)}${this.stat('Precision', item.precision)}${this.stat('Technique', item.technique)}${this.stat('Swap', item.swapBonus, '%')}
        </div>
        ${item.legendaryPower ? `<div class="pm-legendary-power">${item.legendaryPower}</div>` : ''}
        <div class="pm-equipped-status">${equippedBy ? `Currently equipped by ${equippedBy}` : 'Not currently equipped'}</div>
      </div>
      <div class="pm-comparison-table">
        ${this.model.characters.map(c => { const comparison = this.compareForCharacter(item, c); return `<button class="pm-comparison-row ${comparison.tone}" data-action="equip" data-character-id="${c.id}" data-item-id="${item.id}"><div><strong>${c.name}</strong><span>${FAMILY_LABELS[c.preferredFamily]}</span></div><div><strong>${comparison.delta >= 0 ? '+' : ''}${comparison.delta}</strong><span>${comparison.label}</span></div><b>Equip</b></button>`; }).join('')}
      </div>`;
  }

  private emptySelection(): string {
    return `<div class="pm-empty-selection"><strong>Select an item</strong><span>It will be compared against all party members at once.</span></div>`;
  }

  private itemCard(item: PartyEquipmentItem): string {
    const best = this.bestCharacter(item);
    const equippedBy = this.equippedBy(item.id);
    return `<button class="pm-item-card ${item.rarity} ${item.id === this.selectedItemId ? 'selected' : ''}" data-action="select-item" data-item-id="${item.id}"><div class="pm-item-top"><span>${item.rarity}</span><b>${item.power}</b></div><strong>${item.name}</strong><small>${SLOT_LABELS[item.slot]} - ${FAMILY_LABELS[item.family]}</small><div class="pm-recommendation ${best.comparison.tone}"><span>${best.character.name}</span><strong>${best.comparison.delta >= 0 ? '+' : ''}${best.comparison.delta}</strong></div>${equippedBy ? `<em>Equipped: ${equippedBy}</em>` : ''}</button>`;
  }

  private getFilteredItems(): PartyEquipmentItem[] {
    const search = this.search.trim().toLowerCase();
    const items = this.model.items.filter((item, index) => {
      if (search && !item.name.toLowerCase().includes(search)) return false;
      switch (this.filter) {
        case 'all': return true;
        case 'weapon': case 'armor': case 'relic': return item.slot === this.filter;
        case 'fortified': case 'agile': case 'focused': return item.family === this.filter;
        case 'legendary': return item.rarity === 'legendary';
        case 'recent': return index <= 5;
      }
    });
    return [...items].sort((a,b) => {
      if (this.sortMode === 'power') return b.power - a.power;
      if (this.sortMode === 'rarity') return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || b.power - a.power;
      if (this.sortMode === 'recent') return b.id - a.id;
      return this.bestCharacter(b).comparison.delta - this.bestCharacter(a).comparison.delta;
    });
  }

  private compareForCharacter(item: PartyEquipmentItem, character: PartyCharacterView): { delta: number; label: string; tone: 'upgrade'|'sidegrade'|'downgrade' } {
    const current = character.equipment[item.slot];
    const delta = Math.round(this.itemScore(item, character) - (current ? this.itemScore(current, character) : 0));
    if (delta >= 8) return { delta, label: 'Strong upgrade', tone: 'upgrade' };
    if (delta >= 1) return { delta, label: 'Upgrade', tone: 'upgrade' };
    if (delta >= -2) return { delta, label: 'Sidegrade', tone: 'sidegrade' };
    return { delta, label: 'Downgrade', tone: 'downgrade' };
  }

  private itemScore(item: PartyEquipmentItem, character: PartyCharacterView): number {
    const familyMultiplier = item.family === character.preferredFamily ? 1.1 : 1;
    const w = character.id === 'vanguard'
      ? { attack: 1, health: 0.8, focus: 0.35, precision: 0.45, technique: 0.6 }
      : character.id === 'warden'
        ? { attack: 0.55, health: 0.85, focus: 1, precision: 0.4, technique: 0.75 }
        : { attack: 0.9, health: 0.35, focus: 0.5, precision: 1, technique: 0.95 };
    return (item.power + item.attackBonus*w.attack + item.maxHpBonus*w.health*0.16 + item.focus*w.focus + item.precision*w.precision + item.technique*w.technique + item.swapBonus*0.35) * familyMultiplier;
  }

  private bestCharacter(item: PartyEquipmentItem) {
    return this.model.characters.map(character => ({ character, comparison: this.compareForCharacter(item, character) })).sort((a,b) => b.comparison.delta - a.comparison.delta)[0];
  }

  private characterGearScore(character: PartyCharacterView): number {
    return Math.round(Object.values(character.equipment).reduce((sum,item) => sum + (item ? this.itemScore(item, character) : 0), 0));
  }

  private equippedBy(itemId: number): string | null {
    for (const character of this.model.characters) if (Object.values(character.equipment).some(item => item?.id === itemId)) return character.name;
    return null;
  }

  private summaryBar(label: string, value: number): string { return `<div class="pm-summary-row"><span>${label}</span><div><i style="width:${Math.max(4, Math.min(100, value))}%"></i></div></div>`; }
  private stat(label: string, value: number, suffix = ''): string { return `<div><span>${label}</span><strong>+${value}${suffix}</strong></div>`; }
  private filterButton(filter: Filter, label: string): string { return `<button class="${this.filter === filter ? 'active' : ''}" data-action="filter" data-filter="${filter}">${label}</button>`; }
  private sortOption(value: SortMode, label: string): string { return `<option value="${value}" ${this.sortMode === value ? 'selected' : ''}>${label}</option>`; }
  private escape(value: string): string { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!)); }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'close') return this.actions.close();
    if (action === 'filter') { this.filter = target.dataset.filter as Filter; this.draw(); return; }
    if (action === 'select-item') { this.selectedItemId = Number(target.dataset.itemId); this.draw(); return; }
    if (action === 'equip') this.actions.equip(Number(target.dataset.itemId), target.dataset.characterId!);
  };

  private readonly onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.input !== 'search') return;
    this.search = target.value;
    this.draw();
    const input = this.host.querySelector<HTMLInputElement>('[data-input="search"]');
    input?.focus(); input?.setSelectionRange(this.search.length, this.search.length);
  };

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    if (target.dataset.input !== 'sort') return;
    this.sortMode = target.value as SortMode;
    this.draw();
  };
}
