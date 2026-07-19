import type { DialogueRuntime } from '../../game/actors';

export class DialogueOverlay {
  private readonly root: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly runtime: DialogueRuntime,
    private readonly speakerName: (speakerId: string) => string,
    private readonly onClosed: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dialogue-overlay hidden';
    this.root.addEventListener('click', this.onClick);
    parent.appendChild(this.root);
  }

  render(): void {
    const snapshot = this.runtime.snapshot();
    if (!snapshot.active) {
      this.root.classList.add('hidden');
      this.root.innerHTML = '';
      return;
    }

    this.root.classList.remove('hidden');
    this.root.innerHTML = `
      <section class="dialogue-panel">
        <header>
          <span>Conversation</span>
          <strong>${this.escape(this.speakerName(snapshot.speakerId ?? ''))}</strong>
        </header>
        <p>${this.escape(snapshot.text)}</p>
        <div class="dialogue-choices">
          ${snapshot.choices.length
            ? snapshot.choices
                .map(
                  choice => `
                    <button
                      data-choice-id="${choice.id}"
                      ${choice.enabled ? '' : 'disabled'}
                      title="${this.escape(choice.disabledReason ?? '')}"
                    >
                      ${this.escape(choice.text)}
                      ${choice.enabled || !choice.disabledReason
                        ? ''
                        : `<small>${this.escape(choice.disabledReason)}</small>`}
                    </button>
                  `,
                )
                .join('')
            : '<button data-action="continue">Continue</button>'}
        </div>
        <button class="dialogue-close" data-action="close">Close</button>
      </section>
    `;
  }

  close(): void {
    this.runtime.close();
    this.render();
    this.onClosed();
  }

  dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      'button',
    );
    if (!target) return;

    const choiceId = target.dataset.choiceId;
    if (choiceId) {
      this.runtime.choose(choiceId);
      this.render();
      if (!this.runtime.snapshot().active) this.onClosed();
      return;
    }

    if (target.dataset.action === 'continue') {
      this.runtime.continue();
      this.render();
      if (!this.runtime.snapshot().active) this.onClosed();
      return;
    }

    if (target.dataset.action === 'close') this.close();
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
