import type { CharacterProgressionRuntime, ExperienceRuntime } from '../../game/progression';
import type { CharacterSkillSnapshot } from '../../game/skills';

export interface ProgressionDeveloperPanelOptions {
  progression(): CharacterProgressionRuntime;
  experience(): ExperienceRuntime;
  characterName(id: string): string;
  characterBaseStats(id: string): { maximumHealth: number; attack: number; movementSpeed: number };
  skillSnapshot(id: string): CharacterSkillSnapshot | null;
  unlockAvailableSkills(id: string): number;
  resetSkills(id: string): void;
  clearSkillLoadout(id: string): void;
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
          <strong>CHARACTER GROWTH PACKAGES</strong>
          <small>Level growth, skill points, passives, and combat loadouts</small>
        </header>
        <div class="progression-dev-toolbar">
          <button data-action="award" data-amount="25">Grant 25 XP</button>
          <button data-action="award" data-amount="100">Grant 100 XP</button>
          <button data-action="award" data-amount="500">Grant 500 XP</button>
        </div>
        <div class="progression-dev-grid">
          ${snapshots.map(snapshot => {
            const skills = this.options.skillSnapshot(snapshot.characterId);
            const base = this.options.characterBaseStats(snapshot.characterId);
            const projectionLevels = [1, 5, 10];
            const projections = projectionLevels.map(level => {
              const growth = this.options.progression().projectedGrowth(snapshot.characterId, level);
              const totalXp = this.options.progression().totalExperienceRequiredForLevel(snapshot.characterId, level);
              return { level, totalXp, health: base.maximumHealth + growth.maximumHealth, attack: base.attack + growth.attack, speed: base.movementSpeed + growth.movementSpeed };
            });
            const passiveRows = Object.entries(skills?.passiveModifiers ?? {})
              .filter(([, value]) => Number(value) !== 0)
              .map(([key, value]) => `${key}: ${Number(value).toFixed(2)}`)
              .join('<br>') || 'none';
            const pathRows = Object.entries(skills?.pathPoints ?? {})
              .map(([pathId, points]) => `${pathId}: ${points}`)
              .join('<br>') || 'none';
            const availableNodes = skills?.availableNodeIds.length ?? 0;
            return `
            <article class="progression-dev-card">
              <strong>${this.options.characterName(snapshot.characterId)}</strong>
              <small>${snapshot.characterId}</small>
              <dl>
                <dt>Level</dt><dd>${snapshot.level}</dd>
                <dt>XP</dt><dd>${snapshot.experienceIntoLevel} / ${snapshot.experienceForNextLevel || 'MAX'}</dd>
                <dt>Skill points</dt><dd>${skills?.availableSkillPoints ?? 0} available / ${skills?.spentSkillPoints ?? 0} spent</dd>
                <dt>HP growth</dt><dd>+${snapshot.growth.maximumHealth}</dd>
                <dt>Attack growth</dt><dd>+${snapshot.growth.attack}</dd>
                <dt>Armor growth</dt><dd>+${snapshot.growth.armor.toFixed(1)}</dd>
                <dt>Passives</dt><dd>${passiveRows}</dd>
                <dt>Path spend</dt><dd>${pathRows}</dd>
                <dt>Connected choices</dt><dd>${availableNodes}</dd>
                <dt>Equipped ultimate</dt><dd>${skills?.equippedUltimateNodeId ?? 'none'}</dd>
              </dl>
              <div class="progression-dev-projections">
                ${projections.map(item => `<div><b>Lv ${item.level}</b><span>${item.totalXp} total XP</span><span>${item.health.toFixed(1)} HP · ${item.attack.toFixed(2)} ATK · ${item.speed.toFixed(2)} SPD</span></div>`).join('')}
              </div>
              <div class="progression-dev-actions">
                <button data-action="level" data-id="${snapshot.characterId}" data-level="${snapshot.level + 1}">Level +1</button>
                <button data-action="unlock-skills" data-id="${snapshot.characterId}">Unlock Available</button>
                <button data-action="clear-loadout" data-id="${snapshot.characterId}">Clear Skills</button>
                <button data-action="reset-skills" data-id="${snapshot.characterId}">Reset Tree</button>
                <button data-action="reset" data-id="${snapshot.characterId}">Reset Level</button>
              </div>
            </article>`;
          }).join('')}
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
    if (button.dataset.action === 'award') {
      this.options.experience().award({
        amount: Number(button.dataset.amount ?? 0),
        sourceId: 'developer.progression-panel',
        sourceType: 'developer',
      });
    } else if (button.dataset.action === 'level' && id) {
      this.options.progression().setLevel(id, Number(button.dataset.level ?? 1));
    } else if (button.dataset.action === 'reset' && id) {
      this.options.progression().reset(id);
    } else if (button.dataset.action === 'unlock-skills' && id) {
      this.options.unlockAvailableSkills(id);
    } else if (button.dataset.action === 'reset-skills' && id) {
      this.options.resetSkills(id);
    } else if (button.dataset.action === 'clear-loadout' && id) {
      this.options.clearSkillLoadout(id);
    }
    this.options.refresh();
    this.render();
  };
}
