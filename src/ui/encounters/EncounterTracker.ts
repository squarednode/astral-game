import type { EncounterManager } from '../../game/encounters';

/**
 * Encounter state remains active for combat ownership/rewards, but the old
 * top-center encounter card is no longer part of the production HUD.
 */
export class EncounterTracker {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, private readonly manager: EncounterManager) {
    this.root = document.createElement('div');
    this.root.className = 'encounter-tracker';
    this.root.hidden = true;
    parent.appendChild(this.root);
    manager.subscribe(() => this.render());
  }

  render(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  dispose(): void {
    this.root.remove();
  }
}
