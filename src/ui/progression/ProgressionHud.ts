import type { CharacterProgressionSnapshot } from '../../game/progression';

export class ProgressionHud {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'progression-hud';
    parent.appendChild(this.root);
  }

  render(snapshot: CharacterProgressionSnapshot | null, name: string): void {
    if (!snapshot) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    const percent = Math.round(snapshot.experienceProgress * 100);
    this.root.innerHTML = `
      <div class="progression-hud-header">
        <strong>${this.escape(name)}</strong>
        <span>Level ${snapshot.level}</span>
      </div>
      <div class="progression-hud-bar" aria-label="Experience ${percent}%">
        <i style="width:${percent}%"></i>
      </div>
      <small>${snapshot.experienceForNextLevel > 0
        ? `${snapshot.experienceIntoLevel} / ${snapshot.experienceForNextLevel} XP`
        : 'Maximum Level'}</small>
    `;
  }

  dispose(): void {
    this.root.remove();
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[character]!);
  }
}
