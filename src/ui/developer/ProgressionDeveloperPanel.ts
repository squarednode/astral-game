import type { CharacterProgressionRuntime, ExperienceRuntime } from '../../game/progression';

export interface ProgressionDeveloperPanelOptions {
  progression(): CharacterProgressionRuntime;
  experience(): ExperienceRuntime;
  characterName(id: string): string;
  refresh(): void;
}

export class ProgressionDeveloperPanel {
  constructor(
    private readonly host: HTMLElement,
    private readonly options: ProgressionDeveloperPanelOptions,
  ) {
    this.host.addEventListener('click', this.onClick);
    this.render();
  }

  render(): void {
    const snapshots = this.options.progression().snapshots();
    this.host.innerHTML = `
      <section class="progression-developer-panel">
        <header>
          <strong>CHARACTER PROGRESSION</strong>
          <small>Full-roster XP distribution</small>
        </header>
        <div class="progression-dev-toolbar">
          <button data-action="award" data-amount="25">Grant 25 XP</button>
          <button data-action="award" data-amount="100">Grant 100 XP</button>
          <button data-action="award" data-amount="500">Grant 500 XP</button>
        </div>
        <div class="progression-dev-grid">
          ${snapshots.map(snapshot => `
            <article class="progression-dev-card">
              <strong>${this.options.characterName(snapshot.characterId)}</strong>
              <small>${snapshot.characterId}</small>
              <dl>
                <dt>Level</dt><dd>${snapshot.level}</dd>
                <dt>XP</dt><dd>${snapshot.experienceIntoLevel} / ${snapshot.experienceForNextLevel || 'MAX'}</dd>
                <dt>Total XP</dt><dd>${snapshot.totalExperience}</dd>
                <dt>HP growth</dt><dd>+${snapshot.growth.maximumHealth}</dd>
                <dt>Attack growth</dt><dd>+${snapshot.growth.attack}</dd>
                <dt>Armor growth</dt><dd>+${snapshot.growth.armor.toFixed(1)}</dd>
              </dl>
              <div class="progression-dev-actions">
                <button data-action="level" data-id="${snapshot.characterId}" data-level="${snapshot.level + 1}">Level +1</button>
                <button data-action="reset" data-id="${snapshot.characterId}">Reset</button>
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
    if (button.dataset.action === 'award') {
      this.options.experience().award({
        amount: Number(button.dataset.amount ?? 0),
        sourceId: 'developer.progression-panel',
        sourceType: 'developer',
      });
    } else if (button.dataset.action === 'level' && button.dataset.id) {
      this.options.progression().setLevel(
        button.dataset.id,
        Number(button.dataset.level ?? 1),
      );
    } else if (button.dataset.action === 'reset' && button.dataset.id) {
      this.options.progression().reset(button.dataset.id);
    }
    this.options.refresh();
    this.render();
  };
}
