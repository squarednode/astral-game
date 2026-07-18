import type { GameplayCharacterView } from './GameplayHudTypes';

export class CharacterFrame {
  readonly element: HTMLDivElement;
  private readonly accent: HTMLDivElement;
  private readonly name: HTMLDivElement;
  private readonly role: HTMLDivElement;
  private readonly value: HTMLDivElement;
  private readonly healthFill: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-character-frame';

    this.accent = document.createElement('div');
    this.accent.className = 'gameplay-character-accent';

    const copy = document.createElement('div');
    copy.className = 'gameplay-character-copy';

    this.name = document.createElement('div');
    this.name.className = 'gameplay-character-name';

    this.role = document.createElement('div');
    this.role.className = 'gameplay-character-role';

    this.value = document.createElement('div');
    this.value.className = 'gameplay-character-health-value';

    const bar = document.createElement('div');
    bar.className = 'gameplay-health-bar';
    this.healthFill = document.createElement('div');
    this.healthFill.className = 'gameplay-health-fill';
    bar.appendChild(this.healthFill);

    copy.append(this.name, this.role, bar);
    this.element.append(this.accent, copy, this.value);
  }

  render(view: GameplayCharacterView): void {
    this.element.classList.toggle('is-active', view.active);
    this.element.classList.toggle('is-defeated', view.hp <= 0);
    this.element.dataset.characterId = view.id;
    this.accent.style.background = view.color;
    this.healthFill.style.background = view.color;
    this.healthFill.style.width = `${Math.max(
      0,
      Math.min(100, (view.hp / Math.max(1, view.maxHp)) * 100),
    )}%`;
    this.name.textContent = `${view.active ? 'CONTROL · ' : ''}${view.name}`;
    this.role.textContent = view.role;
    this.value.textContent = `${Math.ceil(view.hp)} / ${Math.ceil(view.maxHp)}`;
  }
}
