import { CharacterFrame } from './CharacterFrame';
import type { GameplayCharacterView } from './GameplayHudTypes';

export class PartyHud {
  readonly element: HTMLDivElement;
  private readonly frames = new Map<string, CharacterFrame>();

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-party-hud';
    parent.appendChild(this.element);
  }

  render(characters: readonly GameplayCharacterView[]): void {
    const activeIds = new Set(characters.map(character => character.id));

    for (const [id, frame] of this.frames) {
      if (activeIds.has(id)) continue;
      frame.element.remove();
      this.frames.delete(id);
    }

    for (const character of characters) {
      let frame = this.frames.get(character.id);
      if (!frame) {
        frame = new CharacterFrame();
        this.frames.set(character.id, frame);
      }
      frame.render(character);
      this.element.appendChild(frame.element);
    }
  }
}
