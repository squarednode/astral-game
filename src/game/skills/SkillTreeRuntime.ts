import type {
  CharacterSkillTreeDefinition,
  CharacterSkillSnapshot,
  SkillNodeDefinition,
  SkillNodeEligibility,
  SkillPassiveModifier,
  SkillTreeSerializedState,
  SkillAbilityModifierProfile,
} from './SkillTreeTypes';

const passiveKeys: readonly (keyof SkillPassiveModifier)[] = [
  'maximumHealth', 'attack', 'armor', 'movementSpeed', 'attackSpeedPercent',
  'dodgeCooldownPercent', 'projectileDamagePercent', 'meleeDamagePercent',
  'cooldownRatePercent', 'staggerPower', 'staggerResistance',
  'abilityDamagePercent', 'statusDurationPercent', 'statusPotencyPercent',
  'shieldPowerPercent', 'healingPowerPercent', 'armorPenetration',
  'criticalChance', 'criticalDamage',
];

const slots = [1, 2, 3, 4] as const;

export class SkillTreeRuntime {
  private readonly trees = new Map<string, CharacterSkillTreeDefinition>();
  private readonly unlocked = new Map<string, Set<string>>();
  private readonly equipped = new Map<string, Partial<Record<1 | 2 | 3 | 4, string>>>();
  private readonly equippedNodes = new Map<string, Partial<Record<1 | 2 | 3 | 4, string>>>();
  private readonly listeners = new Set<() => void>();

  constructor(definitions: readonly CharacterSkillTreeDefinition[], private readonly levelFor: (characterId: string) => number) {
    definitions.forEach(tree => {
      this.trees.set(tree.characterId, tree);
      this.unlocked.set(tree.characterId, new Set());
      this.equipped.set(tree.characterId, {});
      this.equippedNodes.set(tree.characterId, {});
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
    const pathPoints = this.calculatePathPoints(tree, learnedNodes);
    const availableSkillPoints = Math.max(0, earnedSkillPoints - spentSkillPoints);
    const availableNodeIds: string[] = [];
    const blockedNodeReasons: Record<string, string> = {};
    for (const node of tree.nodes) {
      if (unlockedNodeIds.includes(node.id)) continue;
      const eligibility = this.eligibilityFor(tree, node, level, availableSkillPoints, new Set(unlockedNodeIds), pathPoints);
      if (eligibility.canUnlock) availableNodeIds.push(node.id);
      else blockedNodeReasons[node.id] = eligibility.reason;
    }
    const disconnectedUnlockedNodeIds = this.findDisconnectedUnlockedNodes(tree, new Set(unlockedNodeIds));
    const skillSlots = { ...(this.equipped.get(characterId) ?? {}) };
    const skillSlotNodeIds = { ...(this.equippedNodes.get(characterId) ?? {}) };
    const equippedUltimateNodeId = slots.map(slot => skillSlotNodeIds[slot]).find((nodeId): nodeId is string => Boolean(nodeId && tree.nodes.find(node => node.id === nodeId)?.isUltimate)) ?? null;
    const equippedUltimateAbilityId = equippedUltimateNodeId ? tree.nodes.find(node => node.id === equippedUltimateNodeId)?.abilityId ?? null : null;
    return {
      characterId,
      level,
      earnedSkillPoints,
      spentSkillPoints,
      availableSkillPoints,
      unlockedNodeIds,
      unlockedAbilityIds: learnedNodes.filter(node => node.kind === 'active' && node.abilityId).map(node => node.abilityId!),
      passiveModifiers,
      skillSlots,
      skillSlotNodeIds,
      pathPoints,
      availableNodeIds,
      blockedNodeReasons,
      disconnectedUnlockedNodeIds,
      equippedUltimateAbilityId,
      equippedUltimateNodeId,
    };
  }

  inspectNode(characterId: string, nodeId: string): SkillNodeEligibility | null {
    const tree = this.trees.get(characterId);
    const state = this.snapshot(characterId);
    const node = tree?.nodes.find(candidate => candidate.id === nodeId);
    if (!tree || !state || !node) return null;
    if (state.unlockedNodeIds.includes(nodeId)) {
      return {
        nodeId,
        canUnlock: false,
        reason: 'Already unlocked',
        connected: true,
        prerequisitesMet: true,
        pathPoints: node.pathId ? state.pathPoints[node.pathId] ?? 0 : 0,
        pathPointsRequired: node.pathPointsRequired ?? 0,
      };
    }
    return this.eligibilityFor(tree, node, state.level, state.availableSkillPoints, new Set(state.unlockedNodeIds), state.pathPoints);
  }


  hasNode(characterId: string, nodeId: string): boolean {
    const normalized = nodeId.includes('.') ? nodeId : `${characterId}.${nodeId}`;
    return this.unlocked.get(characterId)?.has(normalized) ?? false;
  }

  abilityModifierProfile(characterId: string, abilityId: string): SkillAbilityModifierProfile {
    const tree = this.trees.get(characterId);
    const unlocked = this.unlocked.get(characterId) ?? new Set<string>();
    const activeNode = tree?.nodes.find(node => node.abilityId === abilityId);
    const upgrades = tree?.nodes.filter(node =>
      unlocked.has(node.id) && node.kind === 'upgrade' && activeNode?.pathId === node.pathId
    ) ?? [];
    let damageMultiplier = 1;
    let rangeMultiplier = 1;
    let radiusMultiplier = 1;
    let durationMultiplier = 1;
    let staggerMultiplier = 1;
    let statusDurationMultiplier = 1;
    let statusPotencyMultiplier = 1;
    let shieldMultiplier = 1;
    let healingMultiplier = 1;
    let armorPenetration = 0;
    let additionalPierce = 0;
    let additionalTargets = 0;
    for (const upgrade of upgrades) {
      const key = upgrade.id.split('.').pop() ?? '';
      damageMultiplier *= 1.08;
      if (/heavy-hand|piercing-lunge|charged-power-shot|explosive-fire-bolt/.test(key)) damageMultiplier *= 1.12;
      if (/seismic-cleave|event-horizon|explosive-fire-bolt/.test(key)) radiusMultiplier *= 1.25;
      if (/fortified-brace|burning-embers|lingering-venom|extended-control/.test(key)) durationMultiplier *= 1.3;
      if (/burning-embers|lingering-venom|deep-freeze|shattering-frost/.test(key)) statusDurationMultiplier *= 1.25;
      if (/barbed-snare|concussive-charge|shattering-frost/.test(key)) statusPotencyMultiplier *= 1.2;
      if (/relentless-charge|piercing-lunge|charged-power-shot/.test(key)) additionalPierce += 1;
      if (/double-dash|trap-network|rearming-mechanism/.test(key)) additionalTargets += 1;
      if (/barrier-pulse|fortified-brace|evasive-shot/.test(key)) shieldMultiplier *= 1.2;
      if (/evasive-shot|field-dressing/.test(key)) healingMultiplier *= 1.15;
      if (/heavy-hand|crushing-impact|concussive-charge/.test(key)) staggerMultiplier *= 1.25;
      if (/spell-penetration/.test(key)) armorPenetration += 1.5;
      if (/range|charged-power-shot|piercing-lunge/.test(key)) rangeMultiplier *= 1.15;
    }
    const passive = this.snapshot(characterId)?.passiveModifiers ?? {};
    damageMultiplier *= 1 + Math.max(0, passive.abilityDamagePercent ?? 0);
    statusDurationMultiplier *= 1 + Math.max(0, passive.statusDurationPercent ?? 0);
    statusPotencyMultiplier *= 1 + Math.max(0, passive.statusPotencyPercent ?? 0);
    shieldMultiplier *= 1 + Math.max(0, passive.shieldPowerPercent ?? 0);
    healingMultiplier *= 1 + Math.max(0, passive.healingPowerPercent ?? 0);
    armorPenetration += Math.max(0, passive.armorPenetration ?? 0);
    return { damageMultiplier, rangeMultiplier, radiusMultiplier, durationMultiplier, staggerMultiplier, statusDurationMultiplier, statusPotencyMultiplier, shieldMultiplier, healingMultiplier, armorPenetration, additionalPierce, additionalTargets, upgradeNodeIds: upgrades.map(node => node.id) };
  }

  canUnlock(characterId: string, nodeId: string): boolean {
    return this.inspectNode(characterId, nodeId)?.canUnlock ?? false;
  }

  unlock(characterId: string, nodeId: string): boolean {
    if (!this.canUnlock(characterId, nodeId)) return false;
    this.unlocked.get(characterId)!.add(nodeId);
    this.changed();
    return true;
  }

  assign(characterId: string, slot: 1 | 2 | 3 | 4, nodeOrAbilityId: string | null): boolean {
    const tree = this.trees.get(characterId);
    const state = this.snapshot(characterId);
    if (!tree || !state) return false;
    const characterSlots = this.equipped.get(characterId)!;
    const characterNodeSlots = this.equippedNodes.get(characterId)!;
    if (!nodeOrAbilityId) {
      delete characterSlots[slot];
      delete characterNodeSlots[slot];
      this.changed();
      return true;
    }
    const selectedNode = tree.nodes.find(node => node.id === nodeOrAbilityId && node.kind === 'active' && node.abilityId && state.unlockedNodeIds.includes(node.id))
      ?? tree.nodes.find(node => node.abilityId === nodeOrAbilityId && node.kind === 'active' && state.unlockedNodeIds.includes(node.id));
    if (!selectedNode?.abilityId) return false;
    for (const key of slots) {
      if (characterNodeSlots[key] === selectedNode.id) {
        delete characterSlots[key];
        delete characterNodeSlots[key];
      }
    }
    if (selectedNode.isUltimate) {
      for (const key of slots) {
        const equippedNode = tree.nodes.find(node => node.id === characterNodeSlots[key]);
        if (equippedNode?.isUltimate) {
          delete characterSlots[key];
          delete characterNodeSlots[key];
        }
      }
    }
    characterSlots[slot] = selectedNode.abilityId;
    characterNodeSlots[slot] = selectedNode.id;
    this.changed();
    return true;
  }

  reset(characterId: string): void {
    this.unlocked.get(characterId)?.clear();
    this.equipped.set(characterId, {});
    this.equippedNodes.set(characterId, {});
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
    return {
      version: 1,
      characters: Object.fromEntries([...this.trees.keys()].map(id => [id, {
        unlockedNodeIds: [...(this.unlocked.get(id) ?? [])],
        skillSlots: { ...(this.equipped.get(id) ?? {}) },
        skillSlotNodeIds: { ...(this.equippedNodes.get(id) ?? {}) },
      }])),
    };
  }

  deserialize(state: SkillTreeSerializedState): void {
    if (state.version !== 1) return;
    for (const [characterId, saved] of Object.entries(state.characters)) {
      const tree = this.trees.get(characterId);
      if (!tree) continue;

      // Rebuild saved unlocks through the current constellation rules. Invalid,
      // disconnected, over-level, and retired nodes are discarded automatically;
      // because available points are derived from level minus valid spend, every
      // discarded node is fully refunded without storing legacy state.
      const requested = new Set(saved.unlockedNodeIds);
      const unlockedNodes = new Set<string>();
      const level = Math.max(1, this.levelFor(characterId));
      let progressed = true;
      while (progressed) {
        progressed = false;
        const learned = tree.nodes.filter(node => unlockedNodes.has(node.id));
        const spent = learned.reduce((sum, node) => sum + node.cost, 0);
        const available = Math.max(0, level - 1 - spent);
        const pathPoints = this.calculatePathPoints(tree, learned);
        for (const node of tree.nodes) {
          if (!requested.has(node.id) || unlockedNodes.has(node.id)) continue;
          const eligibility = this.eligibilityFor(tree, node, level, available, unlockedNodes, pathPoints);
          if (!eligibility.canUnlock) continue;
          unlockedNodes.add(node.id);
          progressed = true;
          break;
        }
      }

      const unlockedAbilities = new Set(tree.nodes
        .filter(node => unlockedNodes.has(node.id) && node.kind === 'active' && node.abilityId)
        .map(node => node.abilityId!));
      const validSlots: Partial<Record<1 | 2 | 3 | 4, string>> = {};
      const validNodeSlots: Partial<Record<1 | 2 | 3 | 4, string>> = {};
      let restoredUltimate = false;
      for (const slot of slots) {
        const savedAbilityId = saved.skillSlots[slot];
        const savedNodeId = saved.skillSlotNodeIds?.[slot];
        const selectedNode = tree.nodes.find(node => node.id === savedNodeId && unlockedNodes.has(node.id) && node.kind === 'active' && node.abilityId)
          ?? (savedAbilityId ? tree.nodes.find(node => unlockedNodes.has(node.id) && node.kind === 'active' && node.abilityId === savedAbilityId && !node.isUltimate) : undefined)
          ?? (savedAbilityId ? tree.nodes.find(node => unlockedNodes.has(node.id) && node.kind === 'active' && node.abilityId === savedAbilityId) : undefined);
        if (!selectedNode?.abilityId || !unlockedAbilities.has(selectedNode.abilityId)) continue;
        if (selectedNode.isUltimate) {
          if (restoredUltimate) continue;
          restoredUltimate = true;
        }
        validSlots[slot] = selectedNode.abilityId;
        validNodeSlots[slot] = selectedNode.id;
      }
      this.unlocked.set(characterId, unlockedNodes);
      this.equipped.set(characterId, validSlots);
      this.equippedNodes.set(characterId, validNodeSlots);
    }
    this.changed();
  }

  private eligibilityFor(
    tree: CharacterSkillTreeDefinition,
    node: SkillNodeDefinition,
    level: number,
    availableSkillPoints: number,
    unlocked: ReadonlySet<string>,
    pathPoints: Readonly<Record<string, number>>,
  ): SkillNodeEligibility {
    const connectedIds = node.connectedNodeIds ?? node.prerequisiteNodeIds;
    const connected = node.ring === 1 || connectedIds.length === 0 || connectedIds.some(id => unlocked.has(id));
    const prerequisitesMet = node.prerequisiteNodeIds.every(id => unlocked.has(id));
    const currentPathPoints = node.pathId ? pathPoints[node.pathId] ?? 0 : 0;
    const pathPointsRequired = node.pathPointsRequired ?? 0;
    let reason = 'Available';
    if (level < node.minimumLevel) reason = `Requires level ${node.minimumLevel}`;
    else if (!connected) reason = 'Requires a connected unlocked node';
    else if (!prerequisitesMet) reason = node.isUltimate ? 'Requires both connected Ring 3 nodes' : 'Requires prior node';
    else if (currentPathPoints < pathPointsRequired) reason = `Requires ${pathPointsRequired} points in ${this.pathName(tree, node.pathId)}`;
    else if (availableSkillPoints < node.cost) reason = `Requires ${node.cost} skill points`;
    return {
      nodeId: node.id,
      canUnlock: reason === 'Available',
      reason,
      connected,
      prerequisitesMet,
      pathPoints: currentPathPoints,
      pathPointsRequired,
    };
  }

  private calculatePathPoints(tree: CharacterSkillTreeDefinition, learnedNodes: readonly SkillNodeDefinition[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const path of tree.paths ?? []) result[path.id] = 0;
    for (const learned of learnedNodes) if (learned.pathId) result[learned.pathId] = (result[learned.pathId] ?? 0) + learned.cost;
    return result;
  }

  private findDisconnectedUnlockedNodes(tree: CharacterSkillTreeDefinition, unlocked: ReadonlySet<string>): string[] {
    return tree.nodes.filter(node => {
      if (!unlocked.has(node.id) || node.ring === 1) return false;
      const connectedIds = node.connectedNodeIds ?? node.prerequisiteNodeIds;
      return connectedIds.length > 0 && !connectedIds.some(id => unlocked.has(id));
    }).map(node => node.id);
  }

  private pathName(tree: CharacterSkillTreeDefinition, pathId?: string): string {
    return tree.paths?.find(path => path.id === pathId)?.name ?? 'this path';
  }

  private changed(): void { this.listeners.forEach(listener => listener()); }
}
