import type { QuestRuntime, QuestState } from '../../game/actors';

type JournalFilter = 'active' | 'completed' | 'history' | 'lore';

export class QuestTracker {
  private readonly root = document.createElement('aside');
  private readonly journal = document.createElement('section');
  private readonly toasts = document.createElement('div');
  private filter: JournalFilter = 'active';

  constructor(parent: HTMLElement, private readonly quests: QuestRuntime) {
    this.root.className = 'quest-tracker';
    this.journal.className = 'quest-journal hidden';
    this.toasts.className = 'gameplay-toasts';
    this.root.addEventListener('click', () => this.openJournal());
    this.journal.addEventListener('click', this.onJournalClick);
    window.addEventListener('keydown', this.onKeyDown);
    parent.append(this.root, this.journal, this.toasts);
    quests.subscribe(() => this.render());
    this.render();
  }

  notify(title: string, detail = ''): void {
    const toast = document.createElement('article');
    toast.innerHTML = `<strong>${this.escape(title)}</strong>${
      detail ? `<span>${this.escape(detail)}</span>` : ''
    }`;
    this.toasts.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  isJournalOpen(): boolean {
    return !this.journal.classList.contains('hidden');
  }

  closeJournal(): void {
    this.journal.classList.add('hidden');
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
        <div>${tracked.objectives
          .map(
            objective => `
              <p class="${objective.completed ? 'complete' : ''}">
                <b>${objective.completed ? '✓' : '□'}</b>
                <span>${this.escape(objective.label)}</span>
                <em>${objective.current}/${objective.required}</em>
              </p>`,
          )
          .join('')}</div>
        <small>${
          tracked.state === 'ready-to-complete'
            ? 'Return to Hunter Mara'
            : 'Click to open journal'
        }</small>
      `
      : '';
    this.renderJournal();
  }

  private openJournal(): void {
    this.journal.classList.remove('hidden');
    this.renderJournal();
  }

  private renderJournal(): void {
    if (!this.isJournalOpen()) return;

    const quests = this.quests.all().filter(quest => {
      if (this.filter === 'active') {
        return quest.state === 'active' || quest.state === 'ready-to-complete';
      }
      if (this.filter === 'completed') return quest.state === 'completed';
      return false;
    });

    const placeholder =
      this.filter === 'history'
        ? 'Quest history hooks are ready for persistence.'
        : this.filter === 'lore'
          ? 'Lore entries will appear here in a later content pass.'
          : 'No quests in this section.';

    this.journal.innerHTML = `
      <header>
        <div><span>Journal</span><strong>Quests</strong></div>
        <button data-action="close" aria-label="Close journal">×</button>
      </header>
      <nav>
        ${this.filterButton('active', 'Active')}
        ${this.filterButton('completed', 'Completed')}
        ${this.filterButton('history', 'History')}
        ${this.filterButton('lore', 'Lore')}
      </nav>
      <div class="quest-journal-list">
        ${
          quests.length
            ? quests.map(quest => this.questCard(quest)).join('')
            : `<p class="quest-journal-empty">${placeholder}</p>`
        }
      </div>`;
  }

  private questCard(quest: {
    id: string;
    displayName: string;
    description: string;
    state: QuestState;
    canAbandon: boolean;
    objectives: readonly {
      id: string;
      label: string;
      current: number;
      required: number;
      completed: boolean;
    }[];
  }): string {
    return `
      <article>
        <div>
          <strong>${this.escape(quest.displayName)}</strong>
          <small>${this.escape(quest.state)}</small>
        </div>
        <p>${this.escape(quest.description)}</p>
        ${quest.objectives
          .map(
            objective =>
              `<span>${objective.completed ? '✓' : '□'} ${this.escape(
                objective.label,
              )} ${objective.current}/${objective.required}</span>`,
          )
          .join('')}
        <div class="quest-journal-actions">
          ${
            quest.state === 'active' || quest.state === 'ready-to-complete'
              ? `<button data-track="${quest.id}">Track</button>`
              : ''
          }
          ${
            quest.canAbandon
              ? `<button class="danger" data-abandon="${quest.id}">Abandon Quest</button>`
              : ''
          }
        </div>
      </article>`;
  }

  private filterButton(filter: JournalFilter, label: string): string {
    return `<button data-filter="${filter}" class="${
      this.filter === filter ? 'active' : ''
    }">${label}</button>`;
  }

  private readonly onJournalClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button',
    );
    if (!button) return;

    if (button.dataset.action === 'close') {
      this.closeJournal();
      return;
    }

    if (button.dataset.filter) {
      this.filter = button.dataset.filter as JournalFilter;
      this.renderJournal();
      return;
    }

    if (button.dataset.track) {
      this.quests.track(button.dataset.track);
      return;
    }

    if (button.dataset.abandon) {
      const quest = this.quests.snapshot(button.dataset.abandon);
      if (!quest) return;
      const confirmed = window.confirm(
        `Abandon “${quest.displayName}”?\n\nCurrent quest progress will be lost.\nItems already collected will remain in your inventory.`,
      );
      if (confirmed) {
        this.quests.abandon(quest.id);
        this.render();
      }
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isJournalOpen()) {
      event.preventDefault();
      this.closeJournal();
    }
  };

  private escape(value: string): string {
    return value.replace(
      /[&<>"']/g,
      character =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[character]!,
    );
  }
}
