import type { DialogueRuntime } from '../../game/actors';

export interface DialogueOverlayOptions {
  onOpened?(): void;
  onClosed(): void;
}

export class DialogueOverlay {
  private readonly root: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly runtime: DialogueRuntime,
    private readonly speakerName: (speakerId: string) => string,
    private readonly options: DialogueOverlayOptions,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dialogue-overlay hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Conversation');
    this.root.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    parent.appendChild(this.root);
  }

  isOpen(): boolean { return !this.root.classList.contains('hidden'); }

  render(): void {
    const snapshot = this.runtime.snapshot();
    if (!snapshot.active) {
      const wasOpen = this.isOpen();
      this.root.classList.add('hidden');
      this.root.innerHTML = '';
      if (wasOpen) this.options.onClosed();
      return;
    }

    const firstOpen = !this.isOpen();
    this.root.classList.remove('hidden');
    this.root.innerHTML = `
      <section class="dialogue-panel">
        <header><span>Conversation</span><strong>${this.escape(this.speakerName(snapshot.speakerId ?? ''))}</strong></header>
        <p>${this.escape(snapshot.text)}</p>
        <div class="dialogue-choices">
          ${snapshot.choices.length ? snapshot.choices.map(choice => `
            <button data-choice-id="${choice.id}" ${choice.enabled ? '' : 'disabled'} title="${this.escape(choice.disabledReason ?? '')}">
              ${this.escape(choice.text)}
              ${choice.enabled || !choice.disabledReason ? '' : `<small>${this.escape(choice.disabledReason)}</small>`}
            </button>`).join('') : '<button data-action="continue">Continue</button>'}
        </div>
        <button class="dialogue-close" data-action="close">Close</button>
      </section>`;
    if (firstOpen) this.options.onOpened?.();
    requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  }

  close(): void {
    if (!this.runtime.snapshot().active && !this.isOpen()) return;
    this.runtime.close();
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    this.options.onClosed();
  }

  dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!target || target.disabled) return;
    const choiceId = target.dataset.choiceId;
    if (choiceId) { this.runtime.choose(choiceId); this.render(); return; }
    if (target.dataset.action === 'continue') { this.runtime.continue(); this.render(); return; }
    if (target.dataset.action === 'close') this.close();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen()) { event.preventDefault(); this.close(); }
  };

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
  }
}
