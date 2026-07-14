import { DEFAULT_INPUT_SETTINGS, KEY_BINDINGS } from './InputBindings';
import type {
  InputAction,
  InputSettings,
  MovementMode,
  PointerButton,
} from './InputTypes';

const POINTER_BUTTONS: Readonly<Record<number, PointerButton>> = {
  0: 'left',
  1: 'middle',
  2: 'right',
};

export class InputManager {
  private readonly heldActions = new Set<InputAction>();
  private readonly pressedActions = new Set<InputAction>();
  private readonly releasedActions = new Set<InputAction>();
  private readonly heldPointerButtons = new Set<PointerButton>();
  private readonly pressedPointerButtons = new Set<PointerButton>();
  private readonly releasedPointerButtons = new Set<PointerButton>();
  private wheelDelta = 0;
  private settings: InputSettings = { ...DEFAULT_INPUT_SETTINGS };

  constructor(private readonly target: Window = window) {
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.reset();
  }

  getMovementMode(): MovementMode { return this.settings.movementMode; }
  setMovementMode(mode: MovementMode): void { this.settings.movementMode = mode; }
  isClickToAttackEnabled(): boolean { return this.settings.clickToAttack; }
  setClickToAttack(enabled: boolean): void { this.settings.clickToAttack = enabled; }
  isHeld(action: InputAction): boolean { return this.heldActions.has(action); }

  consumePressed(action: InputAction): boolean {
    return this.consumeFromSet(this.pressedActions, action);
  }

  consumeReleased(action: InputAction): boolean {
    return this.consumeFromSet(this.releasedActions, action);
  }

  getMoveAxes(): { x: number; z: number } {
    return {
      x: (this.isHeld('moveRight') ? 1 : 0) - (this.isHeld('moveLeft') ? 1 : 0),
      z: (this.isHeld('moveUp') ? 1 : 0) - (this.isHeld('moveDown') ? 1 : 0),
    };
  }

  notifyPointerDown(buttonNumber: number): void {
    const button = POINTER_BUTTONS[buttonNumber];
    if (!button) return;
    if (!this.heldPointerButtons.has(button)) this.pressedPointerButtons.add(button);
    this.heldPointerButtons.add(button);
  }

  notifyPointerUp(buttonNumber: number): void {
    const button = POINTER_BUTTONS[buttonNumber];
    if (!button) return;
    this.heldPointerButtons.delete(button);
    this.releasedPointerButtons.add(button);
  }

  isPointerHeld(button: PointerButton): boolean {
    return this.heldPointerButtons.has(button);
  }

  consumePointerPressed(button: PointerButton): boolean {
    return this.consumeFromSet(this.pressedPointerButtons, button);
  }

  consumePointerReleased(button: PointerButton): boolean {
    return this.consumeFromSet(this.releasedPointerButtons, button);
  }

  notifyWheel(deltaY: number): void { this.wheelDelta += deltaY; }

  consumeWheelDirection(): -1 | 0 | 1 {
    if (this.wheelDelta === 0) return 0;
    const direction = this.wheelDelta > 0 ? 1 : -1;
    this.wheelDelta = 0;
    return direction;
  }

  endFrame(): void {
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.pressedPointerButtons.clear();
    this.releasedPointerButtons.clear();
    this.wheelDelta = 0;
  }

  private reset(): void {
    this.heldActions.clear();
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.heldPointerButtons.clear();
    this.pressedPointerButtons.clear();
    this.releasedPointerButtons.clear();
    this.wheelDelta = 0;
  }

  private consumeFromSet<T>(set: Set<T>, value: T): boolean {
    if (!set.has(value)) return false;
    set.delete(value);
    return true;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Tab') {
      event.preventDefault();
      if (!event.repeat) this.pressedActions.add(event.shiftKey ? 'partyPrevious' : 'partyNext');
      return;
    }

    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Digit')) event.preventDefault();
    if (!event.repeat) this.pressedActions.add(action);
    this.heldActions.add(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    this.heldActions.delete(action);
    this.releasedActions.add(action);
  };

  private readonly onBlur = (): void => { this.reset(); };
}

