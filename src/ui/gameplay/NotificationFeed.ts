import type { NotificationTone } from './GameplayHudTypes';

export class NotificationFeed {
  readonly element: HTMLDivElement;
  private readonly timers = new Set<number>();

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-notification-feed';
    parent.appendChild(this.element);
  }

  push(text: string, tone: NotificationTone = 'neutral'): void {
    const line = document.createElement('div');
    line.className = `gameplay-notification is-${tone}`;
    line.textContent = text;
    this.element.prepend(line);

    const timer = window.setTimeout(() => {
      line.classList.add('is-leaving');
      const removeTimer = window.setTimeout(() => {
        line.remove();
        this.timers.delete(removeTimer);
      }, 240);
      this.timers.add(removeTimer);
      this.timers.delete(timer);
    }, 3900);

    this.timers.add(timer);
  }

  dispose(): void {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.element.remove();
  }
}
