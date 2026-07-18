import type { GameplayAbilityView } from './GameplayHudTypes';

export class AbilityBar {
  readonly element: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-ability-bar';
    parent.appendChild(this.element);
  }

  render(abilities: readonly GameplayAbilityView[]): void {
    this.element.replaceChildren(
      ...abilities.map(ability => this.createAbility(ability)),
    );
  }

  private createAbility(ability: GameplayAbilityView): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'gameplay-ability';
    root.classList.toggle('is-unassigned', !ability.assigned);
    root.classList.toggle('is-cooling-down', ability.cooldown > 0);
    root.classList.toggle('is-casting', ability.state === 'casting');
    root.dataset.state = ability.state ?? 'ready';
    root.dataset.abilityId = ability.id;

    const key = document.createElement('kbd');
    key.textContent = ability.binding;

    const name = document.createElement('div');
    name.className = 'gameplay-ability-name';
    name.textContent = ability.name;

    const progress = document.createElement('div');
    progress.className = 'gameplay-ability-progress';
    const remainingRatio = ability.state === 'casting'
      ? Math.max(0, Math.min(1, 1 - (ability.castProgress ?? 0)))
      : ability.cooldownMaximum > 0
        ? Math.max(0, Math.min(1, ability.cooldown / ability.cooldownMaximum))
        : 0;
    progress.style.transform = `scaleY(${remainingRatio})`;

    const cooldown = document.createElement('div');
    cooldown.className = 'gameplay-ability-cooldown';
    cooldown.textContent = ability.cooldown > 0
      ? ability.cooldown.toFixed(1)
      : '';

    root.append(progress, key, name, cooldown);
    return root;
  }
}
