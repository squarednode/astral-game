import './CharacterChoiceScreen.css';

export interface CharacterChoiceOption {
  id: string;
  name: string;
  role: string;
  hp: number;
  damage: number;
  attack: string;
  summary: string;
  color: string;
}

export interface CharacterChoiceRequest {
  title: string;
  subtitle: string;
  confirmLabel: string;
  options: readonly CharacterChoiceOption[];
  allowCancel?: boolean;
  onChoose(id: string): void;
  onCancel?(): void;
}

export class CharacterChoiceScreen {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private request: CharacterChoiceRequest | null = null;
  private selectedId: string | null = null;

  constructor(private readonly parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'character-choice-backdrop';
    this.root.hidden = true;
    this.panel = document.createElement('div');
    this.panel.className = 'character-choice-panel';
    this.root.appendChild(this.panel);
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    this.parent.appendChild(this.root);
  }

  isOpen(): boolean { return !this.root.hidden; }

  open(request: CharacterChoiceRequest): void {
    this.request = request;
    this.selectedId = request.options[0]?.id ?? null;
    this.root.hidden = false;
    this.parent.classList.add('ui-layer--interactive');
    this.render();
    requestAnimationFrame(() => this.panel.querySelector<HTMLButtonElement>('[data-character-choice]')?.focus());
  }

  close(): void {
    this.root.hidden = true;
    this.request = null;
    this.selectedId = null;
    this.parent.classList.remove('ui-layer--interactive');
  }

  private render(): void {
    const request = this.request;
    if (!request) return;
    this.panel.replaceChildren();

    const header = document.createElement('header');
    header.className = 'character-choice-header';
    const title = document.createElement('h1');
    title.textContent = request.title;
    const subtitle = document.createElement('p');
    subtitle.textContent = request.subtitle;
    header.append(title, subtitle);

    const grid = document.createElement('div');
    grid.className = 'character-choice-grid';
    request.options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.characterChoice = option.id;
      button.className = `character-choice-card${this.selectedId === option.id ? ' is-selected' : ''}`;
      button.style.setProperty('--character-accent', option.color);
      button.innerHTML = `
        <span class="character-choice-icon">${option.name.slice(0, 1)}</span>
        <strong>${option.name}</strong>
        <small>${option.role}</small>
        <span class="character-choice-stats">${option.hp} HP · ${option.damage} DMG</span>
        <span class="character-choice-attack">${option.attack}</span>
        <p>${option.summary}</p>
      `;
      button.addEventListener('click', () => {
        this.selectedId = option.id;
        this.render();
      });
      grid.appendChild(button);
    });

    const actions = document.createElement('div');
    actions.className = 'character-choice-actions';
    if (request.allowCancel) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Back';
      cancel.addEventListener('click', () => {
        const callback = request.onCancel;
        this.close();
        callback?.();
      });
      actions.appendChild(cancel);
    }
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'character-choice-confirm';
    confirm.textContent = request.confirmLabel;
    confirm.disabled = !this.selectedId;
    confirm.addEventListener('click', () => {
      if (!this.selectedId) return;
      const id = this.selectedId;
      const callback = request.onChoose;
      this.close();
      callback(id);
    });
    actions.appendChild(confirm);

    this.panel.append(header, grid, actions);
  }
}
