import type { EncounterManager, EncounterRegistry } from '../../game/encounters';

export interface EncounterDeveloperPanelOptions {
  manager: EncounterManager;
  registry: EncounterRegistry;
  teleportToArena(encounterId: string): void;
  toggleVisuals(): void;
}

export class EncounterDeveloperPanel {
  private showVisuals = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: EncounterDeveloperPanelOptions,
  ) {
    host.addEventListener('click', this.onClick);
    options.manager.subscribe(() => this.render());
    this.render();
  }

  render(): void {
    this.host.innerHTML = `
      <section class="encounter-developer-panel">
        <header>
          <div><strong>ENCOUNTER DIRECTOR</strong><small>Movement playground validation suite</small></div>
          <button data-action="visuals">${this.showVisuals ? 'Hide' : 'Show'} Arena Visuals</button>
        </header>
        <div class="encounter-dev-grid">
          ${this.options.manager.snapshots().map(snapshot => `
            <article class="encounter-dev-card">
              <strong>${snapshot.displayName}</strong>
              <small>${snapshot.id}</small>
              <dl>
                <dt>State</dt><dd>${snapshot.state}</dd>
                <dt>Phase</dt><dd>${snapshot.currentPhaseIndex + 1}/${snapshot.phaseCount} ${snapshot.currentPhaseName ?? ''}</dd>
                <dt>Enemies</dt><dd>${snapshot.aliveEnemies} alive · ${snapshot.defeatedEnemies} defeated</dd>
                <dt>Spawns</dt><dd>${snapshot.spawnedEnemies} total · ${snapshot.pendingSpawns} pending</dd>
                <dt>Time</dt><dd>${snapshot.elapsedSeconds.toFixed(1)}s</dd>
                <dt>Reward</dt><dd>${snapshot.rewardGranted ? 'Granted' : 'Pending'}</dd>
                ${snapshot.failureReason ? `<dt>Failure</dt><dd>${snapshot.failureReason}</dd>` : ''}
              </dl>
              <div class="encounter-dev-actions">
                <button data-action="start" data-id="${snapshot.id}">Start</button>
                <button data-action="advance" data-id="${snapshot.id}">Advance</button>
                <button data-action="complete" data-id="${snapshot.id}">Complete</button>
                <button data-action="fail" data-id="${snapshot.id}">Fail</button>
                <button data-action="reset" data-id="${snapshot.id}">Reset</button>
                <button data-action="teleport" data-id="${snapshot.id}">Teleport</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    switch (button.dataset.action) {
      case 'start': if (id) this.options.manager.start(id); break;
      case 'advance': if (id) this.options.manager.advancePhase(id); break;
      case 'complete': if (id) this.options.manager.complete(id); break;
      case 'fail': if (id) this.options.manager.fail(id, 'Developer forced failure'); break;
      case 'reset': if (id) this.options.manager.reset(id); break;
      case 'teleport': if (id) this.options.teleportToArena(id); break;
      case 'visuals':
        this.showVisuals = !this.showVisuals;
        this.options.toggleVisuals();
        break;
    }
    this.render();
  };
}
