import type { DeveloperActions } from './DeveloperActions';
import type { DeveloperState } from './DeveloperState';

type ToggleKey = keyof Pick<
  DeveloperState,
  | 'godMode'
  | 'enemyAiEnabled'
  | 'enemyDamageEnabled'
  | 'wavesEnabled'
  | 'hitStopEnabled'
  | 'damageNumbersEnabled'
  | 'knockbackEnabled'
  | 'cameraShakeEnabled'
  | 'playerDamageFeedbackEnabled'
  | 'enemyTelegraphsEnabled'
  | 'movementDebugEnabled'
  | 'noCooldowns'
>;

export class DeveloperConsole {
  private readonly root = document.createElement('aside');
  private readonly status = document.createElement('div');

  constructor(
    private readonly state: DeveloperState,
    private readonly actions: DeveloperActions,
  ) {
    this.root.id = 'developer-console';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="dev-header">
        <div>
          <strong>Developer Tools</strong>
          <small>F1 / Escape to close</small>
        </div>
        <button data-action="close">×</button>
      </div>

      <div class="dev-status"></div>

      <section>
        <h3>Player</h3>
        <div class="dev-grid">
          <button data-toggle="godMode">God Mode</button>
          <button data-toggle="noCooldowns">No Cooldowns</button>
          <button data-action="heal">Restore Party</button>
          <button data-action="cooldowns">Reset Cooldowns</button>
        </div>
      </section>

      <section>
        <h3>Enemies</h3>
        <div class="dev-grid">
          <button data-action="spawn-normal">Spawn Enemy</button>
          <button data-action="spawn-elite">Spawn Elite</button>
          <button data-action="kill-all">Kill All</button>
          <button data-toggle="enemyAiEnabled">Enemy AI</button>
          <button data-toggle="enemyDamageEnabled">Enemy Damage</button>
          <button data-toggle="enemyTelegraphsEnabled">Telegraphs</button>
        </div>
      </section>

      <section>
        <h3>Loot</h3>
        <div class="dev-grid">
          <button data-action="loot-common">Common</button>
          <button data-action="loot-magic">Magic</button>
          <button data-action="loot-rare">Rare</button>
          <button data-action="loot-legendary">Legendary</button>
          <button data-action="clear-loot">Clear Inventory</button>
        </div>
      </section>

      <section>
        <h3>Combat</h3>
        <div class="dev-grid">
          <button data-toggle="hitStopEnabled">Hit Stop</button>
          <button data-toggle="damageNumbersEnabled">Damage Numbers</button>
          <button data-toggle="knockbackEnabled">Knockback</button>
          <button data-toggle="cameraShakeEnabled">Camera Shake</button>
          <button data-toggle="playerDamageFeedbackEnabled">Player Feedback</button>
        </div>
      </section>

      <section>
        <h3>World & Debug</h3>
        <div class="dev-grid">
          <button data-toggle="wavesEnabled">Auto Waves</button>
          <button data-action="next-wave">Next Wave</button>
          <button data-toggle="movementDebugEnabled">Movement Debug</button>
        </div>
      </section>
    `;

    this.status.className = 'dev-status';
    this.root.querySelector('.dev-status')?.replaceWith(this.status);
    document.body.appendChild(this.root);

    this.root.addEventListener('click', event => {
      const target = event.target as HTMLButtonElement;
      if (!(target instanceof HTMLButtonElement)) return;

      const toggle = target.dataset.toggle as ToggleKey | undefined;
      if (toggle) {
        this.state[toggle] = !this.state[toggle];
        this.refresh();
        return;
      }

      switch (target.dataset.action) {
        case 'close': this.close(); break;
        case 'heal': this.actions.restorePartyHealth(); break;
        case 'cooldowns': this.actions.resetCooldowns(); break;
        case 'spawn-normal': this.actions.spawnEnemy(false); break;
        case 'spawn-elite': this.actions.spawnEnemy(true); break;
        case 'kill-all': this.actions.killAllEnemies(); break;
        case 'next-wave': this.actions.startNextWave(); break;
        case 'loot-common': this.actions.spawnLoot('common'); break;
        case 'loot-magic': this.actions.spawnLoot('magic'); break;
        case 'loot-rare': this.actions.spawnLoot('rare'); break;
        case 'loot-legendary': this.actions.spawnLoot('legendary'); break;
        case 'clear-loot': this.actions.clearInventory(); break;
      }

      this.refresh();
    });

    this.refresh();
  }

  toggle(): void {
    this.state.panelOpen ? this.close() : this.open();
  }

  open(): void {
    this.state.panelOpen = true;
    this.root.hidden = false;
    this.refresh();
  }

  close(): void {
    this.state.panelOpen = false;
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return this.state.panelOpen;
  }

  refresh(): void {
    const info = this.actions.getStatus();
    this.status.textContent =
      `Wave ${info.wave} · ${info.enemies} enemies · ${info.loot} items · ${info.activeCharacter}`;

    this.root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(button => {
      const key = button.dataset.toggle as ToggleKey;
      button.classList.toggle('enabled', Boolean(this.state[key]));
      button.setAttribute('aria-pressed', String(Boolean(this.state[key])));
    });
  }

  dispose(): void {
    this.root.remove();
  }
}
