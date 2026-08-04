import type { DamageElement, HitWeight } from './CombatTypes';

export type CombatDamageKind = 'basic' | 'skill' | 'ultimate' | 'status' | 'reaction';

export interface CombatDamageRequest {
  sourceId: string;
  targetId: string;
  abilityId?: string;
  kind: CombatDamageKind;
  element: DamageElement;
  baseDamage: number;
  attackPowerMultiplier?: number;
  weaponPower?: number;
  weaponCoefficient?: number;
  skillCoefficient?: number;
  additiveDamage?: number;
  damageMultiplier?: number;
  elementalMultiplier?: number;
  conditionalMultiplier?: number;
  criticalChance?: number;
  criticalMultiplier?: number;
  targetArmor?: number;
  armorPenetration?: number;
  stagger?: number;
  statusIds?: readonly string[];
  weight?: HitWeight;
  random?: () => number;
}

export interface CombatDamageBreakdown {
  sourceId: string;
  targetId: string;
  abilityId?: string;
  kind: CombatDamageKind;
  element: DamageElement;
  baseDamage: number;
  weaponContribution: number;
  additiveDamage: number;
  preMultiplierDamage: number;
  attackPowerMultiplier: number;
  skillCoefficient: number;
  damageMultiplier: number;
  elementalMultiplier: number;
  conditionalMultiplier: number;
  criticalChance: number;
  critical: boolean;
  criticalMultiplier: number;
  targetArmor: number;
  effectiveArmor: number;
  mitigationMultiplier: number;
  finalDamage: number;
  stagger: number;
  statusIds: readonly string[];
  weight: HitWeight;
}

export type CombatBreakdownListener = (breakdown: Readonly<CombatDamageBreakdown>) => void;

/**
 * Central deterministic damage pipeline used by basic attacks, skills, ultimates,
 * reactions, and status ticks. Visual hit handling remains in CombatSystem.
 */
export class CombatResolver {
  private readonly listeners = new Set<CombatBreakdownListener>();
  private lastResult: CombatDamageBreakdown | null = null;

  subscribe(listener: CombatBreakdownListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  lastBreakdown(): Readonly<CombatDamageBreakdown> | null {
    return this.lastResult;
  }

  resolve(request: CombatDamageRequest): CombatDamageBreakdown {
    const baseDamage = Math.max(0, request.baseDamage);
    const weaponContribution = Math.max(0, request.weaponPower ?? 0) * Math.max(0, request.weaponCoefficient ?? 0.01);
    const additiveDamage = request.additiveDamage ?? 0;
    const preMultiplierDamage = Math.max(0, baseDamage + weaponContribution + additiveDamage);
    const attackPowerMultiplier = Math.max(0, request.attackPowerMultiplier ?? 1);
    const skillCoefficient = Math.max(0, request.skillCoefficient ?? 1);
    const damageMultiplier = Math.max(0, request.damageMultiplier ?? 1);
    const elementalMultiplier = Math.max(0, request.elementalMultiplier ?? 1);
    const conditionalMultiplier = Math.max(0, request.conditionalMultiplier ?? 1);
    const criticalChance = Math.max(0, Math.min(1, request.criticalChance ?? 0));
    const criticalMultiplier = Math.max(1, request.criticalMultiplier ?? 1.5);
    const critical = (request.random ?? Math.random)() < criticalChance;
    const targetArmor = Math.max(0, request.targetArmor ?? 0);
    const effectiveArmor = Math.max(0, targetArmor - Math.max(0, request.armorPenetration ?? 0));
    const mitigationMultiplier = 100 / (100 + effectiveArmor * 8);

    const raw = preMultiplierDamage * attackPowerMultiplier * skillCoefficient * damageMultiplier * elementalMultiplier * conditionalMultiplier;
    const finalDamage = Math.max(0, raw * (critical ? criticalMultiplier : 1) * mitigationMultiplier);
    const result: CombatDamageBreakdown = {
      sourceId: request.sourceId,
      targetId: request.targetId,
      abilityId: request.abilityId,
      kind: request.kind,
      element: request.element,
      baseDamage,
      weaponContribution,
      additiveDamage,
      preMultiplierDamage,
      attackPowerMultiplier,
      skillCoefficient,
      damageMultiplier,
      elementalMultiplier,
      conditionalMultiplier,
      criticalChance,
      critical,
      criticalMultiplier,
      targetArmor,
      effectiveArmor,
      mitigationMultiplier,
      finalDamage,
      stagger: Math.max(0, request.stagger ?? 0),
      statusIds: [...(request.statusIds ?? [])],
      weight: request.weight ?? 'light',
    };
    this.lastResult = result;
    for (const listener of this.listeners) listener(result);
    return result;
  }
}
