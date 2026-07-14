import { DEFAULT_INPUT_SETTINGS, KEY_BINDINGS } from './InputBindings';
import type { InputAction, InputSettings, MovementMode } from './InputTypes';

export class InputManager {
  private readonly held = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  private rightHeld = false;
  private rightPressed = false;
  private wheelDelta = 0;
  private settings: InputSettings = { ...DEFAULT_INPUT_SETTINGS };

  constructor(private readonly target: Window = window) {
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
  }

  getMovementMode(): MovementMode { return this.settings.movementMode; }
  setMovementMode(mode: MovementMode): void { this.settings.movementMode = mode; }
  isClickToAttackEnabled(): boolean { return this.settings.clickToAttack; }
  setClickToAttack(enabled: boolean): void { this.settings.clickToAttack = enabled; }
  isHeld(action: InputAction): boolean { return this.held.has(action); }

  consumePressed(action: InputAction): boolean {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  getMoveAxes(): { x: number; z: number } {
    return {
      x: (this.isHeld('moveRight') ? 1 : 0) - (this.isHeld('moveLeft') ? 1 : 0),
      z: (this.isHeld('moveUp') ? 1 : 0) - (this.isHeld('moveDown') ? 1 : 0),
    };
  }

  notifyPointerDown(button: number): void {
    if (button === 2) { this.rightHeld = true; this.rightPressed = true; }
  }
  notifyPointerUp(button: number): void { if (button === 2) this.rightHeld = false; }
  notifyWheel(deltaY: number): void { this.wheelDelta += deltaY; }
  consumeRightPressed(): boolean { const v=this.rightPressed; this.rightPressed=false; return v; }
  isRightHeld(): boolean { return this.rightHeld; }
  consumeWheelDirection(): -1|0|1 { if (!this.wheelDelta) return 0; const v=this.wheelDelta>0?1:-1; this.wheelDelta=0; return v; }
  endFrame(): void { this.pressed.clear(); this.rightPressed=false; this.wheelDelta=0; }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Tab') {
      event.preventDefault();
      this.pressed.add(event.shiftKey ? 'partyPrevious' : 'partyNext');
      return;
    }
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Digit')) event.preventDefault();
    if (!event.repeat) this.pressed.add(action);
    this.held.add(action);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (action) this.held.delete(action);
  };
  private readonly onBlur = (): void => {
    this.held.clear(); this.pressed.clear(); this.rightHeld=false; this.rightPressed=false; this.wheelDelta=0;
  };
}
