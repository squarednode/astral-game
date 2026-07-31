import type { CharacterSkillSnapshot, CharacterSkillTreeDefinition } from '../../game/skills';

export interface SkillTreeAbilityView { id: string; abilityId: string; name: string; ultimate?: boolean; }

export interface SkillTreeCharacterView {
  id: string;
  name: string;
  role: string;
  rosterStatus: 'active' | 'reserve';
  tree: CharacterSkillTreeDefinition;
  state: CharacterSkillSnapshot;
  abilities: readonly SkillTreeAbilityView[];
}

export interface SkillTreeScreenActions {
  close(): void;
  unlock(characterId: string, nodeId: string): void;
  selectCharacter?(characterId: string): void;
  assign(characterId: string, slot: 1 | 2 | 3 | 4, abilityId: string | null): void;
}

export class SkillTreeScreen {
  private characters: readonly SkillTreeCharacterView[] = [];
  private selectedCharacterId: string | null = null;

  constructor(private readonly host: HTMLDivElement, private readonly actions: SkillTreeScreenActions) {
    host.classList.add('skill-tree-host', 'hidden');
    host.addEventListener('click', this.onClick);
    host.addEventListener('change', this.onChange);
  }

  setOpen(open: boolean): void {
    this.host.classList.toggle('hidden', !open);
    this.host.parentElement?.classList.toggle('ui-layer--interactive', open);
  }
  isOpen(): boolean { return !this.host.classList.contains('hidden'); }

  render(characters: readonly SkillTreeCharacterView[], preferredCharacterId?: string): void {
    this.characters = characters;
    if (preferredCharacterId && characters.some(character => character.id === preferredCharacterId)) this.selectedCharacterId = preferredCharacterId;
    if (!this.selectedCharacterId || !characters.some(character => character.id === this.selectedCharacterId)) this.selectedCharacterId = characters[0]?.id ?? null;
    this.draw();
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('change', this.onChange);
    this.host.parentElement?.classList.remove('ui-layer--interactive');
  }

  private draw(): void {
    const selected = this.characters.find(character => character.id === this.selectedCharacterId);
    this.host.innerHTML = `
      <div class="skill-tree-shell">
        <header class="skill-tree-header">
          <div><span>Character Progression</span><h1>Skill Tree</h1></div>
          <button type="button" data-action="close" aria-label="Close skill tree">×</button>
        </header>
        <nav class="skill-character-list">
          ${this.characters.map(character => `<button type="button" class="${character.id === selected?.id ? 'selected' : ''}" data-action="select" data-character-id="${character.id}"><strong>${character.name}</strong><span>${character.tree.identityTitle}</span><small>Level ${character.state.level} · ${character.state.availableSkillPoints} point${character.state.availableSkillPoints === 1 ? '' : 's'} · ${character.rosterStatus}</small></button>`).join('')}
        </nav>
        ${selected ? this.characterTree(selected) : '<div class="skill-tree-empty">No unlocked characters.</div>'}
      </div>`;
  }

  private characterTree(character: SkillTreeCharacterView): string {
    const { tree, state } = character;
    return `<main class="skill-tree-main">
      <section class="skill-identity-card">
        <div><span>Character Identity</span><h2>${tree.identityTitle}</h2><p>${tree.identitySummary}</p><strong>${tree.combatStyle}</strong></div>
        <div class="skill-point-card"><small>Available</small><b>${state.availableSkillPoints}</b><span>${state.spentSkillPoints} spent · ${state.earnedSkillPoints} earned</span></div>
        <ul>${tree.strengths.map(strength => `<li>${strength}</li>`).join('')}</ul>
      </section>
      <section class="skill-loadout-panel">
        <div><span>Combat Loadout</span><h2>Equipped Skills</h2><p>Assign unlocked active abilities to slots 1–4. Only one ultimate can be equipped at a time.</p></div>
        <div class="skill-loadout-slots">
          ${([1, 2, 3, 4] as const).map(slot => {
            const assigned = state.skillSlotNodeIds?.[slot] ?? '';
            return `<label><span>Slot ${slot}</span><select data-action="assign" data-character-id="${character.id}" data-slot="${slot}"><option value="">Unassigned</option>${character.abilities.map(ability => `<option value="${ability.id}" ${assigned === ability.id ? 'selected' : ''}>${ability.name}${ability.ultimate ? ' · Ultimate' : ''}</option>`).join('')}</select></label>`;
          }).join('')}
        </div>
      </section>
      <section class="skill-path-summary">
        ${(tree.paths ?? []).map(path => `<article class="branch-${path.branch}"><strong>${path.name}</strong><span>${state.pathPoints[path.id] ?? 0} points spent</span><small>${path.summary}</small></article>`).join('')}
      </section>
      ${state.disconnectedUnlockedNodeIds.length ? `<div class="skill-tree-warning">Legacy migration: ${state.disconnectedUnlockedNodeIds.length} unlocked node${state.disconnectedUnlockedNodeIds.length === 1 ? '' : 's'} no longer connect to the current constellation. They remain learned, but new unlocks must follow the graph.</div>` : ''}
      <section class="skill-node-grid">
        ${tree.nodes.map(node => {
          const unlocked = state.unlockedNodeIds.includes(node.id);
          const available = state.availableNodeIds.includes(node.id);
          const status = unlocked ? 'unlocked' : available ? 'available' : 'locked';
          const requirement = unlocked ? 'Unlocked' : state.blockedNodeReasons[node.id] ?? 'Available';
          const pathPoints = node.pathId ? state.pathPoints[node.pathId] ?? 0 : 0;
          const role = node.isUltimate ? 'ultimate' : node.role ?? node.kind;
          return `<article class="skill-node ${status} branch-${node.branch} role-${role}"><div class="skill-node-tier">Ring ${node.ring ?? node.tier} · ${role} · ${node.cost} point${node.cost === 1 ? '' : 's'}</div><h3>${node.name}</h3><p>${node.description}</p>${node.pathPointsRequired ? `<small>${pathPoints}/${node.pathPointsRequired} path points</small>` : ''}<small>${requirement}</small>${unlocked ? '<b>✓ Learned</b>' : `<button type="button" data-action="unlock" data-character-id="${character.id}" data-node-id="${node.id}" ${available ? '' : 'disabled'}>Unlock · ${node.cost}</button>`}</article>`;
        }).join('')}
      </section>
    </main>`;
  }

  private onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    if (action === 'close') this.actions.close();
    if (action === 'select' && button.dataset.characterId) {
      this.selectedCharacterId = button.dataset.characterId;
      this.actions.selectCharacter?.(this.selectedCharacterId);
      this.draw();
    }
    if (action === 'unlock' && button.dataset.characterId && button.dataset.nodeId) this.actions.unlock(button.dataset.characterId, button.dataset.nodeId);
  };

  private onChange = (event: Event): void => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>('select[data-action="assign"]');
    if (!select?.dataset.characterId || !select.dataset.slot) return;
    this.actions.assign(select.dataset.characterId, Number(select.dataset.slot) as 1 | 2 | 3 | 4, select.value || null);
  };
}

