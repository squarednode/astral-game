import type {
  CharacterSkillSnapshot,
  CharacterSkillTreeDefinition,
  SkillNodeDefinition,
  SkillPassiveModifier,
} from '../../game/skills';

export interface SkillTreeAbilityView {
  id: string;
  abilityId: string;
  name: string;
  ultimate?: boolean;
}

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

type SkillSlot = 1 | 2 | 3 | 4;
type NodeVisualState = 'unlocked' | 'available' | 'unaffordable' | 'locked';

interface NodePoint {
  x: number;
  y: number;
}

const slots: readonly SkillSlot[] = [1, 2, 3, 4];
const ringNodeCounts: Readonly<Record<1 | 2 | 3 | 4, number>> = { 1: 3, 2: 6, 3: 9, 4: 12 };
const ringRadii: Readonly<Record<1 | 2 | 3 | 4, number>> = { 1: 145, 2: 245, 3: 345, 4: 445 };
const branchLabels: Readonly<Record<SkillNodeDefinition['branch'], string>> = {
  assault: 'Path I',
  control: 'Path II',
  survival: 'Path III',
};

export class SkillTreeScreen {
  private characters: readonly SkillTreeCharacterView[] = [];
  private selectedCharacterId: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedSlot: SkillSlot = 1;
  private pendingUnlockNodeId: string | null = null;
  private hoverNodeId: string | null = null;

  constructor(private readonly host: HTMLDivElement, private readonly actions: SkillTreeScreenActions) {
    host.classList.add('skill-tree-host', 'hidden');
    host.addEventListener('click', this.onClick);
    host.addEventListener('mousemove', this.onMouseMove);
    host.addEventListener('mouseover', this.onMouseOver);
    host.addEventListener('mouseout', this.onMouseOut);
    document.addEventListener('keydown', this.onKeyDown);
  }

  setOpen(open: boolean): void {
    this.host.classList.toggle('hidden', !open);
    this.host.parentElement?.classList.toggle('ui-layer--interactive', open);
    if (!open) {
      this.selectedNodeId = null;
      this.pendingUnlockNodeId = null;
      this.hoverNodeId = null;
    }
  }

  isOpen(): boolean {
    return !this.host.classList.contains('hidden');
  }

  render(characters: readonly SkillTreeCharacterView[], preferredCharacterId?: string): void {
    this.characters = characters;
    if (preferredCharacterId && characters.some(character => character.id === preferredCharacterId)) {
      this.selectedCharacterId = preferredCharacterId;
    }
    if (!this.selectedCharacterId || !characters.some(character => character.id === this.selectedCharacterId)) {
      this.selectedCharacterId = characters[0]?.id ?? null;
    }
    const selected = this.selectedCharacter();
    if (this.selectedNodeId && !selected?.tree.nodes.some(node => node.id === this.selectedNodeId)) {
      this.selectedNodeId = null;
    }
    this.draw();
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('mousemove', this.onMouseMove);
    this.host.removeEventListener('mouseover', this.onMouseOver);
    this.host.removeEventListener('mouseout', this.onMouseOut);
    document.removeEventListener('keydown', this.onKeyDown);
    this.host.parentElement?.classList.remove('ui-layer--interactive');
  }

  private selectedCharacter(): SkillTreeCharacterView | undefined {
    return this.characters.find(character => character.id === this.selectedCharacterId);
  }

  private draw(): void {
    const selected = this.selectedCharacter();
    this.host.innerHTML = `
      <div class="skill-tree-shell">
        <header class="skill-tree-header">
          <div class="skill-tree-title">
            <span>Character Progression</span>
            <h1>Constellation</h1>
          </div>
          <div class="skill-tree-header-actions">
            <span class="skill-tree-help">Hover to preview · Click to inspect · Esc to close</span>
            <button type="button" class="skill-tree-close" data-action="close" aria-label="Close skill tree">×</button>
          </div>
        </header>
        <div class="skill-tree-layout">
          <aside class="skill-character-sidebar">
            <div class="skill-sidebar-heading"><span>Roster</span><small>${this.characters.length} unlocked</small></div>
            <nav class="skill-character-list" aria-label="Unlocked characters">
              ${this.characters.map(character => this.characterButton(character, selected?.id)).join('')}
            </nav>
          </aside>
          ${selected ? this.characterTree(selected) : '<div class="skill-tree-empty">No unlocked characters.</div>'}
        </div>
        <div class="skill-hover-card" data-hover-card hidden></div>
        ${this.pendingUnlockNodeId && selected ? this.unlockConfirmation(selected, this.pendingUnlockNodeId) : ''}
      </div>`;
  }

  private characterButton(character: SkillTreeCharacterView, selectedId?: string): string {
    const initial = character.name.trim().charAt(0).toUpperCase();
    return `<button type="button" class="skill-character-button ${character.id === selectedId ? 'selected' : ''}" data-action="select-character" data-character-id="${this.escape(character.id)}">
      <span class="skill-character-avatar branch-${character.tree.paths?.[0]?.branch ?? 'assault'}">${this.escape(initial)}</span>
      <span class="skill-character-copy">
        <strong>${this.escape(character.name)}</strong>
        <span>${this.escape(character.tree.identityTitle)}</span>
        <small>Level ${character.state.level} · ${character.rosterStatus}</small>
      </span>
      <b>${character.state.availableSkillPoints}</b>
    </button>`;
  }

  private characterTree(character: SkillTreeCharacterView): string {
    const { tree, state } = character;
    return `<main class="skill-tree-main">
      <section class="skill-loadout-panel">
        <div class="skill-selected-character">
          <span>Selected Character</span>
          <h2>${this.escape(character.name)} <small>— ${this.escape(tree.identityTitle)}</small></h2>
          <p>Level ${state.level} · <strong>${state.availableSkillPoints}</strong> skill point${state.availableSkillPoints === 1 ? '' : 's'} available</p>
        </div>
        <div class="skill-loadout-slots" aria-label="Equipped skill slots">
          ${slots.map(slot => this.loadoutSlot(character, slot)).join('')}
        </div>
      </section>
      <section class="skill-constellation-workspace">
        <div class="skill-path-key">
          ${(tree.paths ?? []).map(path => `<div class="branch-${path.branch}"><i></i><span><strong>${this.escape(path.name)}</strong><small>${state.pathPoints[path.id] ?? 0} invested</small></span></div>`).join('')}
        </div>
        <div class="skill-constellation-stage" aria-label="${this.escape(character.name)} skill constellation">
          ${this.constellation(character)}
        </div>
        <aside class="skill-inspector ${this.selectedNodeId ? 'pinned' : ''}">
          ${this.selectedNodeId ? this.nodeInspector(character, this.selectedNodeId) : this.inspectorEmpty(character)}
        </aside>
      </section>
    </main>`;
  }

  private loadoutSlot(character: SkillTreeCharacterView, slot: SkillSlot): string {
    const nodeId = character.state.skillSlotNodeIds?.[slot];
    const node = nodeId ? character.tree.nodes.find(candidate => candidate.id === nodeId) : undefined;
    return `<button type="button" class="skill-loadout-slot ${slot === this.selectedSlot ? 'selected' : ''} ${node?.isUltimate ? 'ultimate' : ''}" data-action="select-slot" data-slot="${slot}">
      <span class="skill-slot-number">${slot}</span>
      <span class="skill-slot-icon ${node ? `branch-${node.branch}` : ''}">${node ? this.nodeGlyph(node) : '+'}</span>
      <span class="skill-slot-copy"><small>${node?.isUltimate ? 'Ultimate' : `Skill ${slot}`}</small><strong>${this.escape(node?.name ?? 'Empty Slot')}</strong></span>
      ${node ? '<i>Equipped</i>' : '<i>Select a learned skill</i>'}
    </button>`;
  }

  private constellation(character: SkillTreeCharacterView): string {
    const positions = new Map<string, NodePoint>();
    for (const node of character.tree.nodes) positions.set(node.id, this.nodePosition(node));
    const lines = character.tree.nodes.flatMap(node => {
      const target = positions.get(node.id);
      if (!target) return [];
      const sourceIds = node.ring === 1 ? ['__core__'] : (node.connectedNodeIds ?? node.prerequisiteNodeIds);
      return sourceIds.map(sourceId => {
        const source = sourceId === '__core__' ? { x: 500, y: 500 } : positions.get(sourceId);
        if (!source) return '';
        const sourceUnlocked = sourceId === '__core__' || character.state.unlockedNodeIds.includes(sourceId);
        const targetUnlocked = character.state.unlockedNodeIds.includes(node.id);
        const targetAvailable = character.state.availableNodeIds.includes(node.id);
        const lineState = sourceUnlocked && targetUnlocked ? 'unlocked' : sourceUnlocked && targetAvailable ? 'available' : 'locked';
        return `<line class="skill-link branch-${node.branch} ${lineState}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
      });
    }).join('');

    return `<div class="skill-constellation-canvas">
      <svg class="skill-constellation-links" viewBox="0 0 1000 1000" aria-hidden="true">
        <circle class="skill-ring-guide ring-1" cx="500" cy="500" r="145" />
        <circle class="skill-ring-guide ring-2" cx="500" cy="500" r="245" />
        <circle class="skill-ring-guide ring-3" cx="500" cy="500" r="345" />
        <circle class="skill-ring-guide ring-4" cx="500" cy="500" r="445" />
        ${lines}
      </svg>
      <button type="button" class="skill-core-node" data-action="inspect-core">
        <span>${this.escape(character.name.charAt(0))}</span><strong>${this.escape(character.tree.identityTitle)}</strong><small>Core</small>
      </button>
      ${character.tree.nodes.map(node => this.constellationNode(character, node, positions.get(node.id)!)).join('')}
    </div>`;
  }

  private constellationNode(character: SkillTreeCharacterView, node: SkillNodeDefinition, point: NodePoint): string {
    const state = this.nodeState(character, node);
    const selected = node.id === this.selectedNodeId;
    const equippedSlot = slots.find(slot => character.state.skillSlotNodeIds?.[slot] === node.id);
    const style = `left:${(point.x / 10).toFixed(2)}%;top:${(point.y / 10).toFixed(2)}%`;
    return `<button type="button" class="skill-constellation-node branch-${node.branch} state-${state} role-${node.role ?? node.kind} ${node.isUltimate ? 'ultimate' : ''} ${selected ? 'selected' : ''}" style="${style}" data-action="inspect-node" data-node-id="${this.escape(node.id)}" aria-label="${this.escape(node.name)}">
      <span class="skill-node-glyph">${this.nodeGlyph(node)}</span>
      <small>${node.cost}</small>
      ${equippedSlot ? `<b>${equippedSlot}</b>` : ''}
    </button>`;
  }

  private nodePosition(node: SkillNodeDefinition): NodePoint {
    const ring = node.ring ?? Math.min(4, Math.max(1, node.tier)) as 1 | 2 | 3 | 4;
    const count = ringNodeCounts[ring];
    const sector = ((node.sector ?? 0) % count + count) % count;
    const angle = (-90 + sector * (360 / count)) * Math.PI / 180;
    const radius = ringRadii[ring];
    return { x: 500 + Math.cos(angle) * radius, y: 500 + Math.sin(angle) * radius };
  }

  private nodeState(character: SkillTreeCharacterView, node: SkillNodeDefinition): NodeVisualState {
    if (character.state.unlockedNodeIds.includes(node.id)) return 'unlocked';
    if (character.state.availableNodeIds.includes(node.id)) return 'available';
    const reason = character.state.blockedNodeReasons[node.id] ?? '';
    return reason.includes('skill point') ? 'unaffordable' : 'locked';
  }

  private inspectorEmpty(character: SkillTreeCharacterView): string {
    return `<div class="skill-inspector-empty">
      <span>Constellation Overview</span>
      <h3>${this.escape(character.tree.identityTitle)}</h3>
      <p>${this.escape(character.tree.identitySummary)}</p>
      <strong>${this.escape(character.tree.combatStyle)}</strong>
      <ul>${character.tree.strengths.map(strength => `<li>${this.escape(strength)}</li>`).join('')}</ul>
      <small>Hover over a node for a quick preview. Click a node to pin its full details.</small>
    </div>`;
  }

  private nodeInspector(character: SkillTreeCharacterView, nodeId: string): string {
    const node = character.tree.nodes.find(candidate => candidate.id === nodeId);
    if (!node) return this.inspectorEmpty(character);
    const state = this.nodeState(character, node);
    const reason = character.state.unlockedNodeIds.includes(node.id)
      ? 'Unlocked'
      : character.state.blockedNodeReasons[node.id] ?? 'Available';
    const path = character.tree.paths?.find(candidate => candidate.id === node.pathId);
    const equippedSlot = slots.find(slot => character.state.skillSlotNodeIds?.[slot] === node.id);
    const effects = this.effectLines(node);
    return `<div class="skill-inspector-card branch-${node.branch}">
      <div class="skill-inspector-title-row">
        <div><span>${this.escape(path?.name ?? branchLabels[node.branch])} · Ring ${node.ring ?? node.tier}</span><h3>${this.escape(node.name)}</h3></div>
        <button type="button" data-action="unpin" aria-label="Close node details">×</button>
      </div>
      <div class="skill-node-tags"><b>${this.escape(this.roleLabel(node))}</b><b>${node.cost} point${node.cost === 1 ? '' : 's'}</b>${node.isUltimate ? '<b>One ultimate equipped</b>' : ''}</div>
      <p>${this.escape(node.description)}</p>
      ${effects.length ? `<div class="skill-effect-list"><strong>Effects</strong>${effects.map(effect => `<span>${this.escape(effect)}</span>`).join('')}</div>` : ''}
      <div class="skill-requirements"><strong>Requirements</strong>${this.requirementLines(character, node, reason).map(line => `<span>${this.escape(line)}</span>`).join('')}</div>
      <div class="skill-node-status status-${state}">${this.escape(reason)}</div>
      ${this.inspectorActions(character, node, equippedSlot)}
    </div>`;
  }

  private inspectorActions(character: SkillTreeCharacterView, node: SkillNodeDefinition, equippedSlot?: SkillSlot): string {
    const unlocked = character.state.unlockedNodeIds.includes(node.id);
    if (!unlocked) {
      const available = character.state.availableNodeIds.includes(node.id);
      return `<button type="button" class="skill-primary-action" data-action="request-unlock" data-node-id="${this.escape(node.id)}" ${available ? '' : 'disabled'}>Unlock for ${node.cost} point${node.cost === 1 ? '' : 's'}</button>`;
    }
    if (node.kind !== 'active' || !node.abilityId) return '<div class="skill-learned-label">✓ Passive effect active</div>';
    return `<div class="skill-equip-actions"><span>${equippedSlot ? `Equipped in slot ${equippedSlot}` : `Equip to selected slot ${this.selectedSlot}`}</span><div>${slots.map(slot => `<button type="button" class="${slot === equippedSlot ? 'equipped' : ''}" data-action="equip-node" data-node-id="${this.escape(node.id)}" data-slot="${slot}">${slot}</button>`).join('')}</div>${equippedSlot ? `<button type="button" class="skill-clear-action" data-action="clear-slot" data-slot="${equippedSlot}">Unequip</button>` : ''}</div>`;
  }

  private unlockConfirmation(character: SkillTreeCharacterView, nodeId: string): string {
    const node = character.tree.nodes.find(candidate => candidate.id === nodeId);
    if (!node) return '';
    const remaining = Math.max(0, character.state.availableSkillPoints - node.cost);
    return `<div class="skill-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="skill-confirm-title">
      <div class="skill-confirm-modal branch-${node.branch}">
        <span>Confirm Unlock</span>
        <h2 id="skill-confirm-title">Unlock ${this.escape(node.name)}?</h2>
        <p>${this.escape(node.description)}</p>
        <div><strong>Cost</strong><b>${node.cost} skill point${node.cost === 1 ? '' : 's'}</b></div>
        <div><strong>Remaining</strong><b>${remaining} skill point${remaining === 1 ? '' : 's'}</b></div>
        <small>This choice cannot currently be refunded.</small>
        <footer><button type="button" data-action="cancel-unlock">Cancel</button><button type="button" class="confirm" data-action="confirm-unlock" data-node-id="${this.escape(node.id)}">Confirm Unlock</button></footer>
      </div>
    </div>`;
  }

  private hoverCard(character: SkillTreeCharacterView, node: SkillNodeDefinition): string {
    const state = this.nodeState(character, node);
    const reason = character.state.unlockedNodeIds.includes(node.id) ? 'Unlocked' : character.state.blockedNodeReasons[node.id] ?? 'Available';
    const path = character.tree.paths?.find(candidate => candidate.id === node.pathId);
    return `<span>${this.escape(path?.name ?? branchLabels[node.branch])} · Ring ${node.ring ?? node.tier} · ${this.escape(this.roleLabel(node))}</span><h3>${this.escape(node.name)}</h3><p>${this.escape(node.description)}</p><div><b>${node.cost} point${node.cost === 1 ? '' : 's'}</b><strong class="status-${state}">${this.escape(reason)}</strong></div><small>Click to inspect</small>`;
  }

  private requirementLines(character: SkillTreeCharacterView, node: SkillNodeDefinition, reason: string): string[] {
    const result = [`Level ${node.minimumLevel}`];
    if (node.pathPointsRequired) {
      const current = node.pathId ? character.state.pathPoints[node.pathId] ?? 0 : 0;
      result.push(`${current}/${node.pathPointsRequired} points invested in this path`);
    }
    if (node.prerequisiteNodeIds.length) {
      const names = node.prerequisiteNodeIds.map(id => character.tree.nodes.find(candidate => candidate.id === id)?.name ?? id);
      result.push(`${node.isUltimate ? 'Requires all' : 'Connected from'}: ${names.join(node.isUltimate ? ' and ' : ' or ')}`);
    }
    if (!['Available', 'Unlocked'].includes(reason)) result.push(reason);
    return [...new Set(result)];
  }

  private effectLines(node: SkillNodeDefinition): string[] {
    const lines: string[] = [];
    if (node.kind === 'active') lines.push(node.isUltimate ? 'Equippable ultimate skill' : 'Equippable active skill');
    if (node.kind === 'upgrade') lines.push('Modifies an existing combat action');
    const modifierLabels: Readonly<Record<keyof SkillPassiveModifier, string>> = {
      maximumHealth: 'Maximum health',
      attack: 'Attack power',
      armor: 'Armor',
      movementSpeed: 'Movement speed',
      attackSpeedPercent: 'Attack speed',
      dodgeCooldownPercent: 'Dodge recovery',
      projectileDamagePercent: 'Projectile damage',
      meleeDamagePercent: 'Melee damage',
      cooldownRatePercent: 'Skill recovery',
      staggerPower: 'Stagger power',
      staggerResistance: 'Stagger resistance',
    };
    for (const [key, value] of Object.entries(node.passiveModifier ?? {})) {
      const label = modifierLabels[key as keyof SkillPassiveModifier] ?? key;
      const numeric = Number(value);
      const display = Math.abs(numeric) < 1 ? `${numeric >= 0 ? '+' : ''}${Math.round(numeric * 100)}%` : `${numeric >= 0 ? '+' : ''}${numeric}`;
      lines.push(`${label} ${display}`);
    }
    return lines;
  }

  private roleLabel(node: SkillNodeDefinition): string {
    if (node.isUltimate) return 'Ultimate';
    if (node.role === 'advanced-skill') return 'Advanced Skill';
    if (node.role === 'standard-skill') return 'Active Skill';
    if (node.kind === 'upgrade') return 'Skill Upgrade';
    return 'Passive Support';
  }

  private nodeGlyph(node: SkillNodeDefinition): string {
    if (node.isUltimate) return '✦';
    if (node.kind === 'active') return '◆';
    if (node.kind === 'upgrade') return '▲';
    return '●';
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const action = target.dataset.action;
    if (action === 'close') this.actions.close();
    if (action === 'select-character' && target.dataset.characterId) {
      this.selectedCharacterId = target.dataset.characterId;
      this.selectedNodeId = null;
      this.pendingUnlockNodeId = null;
      this.actions.selectCharacter?.(this.selectedCharacterId);
      this.draw();
    }
    if (action === 'select-slot' && target.dataset.slot) {
      this.selectedSlot = Number(target.dataset.slot) as SkillSlot;
      this.draw();
    }
    if (action === 'inspect-core') {
      this.selectedNodeId = null;
      this.draw();
    }
    if (action === 'inspect-node' && target.dataset.nodeId) {
      this.selectedNodeId = target.dataset.nodeId;
      this.draw();
    }
    if (action === 'unpin') {
      this.selectedNodeId = null;
      this.draw();
    }
    if (action === 'request-unlock' && target.dataset.nodeId) {
      this.pendingUnlockNodeId = target.dataset.nodeId;
      this.draw();
    }
    if (action === 'cancel-unlock') {
      this.pendingUnlockNodeId = null;
      this.draw();
    }
    if (action === 'confirm-unlock' && target.dataset.nodeId && this.selectedCharacterId) {
      const characterId = this.selectedCharacterId;
      const nodeId = target.dataset.nodeId;
      this.pendingUnlockNodeId = null;
      this.actions.unlock(characterId, nodeId);
    }
    if (action === 'equip-node' && target.dataset.nodeId && target.dataset.slot && this.selectedCharacterId) {
      this.selectedSlot = Number(target.dataset.slot) as SkillSlot;
      this.actions.assign(this.selectedCharacterId, this.selectedSlot, target.dataset.nodeId);
    }
    if (action === 'clear-slot' && target.dataset.slot && this.selectedCharacterId) {
      this.actions.assign(this.selectedCharacterId, Number(target.dataset.slot) as SkillSlot, null);
    }
  };

  private onMouseOver = (event: MouseEvent): void => {
    const nodeButton = (event.target as HTMLElement).closest<HTMLElement>('[data-action="inspect-node"]');
    if (!nodeButton?.dataset.nodeId || this.pendingUnlockNodeId) return;
    this.hoverNodeId = nodeButton.dataset.nodeId;
    const character = this.selectedCharacter();
    const node = character?.tree.nodes.find(candidate => candidate.id === this.hoverNodeId);
    const card = this.host.querySelector<HTMLElement>('[data-hover-card]');
    if (!character || !node || !card) return;
    card.innerHTML = this.hoverCard(character, node);
    card.hidden = false;
    this.positionHoverCard(card, event.clientX, event.clientY);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.hoverNodeId) return;
    const card = this.host.querySelector<HTMLElement>('[data-hover-card]');
    if (card && !card.hidden) this.positionHoverCard(card, event.clientX, event.clientY);
  };

  private onMouseOut = (event: MouseEvent): void => {
    const nodeButton = (event.target as HTMLElement).closest<HTMLElement>('[data-action="inspect-node"]');
    if (!nodeButton) return;
    const related = event.relatedTarget as Node | null;
    if (related && nodeButton.contains(related)) return;
    this.hoverNodeId = null;
    const card = this.host.querySelector<HTMLElement>('[data-hover-card]');
    if (card) card.hidden = true;
  };

  private positionHoverCard(card: HTMLElement, clientX: number, clientY: number): void {
    const width = 310;
    const height = 220;
    const x = Math.min(window.innerWidth - width - 18, Math.max(18, clientX + 22));
    const y = Math.min(window.innerHeight - height - 18, Math.max(18, clientY + 18));
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isOpen()) return;
    if (event.key >= '1' && event.key <= '4') {
      this.selectedSlot = Number(event.key) as SkillSlot;
      this.draw();
      return;
    }
    if (event.key === 'Escape') {
      if (this.pendingUnlockNodeId) {
        this.pendingUnlockNodeId = null;
        this.draw();
      } else if (this.selectedNodeId) {
        this.selectedNodeId = null;
        this.draw();
      } else {
        this.actions.close();
      }
      return;
    }
    if (event.key === 'Enter' && this.selectedNodeId) {
      const character = this.selectedCharacter();
      if (character?.state.availableNodeIds.includes(this.selectedNodeId)) {
        this.pendingUnlockNodeId = this.selectedNodeId;
        this.draw();
      }
    }
  };
}
