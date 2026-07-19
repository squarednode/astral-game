import type { EncounterManager, EncounterSnapshot } from '../../game/encounters';

export class EncounterTracker {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, private readonly manager: EncounterManager) {
    this.root = document.createElement('div');
    this.root.className = 'encounter-tracker';
    this.root.hidden = true;
    parent.appendChild(this.root);
    manager.subscribe(() => this.render());
    this.render();
  }

  render(): void {
    const snapshot = this.manager.active();
    if (!snapshot) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    this.root.innerHTML = this.markup(snapshot);
  }

  dispose(): void {
    this.root.remove();
  }

  private markup(snapshot: EncounterSnapshot): string {
    const phase = snapshot.currentPhaseIndex + 1;
    const controller = snapshot.reinforcementControllers.find(item => item.active);
    const stateLine = snapshot.outsideBoundary && snapshot.boundaryGraceRemaining !== null
      ? `Return to the encounter · reset in ${Math.ceil(snapshot.boundaryGraceRemaining)}s`
      : snapshot.state === 'phase-transition'
        ? `Next phase in ${snapshot.transitionRemaining.toFixed(1)}s`
        : controller?.timerRemaining !== null && controller?.timerRemaining !== undefined
          ? `Reinforcements in ${controller.timerRemaining.toFixed(1)}s · ${controller.nextSpawnCount} incoming`
          : snapshot.pendingSpawns > 0
            ? `${snapshot.pendingSpawns} enemy spawn${snapshot.pendingSpawns === 1 ? '' : 's'} incoming`
            : `${snapshot.aliveEnemies} enem${snapshot.aliveEnemies === 1 ? 'y' : 'ies'} remaining`;

    const pressureLine = controller
      ? `<em>Pressure ${controller.eligibleAlive}/${controller.targetAlive} · Spawned ${controller.totalSpawned}/${controller.maximumTotalSpawned}</em>`
      : '';

    return `
      <section class="${snapshot.outsideBoundary ? 'boundary-warning' : ''}">
        <small>ENCOUNTER</small>
        <strong>${snapshot.displayName}</strong>
        <span>Phase ${Math.min(phase, snapshot.phaseCount)} / ${snapshot.phaseCount} · ${snapshot.currentPhaseName ?? 'Complete'}</span>
        <b>${stateLine}</b>
        ${pressureLine}
      </section>
    `;
  }
}
