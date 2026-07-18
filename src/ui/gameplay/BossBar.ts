import type { GameplayBossView } from './GameplayHudTypes';

export class BossBar {
  readonly element: HTMLDivElement;
  private readonly name = document.createElement('div');
  private readonly value = document.createElement('div');
  private readonly fill = document.createElement('div');

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-boss-bar';
    this.element.hidden = true;

    const header = document.createElement('div');
    header.className = 'gameplay-boss-header';
    header.append(this.name, this.value);

    const track = document.createElement('div');
    track.className = 'gameplay-boss-track';
    this.fill.className = 'gameplay-boss-fill';
    track.appendChild(this.fill);

    this.element.append(header, track);
    parent.appendChild(this.element);
  }

  render(boss?: GameplayBossView): void {
    this.element.hidden = !boss;
    if (!boss) return;

    this.name.textContent = boss.name;
    this.value.textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    this.fill.style.width = `${Math.max(
      0,
      Math.min(100, (boss.hp / Math.max(1, boss.maxHp)) * 100),
    )}%`;
  }
}
