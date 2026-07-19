import type { ActorRuntime } from './ActorRuntime';

export interface WorldInteractionCandidate {
  actor: ActorRuntime;
  distance: number;
  directlyHovered: boolean;
  inFront: boolean;
}

export class WorldInteractionRuntime {
  private targeted: ActorRuntime | null = null;

  select(candidates: readonly WorldInteractionCandidate[]): ActorRuntime | null {
    const valid = candidates.filter(candidate => {
      const range = candidate.actor.interaction?.range ?? 0;
      return candidate.distance <= range;
    });

    valid.sort((a, b) => {
      if (a.directlyHovered !== b.directlyHovered) {
        return a.directlyHovered ? -1 : 1;
      }
      if (a.inFront !== b.inFront) return a.inFront ? -1 : 1;
      const priorityA = a.actor.interaction?.priority ?? 0;
      const priorityB = b.actor.interaction?.priority ?? 0;
      if (priorityA !== priorityB) return priorityB - priorityA;
      return a.distance - b.distance;
    });

    this.targeted = valid[0]?.actor ?? null;
    return this.targeted;
  }

  target(): ActorRuntime | null {
    return this.targeted;
  }

  clear(): void {
    this.targeted = null;
  }
}
