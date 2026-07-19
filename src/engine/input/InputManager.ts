import {
  DEFAULT_INPUT_PROFILE,
  DEFAULT_INPUT_SETTINGS,
  KEY_DISPLAY_NAMES,
} from './InputBindings';
import type {
  InputAction,
  InputBindingProfile,
  InputContext,
  InputDevice,
  InputDiagnostics,
  InputSettings,
  InputVector2,
  MovementControlScheme,
  MovementMode,
  PointerButton,
} from './InputTypes';

const POINTER_BUTTONS: Readonly<Record<number, PointerButton>> = {
  0: 'left',
  1: 'middle',
  2: 'right',
};

const GAMEPLAY_ACTIONS = new Set<InputAction>([
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'primaryAttack',
  'interact',
  'dodge',
  'jump',
  'ability1',
  'ability2',
  'ability3',
  'ability4',
  'partyNext',
  'partyPrevious',
]);

export class InputManager {
  private readonly heldActions = new Set<InputAction>();
  private readonly pressedActions = new Set<InputAction>();
  private readonly releasedActions = new Set<InputAction>();
  private readonly heldPointerButtons = new Set<PointerButton>();
  private readonly pressedPointerButtons = new Set<PointerButton>();
  private readonly releasedPointerButtons = new Set<PointerButton>();
  private readonly priorGamepadButtons = new Map<number, boolean>();
  private wheelDelta = 0;
  private context: InputContext = 'gameplay';
  private activeDevice: InputDevice = 'keyboard-mouse';
  private settings: InputSettings = { ...DEFAULT_INPUT_SETTINGS };
  private profile: InputBindingProfile = cloneProfile(DEFAULT_INPUT_PROFILE);
  private escapePressed = false;
  private gamepadMove: InputVector2 = { x: 0, y: 0 };
  private gamepadAim: InputVector2 = { x: 0, y: 0 };
  private gamepadConnected = false;
  private gamepadId: string | undefined;

  constructor(private readonly target: Window = window) {
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
    this.target.addEventListener('gamepadconnected', this.onGamepadConnected);
    this.target.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.profile = this.loadProfile();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('gamepadconnected', this.onGamepadConnected);
    this.target.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.reset();
  }

  update(): void {
    this.pollGamepad();
  }

  applySettings(settings: InputSettings): void {
    this.settings = {
      ...settings,
      gamepadDeadzone: clamp(settings.gamepadDeadzone, 0, 0.75),
      gamepadTriggerThreshold: clamp(settings.gamepadTriggerThreshold, 0.05, 0.95),
      gamepadAimSensitivity: clamp(settings.gamepadAimSensitivity, 0.25, 2.5),
    };
  }

  setProfile(profile: InputBindingProfile): void {
    this.profile = cloneProfile(profile);
    this.persistProfile();
    this.reset();
  }

  getProfile(): InputBindingProfile {
    return cloneProfile(this.profile);
  }

  getKeyboardBinding(action: InputAction): string | undefined {
    return Object.entries(this.profile.keyboard)
      .find(([, mapped]) => mapped === action)?.[0];
  }

  rebindKeyboard(action: InputAction, code: string): void {
    if (!code || code === 'Escape') return;

    const keyboard = { ...this.profile.keyboard };
    const previousCode = Object.entries(keyboard)
      .find(([, mapped]) => mapped === action)?.[0];
    const displacedAction = keyboard[code];

    if (previousCode) delete keyboard[previousCode];
    delete keyboard[code];
    keyboard[code] = action;

    // Swap the displaced action onto the selected action's prior key when
    // possible so keyboard-only players do not silently lose a control.
    if (
      displacedAction &&
      displacedAction !== action &&
      previousCode &&
      previousCode !== code
    ) {
      keyboard[previousCode] = displacedAction;
    }

    this.profile = {
      keyboard,
      gamepadButtons: { ...this.profile.gamepadButtons },
    };
    this.persistProfile();
    this.reset();
  }

  resetBindings(): void {
    this.profile = cloneProfile(DEFAULT_INPUT_PROFILE);
    this.persistProfile();
    this.reset();
  }

  consumeEscapePressed(): boolean {
    if (!this.escapePressed) return false;
    this.escapePressed = false;
    return true;
  }

  setContext(context: InputContext): void {
    if (this.context === context) return;
    this.context = context;
    this.clearGameplayState();
  }

  getContext(): InputContext { return this.context; }
  getActiveDevice(): InputDevice { return this.activeDevice; }
  getMovementControlScheme(): MovementControlScheme {
    return this.settings.movementControlScheme;
  }

  /** Compatibility API for the existing movement controller. */
  getMovementMode(): MovementMode {
    if (this.settings.movementControlScheme === 'click-to-move') return 'click';
    if (
      this.settings.movementControlScheme === 'screen-relative' ||
      this.settings.movementControlScheme === 'mouse-relative'
    ) return 'wasd';
    return 'hybrid';
  }

  setMovementMode(mode: MovementMode): void {
    this.settings.movementControlScheme = mode === 'click'
      ? 'click-to-move'
      : mode === 'wasd'
        ? 'screen-relative'
        : 'hybrid';
  }

  isClickToAttackEnabled(): boolean { return this.settings.clickToAttack; }
  setClickToAttack(enabled: boolean): void { this.settings.clickToAttack = enabled; }
  shouldFaceAimDirection(): boolean { return this.settings.faceAimDirection; }

  isHeld(action: InputAction): boolean {
    return this.isActionAllowed(action) && this.heldActions.has(action);
  }

  consumePressed(action: InputAction): boolean {
    if (!this.isActionAllowed(action)) return false;
    return this.consumeFromSet(this.pressedActions, action);
  }

  consumeReleased(action: InputAction): boolean {
    if (!this.isActionAllowed(action)) return false;
    return this.consumeFromSet(this.releasedActions, action);
  }

  getMoveAxes(): { x: number; z: number } {
    if (this.context !== 'gameplay') return { x: 0, z: 0 };

    const keyboardX =
      (this.heldActions.has('moveRight') ? 1 : 0) -
      (this.heldActions.has('moveLeft') ? 1 : 0);
    const keyboardY =
      (this.heldActions.has('moveUp') ? 1 : 0) -
      (this.heldActions.has('moveDown') ? 1 : 0);

    if (Math.abs(this.gamepadMove.x) + Math.abs(this.gamepadMove.y) > 0.01) {
      return { x: this.gamepadMove.x, z: this.gamepadMove.y };
    }

    return { x: keyboardX, z: keyboardY };
  }

  getAimAxes(): InputVector2 {
    if (this.context !== 'gameplay') return { x: 0, y: 0 };
    return { ...this.gamepadAim };
  }

  hasGamepadAim(): boolean {
    return Math.hypot(this.gamepadAim.x, this.gamepadAim.y) > 0.1;
  }

  getBindingLabel(action: InputAction): string {
    if (this.activeDevice === 'gamepad') {
      const button = Object.entries(this.profile.gamepadButtons)
        .find(([, mapped]) => mapped === action)?.[0];
      if (button !== undefined) return gamepadButtonLabel(Number(button));
    }

    if (action === 'partyNext') return 'Tab';
    if (action === 'partyPrevious') return 'Shift+Tab';
    if (action === 'primaryAttack') return 'RMB';

    const code = Object.entries(this.profile.keyboard)
      .find(([, mapped]) => mapped === action)?.[0];
    if (!code) return '—';
    return KEY_DISPLAY_NAMES[code] ?? code
      .replace(/^Key/, '')
      .replace(/^Digit/, '');
  }

  getDiagnostics(): InputDiagnostics {
    const move = this.getMoveAxes();
    return {
      context: this.context,
      device: this.activeDevice,
      gamepadConnected: this.gamepadConnected,
      gamepadId: this.gamepadId,
      movementScheme: this.settings.movementControlScheme,
      moveAxes: { x: move.x, y: move.z },
      aimAxes: { ...this.gamepadAim },
    };
  }

  notifyPointerDown(buttonNumber: number): void {
    const button = POINTER_BUTTONS[buttonNumber];
    if (!button) return;
    this.activeDevice = 'keyboard-mouse';
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
    return this.context === 'gameplay' && this.heldPointerButtons.has(button);
  }

  consumePointerPressed(button: PointerButton): boolean {
    if (this.context !== 'gameplay') return false;
    return this.consumeFromSet(this.pressedPointerButtons, button);
  }

  consumePointerReleased(button: PointerButton): boolean {
    if (this.context !== 'gameplay') return false;
    return this.consumeFromSet(this.releasedPointerButtons, button);
  }

  notifyWheel(deltaY: number): void {
    this.activeDevice = 'keyboard-mouse';
    this.wheelDelta += deltaY;
  }

  consumeWheelDirection(): -1 | 0 | 1 {
    if (this.context !== 'gameplay' || this.wheelDelta === 0) return 0;
    const direction = this.wheelDelta > 0 ? 1 : -1;
    this.wheelDelta = 0;
    return direction;
  }

  endFrame(): void {
    this.escapePressed = false;
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.pressedPointerButtons.clear();
    this.releasedPointerButtons.clear();
    this.wheelDelta = 0;
  }

  resetAll(): void { this.reset(); }

  private isActionAllowed(action: InputAction): boolean {
    if (!GAMEPLAY_ACTIONS.has(action)) return true;
    return this.context === 'gameplay';
  }

  private pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find(
      (candidate): candidate is Gamepad => Boolean(candidate?.connected),
    );

    if (!pad) {
      this.gamepadConnected = false;
      this.gamepadId = undefined;
      this.gamepadMove = { x: 0, y: 0 };
      this.gamepadAim = { x: 0, y: 0 };
      return;
    }

    this.gamepadConnected = true;
    this.gamepadId = pad.id;

    this.gamepadMove = radialDeadzone(
      pad.axes[0] ?? 0,
      -(pad.axes[1] ?? 0),
      this.settings.gamepadDeadzone,
    );
    const aim = radialDeadzone(
      pad.axes[2] ?? 0,
      -(pad.axes[3] ?? 0),
      this.settings.gamepadDeadzone,
    );
    this.gamepadAim = {
      x: clamp(aim.x * this.settings.gamepadAimSensitivity, -1, 1),
      y: clamp(aim.y * this.settings.gamepadAimSensitivity, -1, 1),
    };

    const hasAnalogActivity =
      Math.hypot(this.gamepadMove.x, this.gamepadMove.y) > 0.08 ||
      Math.hypot(this.gamepadAim.x, this.gamepadAim.y) > 0.08;

    if (hasAnalogActivity) this.activeDevice = 'gamepad';

    for (let index = 0; index < pad.buttons.length; index += 1) {
      const button = pad.buttons[index];
      const down = button.pressed || button.value >= this.settings.gamepadTriggerThreshold;
      const prior = this.priorGamepadButtons.get(index) ?? false;
      const action = this.profile.gamepadButtons[index];

      if (action) {
        if (down && !prior) {
          this.pressedActions.add(action);
          this.activeDevice = 'gamepad';
        }
        if (down) this.heldActions.add(action);
        if (!down && prior) {
          this.heldActions.delete(action);
          this.releasedActions.add(action);
        }
      }

      this.priorGamepadButtons.set(index, down);
    }
  }

  private clearGameplayState(): void {
    for (const action of GAMEPLAY_ACTIONS) {
      this.heldActions.delete(action);
      this.pressedActions.delete(action);
      this.releasedActions.delete(action);
    }
    this.heldPointerButtons.clear();
    this.pressedPointerButtons.clear();
    this.releasedPointerButtons.clear();
    this.gamepadMove = { x: 0, y: 0 };
    this.gamepadAim = { x: 0, y: 0 };
  }

  private reset(): void {
    this.heldActions.clear();
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.heldPointerButtons.clear();
    this.pressedPointerButtons.clear();
    this.releasedPointerButtons.clear();
    this.priorGamepadButtons.clear();
    this.gamepadMove = { x: 0, y: 0 };
    this.gamepadAim = { x: 0, y: 0 };
    this.wheelDelta = 0;
  }

  private consumeFromSet<T>(set: Set<T>, value: T): boolean {
    if (!set.has(value)) return false;
    set.delete(value);
    return true;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.activeDevice = 'keyboard-mouse';

    if (event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.escapePressed = true;
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();
      if (!event.repeat) {
        this.pressedActions.add(
          event.shiftKey ? 'partyPrevious' : 'partyNext',
        );
      }
      return;
    }

    const action = this.profile.keyboard[event.code];
    if (!action) return;
    if (
      event.code === 'Space' ||
      event.code.startsWith('Digit')
    ) event.preventDefault();
    if (!event.repeat) this.pressedActions.add(action);
    this.heldActions.add(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = this.profile.keyboard[event.code];
    if (!action) return;
    this.heldActions.delete(action);
    this.releasedActions.add(action);
  };

  private readonly onBlur = (): void => { this.reset(); };

  private loadProfile(): InputBindingProfile {
    try {
      const raw = window.localStorage.getItem('astral.input-profile.v1');
      if (!raw) return cloneProfile(DEFAULT_INPUT_PROFILE);
      const parsed = JSON.parse(raw) as Partial<InputBindingProfile>;
      return {
        keyboard: parsed.keyboard
          ? { ...parsed.keyboard }
          : { ...DEFAULT_INPUT_PROFILE.keyboard },
        gamepadButtons: parsed.gamepadButtons
          ? { ...parsed.gamepadButtons }
          : { ...DEFAULT_INPUT_PROFILE.gamepadButtons },
      };
    } catch {
      return cloneProfile(DEFAULT_INPUT_PROFILE);
    }
  }

  private persistProfile(): void {
    try {
      window.localStorage.setItem(
        'astral.input-profile.v1',
        JSON.stringify(this.profile),
      );
    } catch {
      // Binding persistence is optional in restricted browser contexts.
    }
  }
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.reset();
  };
  private readonly onGamepadConnected = (event: GamepadEvent): void => {
    this.gamepadConnected = true;
    this.gamepadId = event.gamepad.id;
  };
  private readonly onGamepadDisconnected = (): void => {
    this.gamepadConnected = false;
    this.gamepadId = undefined;
    this.priorGamepadButtons.clear();
    this.gamepadMove = { x: 0, y: 0 };
    this.gamepadAim = { x: 0, y: 0 };
  };
}

function cloneProfile(profile: InputBindingProfile): InputBindingProfile {
  return {
    keyboard: { ...profile.keyboard },
    gamepadButtons: { ...profile.gamepadButtons },
  };
}

function radialDeadzone(x: number, y: number, deadzone: number): InputVector2 {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) return { x: 0, y: 0 };
  const normalized = (magnitude - deadzone) / (1 - deadzone);
  const scale = Math.min(1, normalized) / magnitude;
  return { x: x * scale, y: y * scale };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gamepadButtonLabel(index: number): string {
  const labels: Readonly<Record<number, string>> = {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    6: 'LT',
    7: 'RT',
    8: 'View',
    9: 'Menu',
    10: 'LS',
    11: 'RS',
  };
  return labels[index] ?? `B${index}`;
}
