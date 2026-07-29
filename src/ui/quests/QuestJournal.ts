import type { QuestRuntime, QuestSnapshot, QuestState } from '../../game/actors';

type JournalFilter = 'active' | 'available' | 'completed';

export interface QuestJournalOptions {
  canOpen?: () => boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export class QuestJournal {
  private readonly root = document.createElement('section');
  private filter: JournalFilter = 'active';
  private selectedQuestId: string | null = null;

  constructor(
    parent: HTMLElement,
    private readonly quests: QuestRuntime,
    private readonly options: QuestJournalOptions = {},
  ) {
    this.root.className = 'quest-journal hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Quest journal');
    this.root.addEventListener('click', this.onClick);
    parent.appendChild(this.root);
    quests.subscribe(() => this.render());
  }

  isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(questId?: string): void {
    if (this.options.canOpen && !this.options.canOpen()) return;
    if (questId) this.selectedQuestId = questId;

    const visibleQuests = this.filteredQuests();
    if (!this.selectedQuestId || !visibleQuests.some(quest => quest.id === this.selectedQuestId)) {
      this.selectedQuestId = this.quests.tracked()?.id ?? visibleQuests[0]?.id ?? null;
    }

    this.root.classList.remove('hidden');
    this.options.onOpen?.();
    this.render();
    requestAnimationFrame(() => {
      this.root.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus();
    });
  }

  close(): void {
    if (!this.isOpen()) return;
    this.root.classList.add('hidden');
    this.options.onClose?.();
  }

  toggle(questId?: string): void {
    if (this.isOpen()) this.close();
    else this.open(questId);
  }

  private filteredQuests(): QuestSnapshot[] {
    return this.quests.all().filter(quest => {
      if (this.filter === 'active') {
        return quest.state === 'active' || quest.state === 'ready-to-complete';
      }
      if (this.filter === 'available') return quest.state === 'available';
      return quest.state === 'completed';
    });
  }

  private render(): void {
    if (!this.isOpen()) return;

    const quests = this.filteredQuests();
    if (!this.selectedQuestId || !quests.some(quest => quest.id === this.selectedQuestId)) {
      this.selectedQuestId = quests[0]?.id ?? null;
    }
    const selected = quests.find(quest => quest.id === this.selectedQuestId) ?? null;

    this.root.innerHTML = `
      <div class="quest-journal-panel">
        <header class="quest-journal-header">
          <div><span>Journal</span><strong>Quest Log</strong></div>
          <div class="quest-journal-header-actions">
            <kbd>J</kbd>
            <button data-action="close" aria-label="Close journal">×</button>
          </div>
        </header>
        <nav class="quest-journal-tabs" aria-label="Quest journal sections">
          ${this.filterButton('active', 'Active')}
          ${this.filterButton('available', 'Available')}
          ${this.filterButton('completed', 'Completed')}
        </nav>
        <div class="quest-journal-body">
          <div class="quest-journal-list" role="list">
            ${quests.length
              ? quests.map(quest => this.questListButton(quest)).join('')
              : `<p class="quest-journal-empty">No ${this.filter} quests.</p>`}
          </div>
          <div class="quest-journal-detail">
            ${selected ? this.questDetail(selected) : '<p class="quest-journal-empty">Select a quest to view its details.</p>'}
          </div>
        </div>
      </div>`;
  }

  private questListButton(quest: QuestSnapshot): string {
    const completed = quest.objectives.filter(objective => objective.completed).length;
    const selected = quest.id === this.selectedQuestId;
    const tracked = this.quests.tracked()?.id === quest.id;
    return `
      <button class="quest-journal-list-item ${selected ? 'selected' : ''}" data-select="${quest.id}" role="listitem">
        <span>${tracked ? '◆ ' : ''}${this.escape(quest.displayName)}</span>
        <small>${this.stateLabel(quest.state)} · ${completed}/${quest.objectives.length}</small>
      </button>`;
  }

  private questDetail(quest: QuestSnapshot): string {
    const tracked = this.quests.tracked()?.id === quest.id;
    return `
      <article class="quest-journal-quest">
        <div class="quest-journal-title-row">
          <div>
            <small>${this.stateLabel(quest.state)}</small>
            <h2>${this.escape(quest.displayName)}</h2>
          </div>
          ${tracked ? '<span class="quest-journal-tracked">Tracked</span>' : ''}
        </div>
        <p class="quest-journal-description">${this.escape(quest.description)}</p>
        ${quest.questGiver ? `<div class="quest-journal-guidance"><b>Quest giver</b><span>${this.escape(quest.questGiver)}</span></div>` : ''}
        ${quest.turnInHint ? `<div class="quest-journal-guidance ${quest.state === 'ready-to-complete' ? 'ready' : ''}"><b>${quest.state === 'ready-to-complete' ? 'Turn in now' : 'Turn-in location'}</b><span>${this.escape(quest.turnInHint)}</span></div>` : ''}
        <h3>Objectives</h3>
        <div class="quest-journal-objectives">
          ${quest.objectives.map(objective => `
            <div class="${objective.completed ? 'complete' : ''}">
              <b>${objective.completed ? '✓' : '□'}</b>
              <span>${this.escape(objective.label)}</span>
              <em>${objective.current}/${objective.required}</em>
            </div>`).join('')}
        </div>
        ${quest.rewardSummary.length ? `<h3>Rewards</h3><ul class="quest-journal-rewards">${quest.rewardSummary.map(reward => `<li>${this.escape(reward)}</li>`).join('')}</ul>` : ''}
        ${quest.state === 'available' && quest.questGiver ? `<p class="quest-journal-available-note">Speak with ${this.escape(quest.questGiver)} to accept this quest.</p>` : ''}
        <div class="quest-journal-actions">
          ${quest.state === 'active' || quest.state === 'ready-to-complete'
            ? `<button data-track="${tracked ? '' : quest.id}">${tracked ? 'Stop Tracking' : 'Track Quest'}</button>`
            : ''}
          ${quest.canAbandon ? `<button class="danger" data-abandon="${quest.id}">Abandon Quest</button>` : ''}
        </div>
      </article>`;
  }

  private filterButton(filter: JournalFilter, label: string): string {
    return `<button data-filter="${filter}" class="${this.filter === filter ? 'active' : ''}">${label}</button>`;
  }

  private stateLabel(state: QuestState): string {
    switch (state) {
      case 'ready-to-complete': return 'Ready to turn in';
      case 'completed': return 'Completed';
      case 'available': return 'Available';
      default: return 'In progress';
    }
  }

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;

    if (button.dataset.action === 'close') {
      this.close();
      return;
    }
    if (button.dataset.filter) {
      this.filter = button.dataset.filter as JournalFilter;
      this.selectedQuestId = null;
      this.render();
      return;
    }
    if (button.dataset.select) {
      this.selectedQuestId = button.dataset.select;
      this.render();
      return;
    }
    if (button.hasAttribute('data-track')) {
      this.quests.track(button.dataset.track || null);
      this.render();
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
        this.selectedQuestId = null;
        this.render();
      }
    }
  };

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
