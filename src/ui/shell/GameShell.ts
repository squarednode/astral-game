import type { SaveSlotId, SaveSummary } from '../../game/save';
import './GameShell.css';

export interface GameShellOptions {
  summaries: () => SaveSummary[];
  onContinue: () => void;
  onNewGame: () => void;
  onSave: (slot: SaveSlotId) => boolean;
  onLoad: (slot: SaveSlotId) => boolean;
  onRestart: () => void;
  onSettings: () => void;
  onReturnToTitle: () => void;
  onExit: () => void;
  canSave: () => boolean;
  onVisibilityChanged?: (open: boolean, title: boolean) => void;
}

export class GameShell {
  private readonly element: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private mode: 'title' | 'pause' | 'save' | 'load' = 'title';
  private priorMode: 'title' | 'pause' = 'title';

  constructor(private readonly parent: HTMLElement, private readonly options: GameShellOptions) {
    this.element = document.createElement('div');
    this.element.className = 'game-shell-backdrop';
    this.panel = document.createElement('div');
    this.panel.className = 'game-shell-panel';
    this.element.appendChild(this.panel);
    this.element.addEventListener('pointerdown', e => e.stopPropagation());
    this.parent.appendChild(this.element);
    this.render();
  }

  isOpen(): boolean { return !this.element.hidden; }
  isTitle(): boolean { return this.mode === 'title'; }
  showTitle(): void { this.mode = 'title'; this.element.hidden = false; this.activateLayer(); this.render(); this.options.onVisibilityChanged?.(true, true); }
  showPause(): void { this.mode = 'pause'; this.element.hidden = false; this.activateLayer(); this.render(); this.options.onVisibilityChanged?.(true, false); }
  close(): void { this.element.hidden = true; this.parent.classList.remove('ui-layer--interactive'); this.options.onVisibilityChanged?.(false, false); }

  private activateLayer(): void { this.parent.classList.add('ui-layer--interactive'); }
  private button(label: string, run: () => void, disabled = false, danger = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `game-shell-button${danger ? ' game-shell-button--danger' : ''}`;
    button.textContent = label; button.disabled = disabled;
    button.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); run(); });
    return button;
  }

  private render(): void {
    this.panel.replaceChildren();
    const title = document.createElement('h1'); title.className = 'game-shell-title'; title.textContent = 'Astral Shift';
    const subtitle = document.createElement('p'); subtitle.className = 'game-shell-subtitle';
    subtitle.textContent = this.mode === 'title' ? 'Character Progression Framework' : this.mode === 'pause' ? 'Paused' : this.mode === 'save' ? 'Save Game' : 'Load Game';
    this.panel.append(title, subtitle);
    if (this.mode === 'save' || this.mode === 'load') { this.renderSlots(); return; }
    const actions = document.createElement('div'); actions.className = 'game-shell-actions';
    if (this.mode === 'title') {
      const hasSave = this.options.summaries().length > 0;
      actions.append(
        this.button('Continue', this.options.onContinue, !hasSave),
        this.button('New Game', () => { if (!hasSave || confirm('Start a new game? Unsaved progress will be lost.')) this.options.onNewGame(); }),
        this.button('Load Game', () => { this.priorMode = 'title'; this.mode = 'load'; this.render(); }, !hasSave),
        this.button('Settings', this.options.onSettings),
        this.button('Exit', this.options.onExit, false, true),
      );
    } else {
      actions.append(
        this.button('Resume', () => this.close()),
        this.button('Save Game', () => { this.priorMode = 'pause'; this.mode = 'save'; this.render(); }, !this.options.canSave()),
        this.button('Load Game', () => { this.priorMode = 'pause'; this.mode = 'load'; this.render(); }, this.options.summaries().length === 0),
        this.button('Restart from Checkpoint', () => { if (confirm('Restart from the active checkpoint?')) this.options.onRestart(); }),
        this.button('Settings', this.options.onSettings),
        this.button('Return to Title', () => { if (confirm('Return to title? Unsaved progress will be lost.')) this.options.onReturnToTitle(); }),
        this.button('Exit Game', this.options.onExit, false, true),
      );
    }
    this.panel.append(actions);
  }

  private renderSlots(): void {
    const summaries = new Map(this.options.summaries().map(summary => [summary.slotId, summary]));
    const list = document.createElement('div'); list.className = 'save-slot-list';
    const ids: SaveSlotId[] = this.mode === 'save' ? ['slot1','slot2','slot3'] : ['autosave','slot1','slot2','slot3'];
    for (const slotId of ids) {
      const summary = summaries.get(slotId);
      const card = document.createElement('div'); card.className = 'save-slot-card';
      const info = document.createElement('div');
      const name = slotId === 'autosave' ? 'Autosave' : `Manual Slot ${slotId.slice(-1)}`;
      info.innerHTML = `<strong>${name}</strong><small>${summary ? `${new Date(summary.savedAt).toLocaleString()} · ${summary.checkpointName} · ${summary.leaderName} · Lv ${summary.partyLevels.join('/')}` : 'Empty slot'}</small>`;
      const actions = document.createElement('div'); actions.className = 'save-slot-actions';
      const action = this.button(this.mode === 'save' ? (summary ? 'Overwrite' : 'Save') : 'Load', () => {
        const ok = this.mode === 'save' ? this.options.onSave(slotId) : this.options.onLoad(slotId);
        if (ok) this.close();
      }, this.mode === 'load' && !summary);
      actions.append(action); card.append(info, actions); list.append(card);
    }
    this.panel.append(list, this.button('Back', () => { this.mode = this.priorMode; this.render(); }));
  }
}
