import type { DefinitionRegistry } from '../../engine/definitions';
import type {
  AbilityDefinition,
  AiAbilityUsageDefinition,
  CombatTagDefinition,
  DamageProfileDefinition,
  ProjectileDefinition,
  StatusEffectDefinition,
  TelegraphDefinition,
} from '../../game/definitions';

interface CatalogRow {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly family: string;
  readonly power: string;
  readonly speed: string;
  readonly range: string;
  readonly cast: string;
  readonly cooldown: string;
  readonly tags: string;
  readonly runtime: string;
  readonly detail: string;
  readonly searchText: string;
}

export class CombatLibraryPanel {
  readonly element: HTMLDivElement;
  private readonly search: HTMLInputElement;
  private readonly kindFilter: HTMLSelectElement;
  private readonly tagFilter: HTMLSelectElement;
  private readonly tbody: HTMLTableSectionElement;
  private readonly detail: HTMLPreElement;
  private readonly summary: HTMLDivElement;
  private rows: readonly CatalogRow[] = [];

  constructor(parent: HTMLElement, registry: DefinitionRegistry) {
    this.element = document.createElement('div');
    this.element.className = 'combat-library-panel';

    const toolbar = document.createElement('div');
    toolbar.className = 'combat-library-toolbar';

    this.search = document.createElement('input');
    this.search.type = 'search';
    this.search.placeholder = 'Search abilities, tags, projectiles…';
    this.search.setAttribute('aria-label', 'Search combat library');

    this.kindFilter = document.createElement('select');
    this.kindFilter.setAttribute('aria-label', 'Filter combat library kind');
    for (const [value, label] of [
      ['', 'All definitions'],
      ['ability', 'Abilities'],
      ['projectile', 'Projectiles'],
      ['status-effect', 'Status effects'],
      ['telegraph', 'Telegraphs'],
      ['damage-profile', 'Damage profiles'],
      ['ai-ability-usage', 'AI usage'],
      ['combat-tag', 'Combat tags'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      this.kindFilter.appendChild(option);
    }

    this.tagFilter = document.createElement('select');
    this.tagFilter.setAttribute('aria-label', 'Filter combat tag');
    const allTag = document.createElement('option');
    allTag.value = '';
    allTag.textContent = 'All tags';
    this.tagFilter.appendChild(allTag);
    for (const tag of registry.all<CombatTagDefinition>('combat-tag')) {
      const option = document.createElement('option');
      option.value = tag.name;
      option.textContent = tag.name;
      this.tagFilter.appendChild(option);
    }

    this.summary = document.createElement('div');
    this.summary.className = 'combat-library-summary';
    toolbar.append(this.search, this.kindFilter, this.tagFilter, this.summary);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'combat-library-table-wrap';
    const table = document.createElement('table');
    table.className = 'combat-library-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th><th>Family</th><th>Power</th><th>Speed</th>
          <th>Range</th><th>Cast</th><th>Cooldown</th><th>Runtime</th>
        </tr>
      </thead>
    `;
    this.tbody = document.createElement('tbody');
    table.appendChild(this.tbody);
    tableWrap.appendChild(table);

    this.detail = document.createElement('pre');
    this.detail.className = 'developer-hud-data combat-library-detail';
    this.detail.textContent = 'Select a combat-library row to inspect its references and values.';

    this.element.append(toolbar, tableWrap, this.detail);
    parent.appendChild(this.element);

    this.rows = buildRows(registry);
    this.search.addEventListener('input', () => this.render());
    this.kindFilter.addEventListener('change', () => this.render());
    this.tagFilter.addEventListener('change', () => this.render());
    this.render();
  }

  private render(): void {
    const query = this.search.value.trim().toLowerCase();
    const kind = this.kindFilter.value;
    const tag = this.tagFilter.value.toLowerCase();
    const visible = this.rows.filter(row =>
      (!kind || row.kind === kind) &&
      (!tag || row.tags.toLowerCase().split(', ').includes(tag)) &&
      (!query || row.searchText.includes(query)),
    );

    this.summary.textContent = `${visible.length} / ${this.rows.length}`;
    this.tbody.replaceChildren(...visible.map(row => {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.innerHTML = [
        `<td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.kind)}</small></td>`,
        `<td>${escapeHtml(row.family)}</td>`,
        `<td>${escapeHtml(row.power)}</td>`,
        `<td>${escapeHtml(row.speed)}</td>`,
        `<td>${escapeHtml(row.range)}</td>`,
        `<td>${escapeHtml(row.cast)}</td>`,
        `<td>${escapeHtml(row.cooldown)}</td>`,
        `<td>${escapeHtml(row.runtime)}</td>`,
      ].join('');
      const select = () => { this.detail.textContent = row.detail; };
      tr.addEventListener('click', select);
      tr.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') select();
      });
      return tr;
    }));
  }
}

function buildRows(registry: DefinitionRegistry): readonly CatalogRow[] {
  const rows: CatalogRow[] = [];
  const usages = registry.all<AiAbilityUsageDefinition>('ai-ability-usage');

  for (const ability of registry.all<AbilityDefinition>('ability')) {
    const referencedBy = usages.filter(usage => usage.abilityId === ability.id);
    rows.push(row({
      id: ability.id,
      name: ability.name,
      kind: ability.kind,
      family: ability.family,
      power: formatNumber(ability.power ?? ability.damage),
      speed: formatNumber(ability.speed),
      range: formatNumber(ability.range),
      cast: `${ability.castTime.toFixed(2)}s`,
      cooldown: `${ability.cooldown.toFixed(2)}s`,
      tags: ability.abilityTags.join(', '),
      runtime: ability.runtimeReady ? 'ready' : 'catalog',
      detail: [
        ability.name.toUpperCase(),
        `ID              ${ability.id}`,
        `Family          ${ability.family}`,
        `Description     ${ability.description}`,
        `Runtime         ${ability.runtimeReady ? 'implemented' : 'catalog-only'}`,
        `Executor        ${ability.executorId}`,
        `Targeting       ${ability.targeting}`,
        `Cast style      ${ability.castStyle}`,
        `Power           ${formatNumber(ability.power ?? ability.damage)}`,
        `Speed           ${formatNumber(ability.speed)}`,
        `Range           ${formatNumber(ability.range)}`,
        `Radius          ${formatNumber(ability.radius)}`,
        `Cast            ${ability.castTime.toFixed(2)}s`,
        `Cooldown        ${ability.cooldown.toFixed(2)}s`,
        `Commit          ${(ability.commitThreshold * 100).toFixed(0)}%`,
        `Move casting    ${ability.canMoveWhileCasting ? 'yes' : 'no'}`,
        `Rotate casting  ${ability.canRotateWhileCasting ? 'yes' : 'no'}`,
        `Projectile      ${ability.projectileId ?? 'none'}`,
        `Telegraph       ${ability.telegraphId ?? 'none'}`,
        `Damage profile  ${ability.damageProfileId ?? 'none'}`,
        `Statuses        ${ability.statusEffectIds?.join(', ') || 'none'}`,
        `Tags            ${ability.abilityTags.join(', ')}`,
        '',
        'AI USAGE REFERENCES',
        ...(referencedBy.length > 0
          ? referencedBy.map(usage => `  ${usage.name} · weight ${usage.weight} · ${usage.minimumRange}-${usage.maximumRange}m · commit ${(usage.commitmentThreshold * 100).toFixed(0)}%`)
          : ['  none']),
      ].join('\n'),
    }));
  }

  for (const definition of registry.all<ProjectileDefinition>('projectile')) {
    rows.push(row({ id: definition.id, name: definition.name, kind: definition.kind, family: definition.motion,
      power: '—', speed: formatNumber(definition.speed), range: formatNumber(definition.speed * definition.lifetime), cast: '—', cooldown: '—', tags: 'projectile', runtime: 'asset',
      detail: [`${definition.name.toUpperCase()} PROJECTILE`, `ID              ${definition.id}`, `Motion          ${definition.motion}`, `Speed           ${definition.speed}`, `Radius          ${definition.radius}`, `Lifetime        ${definition.lifetime}s`, `Pierce          ${definition.pierce}`, `Bounce          ${definition.bounce}`, `Homing          ${definition.homingStrength}`].join('\n') }));
  }

  for (const definition of registry.all<StatusEffectDefinition>('status-effect')) {
    rows.push(row({ id: definition.id, name: definition.name, kind: definition.kind, family: definition.stackingRule,
      power: formatNumber(definition.powerPerTick), speed: definition.tickInterval ? `${definition.tickInterval}s tick` : '—', range: '—', cast: `${definition.duration}s`, cooldown: '—', tags: definition.tags.join(', '), runtime: 'data',
      detail: [`${definition.name.toUpperCase()} STATUS`, `ID              ${definition.id}`, `Description     ${definition.description}`, `Duration        ${definition.duration}s`, `Tick interval   ${formatNumber(definition.tickInterval)}`, `Power / tick    ${formatNumber(definition.powerPerTick)}`, `Move multiplier ${formatNumber(definition.movementMultiplier)}`, `Stacks          ${definition.maximumStacks}`, `Stacking        ${definition.stackingRule}`, `Tags            ${definition.tags.join(', ')}`].join('\n') }));
  }

  for (const definition of registry.all<TelegraphDefinition>('telegraph')) {
    rows.push(row({ id: definition.id, name: definition.name, kind: definition.kind, family: definition.shape,
      power: '—', speed: '—', range: formatNumber(definition.length ?? definition.radius), cast: `${definition.duration}s`, cooldown: '—', tags: 'telegraph', runtime: 'data',
      detail: [`${definition.name.toUpperCase()} TELEGRAPH`, `ID              ${definition.id}`, `Shape           ${definition.shape}`, `Duration        ${definition.duration}s`, `Radius          ${formatNumber(definition.radius)}`, `Length          ${formatNumber(definition.length)}`, `Width           ${formatNumber(definition.width)}`, `Angle           ${formatNumber(definition.angleDegrees)}`, `Follows caster  ${definition.followsCaster ? 'yes' : 'no'}`, `Color token     ${definition.colorToken}`].join('\n') }));
  }

  for (const definition of registry.all<DamageProfileDefinition>('damage-profile')) {
    rows.push(row({ id: definition.id, name: definition.name, kind: definition.kind, family: definition.element,
      power: '—', speed: '—', range: '—', cast: '—', cooldown: '—', tags: definition.tags.join(', '), runtime: 'data',
      detail: [`${definition.name.toUpperCase()} DAMAGE PROFILE`, `ID              ${definition.id}`, `Element         ${definition.element}`, `Critical hits   ${definition.canCrit ? 'yes' : 'no'}`, `Armor           ${definition.armorInteraction}`, `Status          ${definition.statusEffectId ?? 'none'}`, `Tags            ${definition.tags.join(', ')}`].join('\n') }));
  }

  for (const definition of usages) {
    rows.push(row({ id: definition.id, name: definition.name, kind: definition.kind, family: 'enemy option',
      power: `${definition.powerMultiplier.toFixed(2)}×`, speed: '—', range: `${definition.minimumRange}-${definition.maximumRange}`, cast: `${(definition.commitmentThreshold * 100).toFixed(0)}% commit`, cooldown: `${definition.cooldownMultiplier.toFixed(2)}×`, tags: 'ai', runtime: 'data',
      detail: [`${definition.name.toUpperCase()} AI USAGE`, `ID              ${definition.id}`, `Ability         ${definition.abilityId}`, `Weight          ${definition.weight}`, `Range           ${definition.minimumRange}-${definition.maximumRange}`, `Preferred       ${definition.preferredRange}`, `Health window   ${(definition.minimumHealthPercent * 100).toFixed(0)}-${(definition.maximumHealthPercent * 100).toFixed(0)}%`, `Cooldown        ${definition.cooldownMultiplier}×`, `Power           ${definition.powerMultiplier}×`, `Line of sight   ${definition.requiresLineOfSight ? 'required' : 'not required'}`, `Commit          ${(definition.commitmentThreshold * 100).toFixed(0)}%`].join('\n') }));
  }

  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

function row(value: Omit<CatalogRow, 'searchText'>): CatalogRow {
  return { ...value, searchText: Object.values(value).join(' ').toLowerCase() };
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
