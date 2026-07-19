import type {
  ConditionContext,
  ConditionDefinition,
  ConditionResult,
} from './ConditionTypes';

export class ConditionEvaluator {
  constructor(private readonly context: ConditionContext) {}

  evaluate(condition?: ConditionDefinition): ConditionResult {
    if (!condition || condition.type === 'always') return { passed: true };

    switch (condition.type) {
      case 'world-flag': {
        const expected = condition.value ?? true;
        const passed = this.context.getWorldFlag(condition.flagId) === expected;
        return {
          passed,
          reason: passed ? undefined : `Requires world flag: ${condition.flagId}`,
        };
      }
      case 'world-counter-at-least': {
        const passed =
          this.context.getWorldCounter(condition.counterId) >= condition.amount;
        return {
          passed,
          reason: passed
            ? undefined
            : `Requires ${condition.amount} ${condition.counterId}`,
        };
      }
      case 'has-currency': {
        const passed =
          this.context.getCurrency(condition.currencyId) >= condition.amount;
        return {
          passed,
          reason: passed
            ? undefined
            : `Requires ${condition.amount} copper`,
        };
      }
      case 'has-material': {
        const passed =
          this.context.getMaterial(condition.materialId) >= condition.amount;
        return {
          passed,
          reason: passed
            ? undefined
            : `Requires ${condition.amount} ${condition.materialId}`,
        };
      }
      case 'inventory-space': {
        const passed = this.context.hasInventorySpace(condition.amount ?? 1);
        return { passed, reason: passed ? undefined : 'Inventory is full' };
      }
      case 'actor-state': {
        const passed =
          this.context.getActorState(condition.actorId) === condition.state;
        return {
          passed,
          reason: passed
            ? undefined
            : `${condition.actorId} must be ${condition.state}`,
        };
      }
      case 'all': {
        for (const child of condition.conditions) {
          const result = this.evaluate(child);
          if (!result.passed) return result;
        }
        return { passed: true };
      }
      case 'any': {
        const results = condition.conditions.map(child => this.evaluate(child));
        const passed = results.some(result => result.passed);
        return {
          passed,
          reason: passed
            ? undefined
            : results.map(result => result.reason).filter(Boolean).join(' or '),
        };
      }
      case 'not': {
        const child = this.evaluate(condition.condition);
        return {
          passed: !child.passed,
          reason: child.passed ? 'Inverse condition failed' : undefined,
        };
      }
    }
  }
}
