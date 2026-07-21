import type { CharacterSkillSnapshot, CharacterSkillTreeDefinition } from '../../game/skills';

export interface SkillTreeCharacterView {
  id: string;
  name: string;
  role: string;
  rosterStatus: 'active' | 'reserve';
  tree: CharacterSkillTreeDefinition;
  state: CharacterSkillSnapshot;
}

export interface SkillTreeScreenActions {
  close(): void;
  unlock(characterId: string, nodeId: string): void;
  selectCharacter?(characterId: string): void;
}

export class SkillTreeScreen {
  private characters: readonly SkillTreeCharacterView[] = [];
  private selectedCharacterId: string | null = null;

  constructor(private readonly host: HTMLDivElement, private readonly actions: SkillTreeScreenActions) {
    host.classList.add('skill-tree-host', 'hidden');
    host.addEventListener('click', this.onClick);
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
    this.host.parentElement?.classList.remove('ui-layer--interactive');
  }

  private draw(): void {
    const selected = this.characters.find(character => character.id === this.selectedCharacterId);
    this.host.innerHTML = `
      <div class="skill-tree-shell">
        <header class="skill-tree-header">
          <div><span>Character Progression</span><h1>Skill Tree</h1><p>Unlock abilities here, then assign them to combat slots in Party Management.</p></div>
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
      <section class="skill-node-grid">
        ${tree.nodes.map(node => {
          const unlocked = state.unlockedNodeIds.includes(node.id);
          const prerequisitesMet = node.prerequisiteNodeIds.every(id => state.unlockedNodeIds.includes(id));
          const available = !unlocked && state.level >= node.minimumLevel && state.availableSkillPoints >= node.cost && prerequisitesMet;
          const status = unlocked ? 'unlocked' : available ? 'available' : 'locked';
          const requirement = unlocked ? 'Unlocked' : state.level < node.minimumLevel ? `Requires level ${node.minimumLevel}` : !prerequisitesMet ? 'Requires prior node' : state.availableSkillPoints < node.cost ? `Requires ${node.cost} point` : 'Available';
          return `<article class="skill-node ${status} branch-${node.branch}"><div class="skill-node-tier">Tier ${node.tier} · ${node.branch}</div><h3>${node.name}</h3><p>${node.description}</p><small>${requirement}</small>${unlocked ? '<b>✓ Learned</b>' : `<button type="button" data-action="unlock" data-character-id="${character.id}" data-node-id="${node.id}" ${available ? '' : 'disabled'}>Unlock · ${node.cost}</button>`}</article>`;
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
}
