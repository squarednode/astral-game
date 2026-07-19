export interface InteractionPromptModel {
  action: string;
  subject: string;
  keyLabel?: string;
  detail?: string;
  disabled?: boolean;
}

export class InteractionPrompt {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.className = 'interaction-prompt';
    this.root.hidden = true;
    parent.appendChild(this.root);
  }

  show(model: InteractionPromptModel): void {
    const key = model.keyLabel ?? 'E';
    this.root.classList.toggle('disabled', model.disabled === true);
    this.root.innerHTML = `<b>[${this.escape(key)}]</b> ${this.escape(model.action)} <strong>${this.escape(model.subject)}</strong>${model.detail ? `<small>${this.escape(model.detail)}</small>` : ''}`;
    this.root.hidden = false;
  }

  hide(): void { this.root.hidden = true; }
  dispose(): void { this.root.remove(); }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[character]!);
  }
}
