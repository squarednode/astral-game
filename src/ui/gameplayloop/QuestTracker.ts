import type { QuestRuntime } from '../../game/actors';

export interface QuestTrackerOptions {
  onOpenJournal?: (questId?: string) => void;
}

export class QuestTracker {
  private readonly root = document.createElement('aside');
  private readonly toasts = document.createElement('div');

  constructor(
    trackerParent: HTMLElement,
    toastParent: HTMLElement,
    private readonly quests: QuestRuntime,
    private readonly options: QuestTrackerOptions = {},
  ) {
    this.root.className = 'quest-tracker';
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'button');
    this.root.setAttribute('aria-label', 'Open quest journal');
    this.toasts.className = 'gameplay-toasts';

    this.root.addEventListener('click', () => this.openTrackedQuest());
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openTrackedQuest();
      }
    });

    trackerParent.appendChild(this.root);
    toastParent.appendChild(this.toasts);
    quests.subscribe(() => this.render());
    this.render();
  }

  notify(title: string, detail = ''): void {
    const toast = document.createElement('article');
    toast.innerHTML = `<strong>${this.escape(title)}</strong>${detail ? `<span>${this.escape(detail)}</span>` : ''}`;
    this.toasts.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  render(): void {
    const tracked = this.quests.tracked();
    this.root.hidden = !tracked;
    this.root.innerHTML = tracked
      ? `
        <header>
          <span>Tracked Quest</span>
          <strong>${this.escape(tracked.displayName)}</strong>
        </header>
        <div>${tracked.objectives.map(objective => `
          <p class="${objective.completed ? 'complete' : ''}">
            <b>${objective.completed ? '✓' : '□'}</b>
            <span>${this.escape(objective.label)}</span>
            <em>${objective.current}/${objective.required}</em>
          </p>`).join('')}</div>
        <small>${tracked.state === 'ready-to-complete'
          ? 'Ready to turn in · J opens journal'
          : 'Click or press J to open journal'}</small>
      `
      : '';
  }

  private openTrackedQuest(): void {
    this.options.onOpenJournal?.(this.quests.tracked()?.id);
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character]!);
  }
}
