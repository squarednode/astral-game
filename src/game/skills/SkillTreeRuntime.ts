import type { CharacterSkillTreeDefinition, CharacterSkillSnapshot, SkillPassiveModifier, SkillTreeSerializedState } from './SkillTreeTypes';

const passiveKeys: readonly (keyof SkillPassiveModifier)[] = [
  'maximumHealth', 'attack', 'armor', 'movementSpeed', 'attackSpeedPercent',
  'dodgeCooldownPercent', 'projectileDamagePercent', 'meleeDamagePercent',
  'cooldownRatePercent', 'staggerPower', 'staggerResistance',
];

export class SkillTreeRuntime {
  private readonly trees = new Map<string, CharacterSkillTreeDefinition>();
  private readonly unlocked = new Map<string, Set<string>>();
  private readonly slots = new Map<string, Partial<Record<1 | 2 | 3 | 4, string>>>();
  private readonly listeners = new Set<() => void>();

  constructor(definitions: readonly CharacterSkillTreeDefinition[], private readonly levelFor: (characterId: string) => number) {
    definitions.forEach(tree => {
      this.trees.set(tree.characterId, tree);
      this.unlocked.set(tree.characterId, new Set());
      this.slots.set(tree.characterId, {});
    });
  }

  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  definition(characterId: string): CharacterSkillTreeDefinition | undefined { return this.trees.get(characterId); }
  definitions(): readonly CharacterSkillTreeDefinition[] { return [...this.trees.values()]; }

  snapshot(characterId: string): CharacterSkillSnapshot | null {
    const tree = this.trees.get(characterId);
    if (!tree) return null;
    const level = Math.max(1, this.levelFor(characterId));
    const unlockedNodeIds = [...(this.unlocked.get(characterId) ?? [])];
    const learnedNodes = tree.nodes.filter(node => unlockedNodeIds.includes(node.id));
    const spentSkillPoints = learnedNodes.reduce((sum, node) => sum + node.cost, 0);
    const earnedSkillPoints = Math.max(0, level - 1);
    const passiveModifiers: SkillPassiveModifier = {};
    for (const learned of learnedNodes) {
      for (const key of passiveKeys) {
        const value = learned.passiveModifier?.[key];
        if (value !== undefined) passiveModifiers[key] = (passiveModifiers[key] ?? 0) + value;
      }
    }
    return {
      characterId,
      level,
      earnedSkillPoints,
      spentSkillPoints,
      availableSkillPoints: Math.max(0, earnedSkillPoints - spentSkillPoints),
      unlockedNodeIds,
      unlockedAbilityIds: learnedNodes.filter(node => node.kind === 'active' && node.abilityId).map(node => node.abilityId!),
      passiveModifiers,
      skillSlots: { ...(this.slots.get(characterId) ?? {}) },
    };
  }

  canUnlock(characterId: string, nodeId: string): boolean {
    const tree = this.trees.get(characterId);
    const state = this.snapshot(characterId);
    const node = tree?.nodes.find(candidate => candidate.id === nodeId);
    if (!tree || !state || !node || state.unlockedNodeIds.includes(nodeId)) return false;
    return state.level >= node.minimumLevel && state.availableSkillPoints >= node.cost && node.prerequisiteNodeIds.every(id => state.unlockedNodeIds.includes(id));
  }

  unlock(characterId: string, nodeId: string): boolean {
    if (!this.canUnlock(characterId, nodeId)) return false;
    this.unlocked.get(characterId)!.add(nodeId);
    this.changed();
    return true;
  }

  assign(characterId: string, slot: 1 | 2 | 3 | 4, abilityId: string | null): boolean {
    const state = this.snapshot(characterId);
    if (!state || (abilityId && !state.unlockedAbilityIds.includes(abilityId))) return false;
    const slots = this.slots.get(characterId)!;
    for (const key of [1, 2, 3, 4] as const) if (slots[key] === abilityId) delete slots[key];
    if (abilityId) slots[slot] = abilityId; else delete slots[slot];
    this.changed();
    return true;
  }

  reset(characterId: string): void {
    this.unlocked.get(characterId)?.clear();
    this.slots.set(characterId, {});
    this.changed();
  }

  unlockAllAvailable(characterId: string): number {
    let unlockedCount = 0;
    let changed = true;
    while (changed) {
      changed = false;
      const tree = this.trees.get(characterId);
      if (!tree) break;
      for (const node of tree.nodes) {
        if (this.canUnlock(characterId, node.id)) {
          this.unlocked.get(characterId)!.add(node.id);
          unlockedCount += 1;
          changed = true;
        }
      }
    }
    if (unlockedCount > 0) this.changed();
    return unlockedCount;
  }

  serialize(): SkillTreeSerializedState {
    return { version: 1, characters: Object.fromEntries([...this.trees.keys()].map(id => [id, { unlockedNodeIds: [...(this.unlocked.get(id) ?? [])], skillSlots: { ...(this.slots.get(id) ?? {}) } }])) };
  }

  deserialize(state: SkillTreeSerializedState): void {
    if (state.version !== 1) return;
    for (const [characterId, saved] of Object.entries(state.characters)) {
      const tree = this.trees.get(characterId);
      if (!tree) continue;
      const validNodes = new Set(tree.nodes.map(node => node.id));
      const unlockedNodes = new Set(saved.unlockedNodeIds.filter(id => validNodes.has(id)));
      const unlockedAbilities = new Set(tree.nodes.filter(node => unlockedNodes.has(node.id) && node.kind === 'active' && node.abilityId).map(node => node.abilityId!));
      const validSlots: Partial<Record<1 | 2 | 3 | 4, string>> = {};
      for (const slot of [1, 2, 3, 4] as const) {
        const abilityId = saved.skillSlots[slot];
        if (abilityId && unlockedAbilities.has(abilityId)) validSlots[slot] = abilityId;
      }
      this.unlocked.set(characterId, unlockedNodes);
      this.slots.set(characterId, validSlots);
    }
    this.changed();
  }

  private changed(): void { this.listeners.forEach(listener => listener()); }
}
