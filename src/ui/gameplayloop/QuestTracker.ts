import type { QuestRuntime } from '../../game/actors';

export class QuestTracker {
  private readonly root = document.createElement('aside');
  private readonly journal = document.createElement('section');
  private readonly toasts = document.createElement('div');

  constructor(parent: HTMLElement, private readonly quests: QuestRuntime) {
    this.root.className = 'quest-tracker';
    this.journal.className = 'quest-journal hidden';
    this.toasts.className = 'gameplay-toasts';
    this.root.addEventListener('click', () => this.toggleJournal());
    this.journal.addEventListener('click', this.onJournalClick);
    parent.append(this.root, this.journal, this.toasts);
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
    this.root.innerHTML = tracked ? `
      <header><span>Tracked Quest</span><strong>${this.escape(tracked.displayName)}</strong></header>
      <div>${tracked.objectives.map(objective => `
        <p class="${objective.completed ? 'complete' : ''}">
          <b>${objective.completed ? '✓' : '□'}</b>
          <span>${this.escape(objective.label)}</span>
          <em>${objective.current}/${objective.required}</em>
        </p>`).join('')}</div>
      <small>${tracked.state === 'ready-to-complete' ? 'Ready to turn in' : 'Click to open journal'}</small>
    ` : '';
    this.renderJournal();
  }

  private toggleJournal(): void {
    this.journal.classList.toggle('hidden');
    this.renderJournal();
  }

  private renderJournal(): void {
    if (this.journal.classList.contains('hidden')) return;
    const quests = this.quests.all();
    this.journal.innerHTML = `
      <header><div><span>Journal</span><strong>Quests</strong></div><button data-action="close">×</button></header>
      <nav>
        <button data-filter="active">Active</button>
        <button data-filter="completed">Completed</button>
        <button data-filter="history">History</button>
        <button data-filter="lore">Lore</button>
      </nav>
      <div class="quest-journal-list">
        ${quests.map(quest => `
          <article>
            <div><strong>${this.escape(quest.displayName)}</strong><small>${quest.state}</small></div>
            <p>${this.escape(quest.description)}</p>
            ${quest.objectives.map(objective => `<span>${objective.completed ? '✓' : '□'} ${this.escape(objective.label)} ${objective.current}/${objective.required}</span>`).join('')}
            ${quest.state === 'active' || quest.state === 'ready-to-complete' ? `<button data-track="${quest.id}">Track</button>` : ''}
          </article>`).join('')}
      </div>`;
  }

  private readonly onJournalClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.action === 'close') this.journal.classList.add('hidden');
    if (button.dataset.track) this.quests.track(button.dataset.track);
  };

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]!));
  }
}
