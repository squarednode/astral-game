import type {
  InputAction,
  InputBindingProfile,
  InputSettings,
} from './InputTypes';

export const DEFAULT_INPUT_SETTINGS: InputSettings = {
  movementControlScheme: 'hybrid',
  clickToAttack: false,
  faceAimDirection: true,
  gamepadDeadzone: 0.18,
  gamepadTriggerThreshold: 0.35,
  gamepadAimSensitivity: 1,
};

export const KEY_BINDINGS: Readonly<Partial<Record<string, InputAction>>> = {
  KeyW: 'moveUp',
  KeyS: 'moveDown',
  KeyA: 'moveLeft',
  KeyD: 'moveRight',
  KeyR: 'dodge',
  Space: 'jump',
  Digit1: 'ability1',
  Digit2: 'ability2',
  Digit3: 'ability3',
  Digit4: 'ability4',
  KeyI: 'toggleInventory',
  Escape: 'toggleSettings',
  KeyP: 'toggleDeveloperConsole',
  KeyU: 'toggleDeveloperHud',
};

/** Standard browser Gamepad API mapping. */
export const GAMEPAD_BUTTON_BINDINGS: Readonly<
  Partial<Record<number, InputAction>>
> = {
  0: 'dodge',          // A / Cross
  1: 'ability3',       // B / Circle
  2: 'ability1',       // X / Square
  3: 'ability2',       // Y / Triangle
  4: 'partyPrevious',  // LB / L1
  5: 'partyNext',      // RB / R1
  7: 'primaryAttack',  // RT / R2 digital fallback
  8: 'toggleInventory',
  9: 'toggleSettings',
  10: 'ability4',      // Left stick press
  11: 'jump',          // Right stick press
};

export const DEFAULT_INPUT_PROFILE: InputBindingProfile = {
  keyboard: KEY_BINDINGS,
  gamepadButtons: GAMEPAD_BUTTON_BINDINGS,
};

export const ACTION_LABELS: Readonly<Record<InputAction, string>> = {
  moveUp: 'Move Up',
  moveDown: 'Move Down',
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  primaryAttack: 'Primary Attack',
  dodge: 'Dodge',
  jump: 'Jump',
  ability1: 'Ability 1',
  ability2: 'Ability 2',
  ability3: 'Ability 3',
  ability4: 'Ability 4',
  partyNext: 'Next Character',
  partyPrevious: 'Previous Character',
  toggleInventory: 'Inventory',
  toggleSettings: 'Settings / Pause',
  toggleDeveloperConsole: 'Developer Tools',
  toggleDeveloperHud: 'Developer HUD',
};

export const KEY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  Escape: 'Esc',
  Space: 'Space',
  Tab: 'Tab',
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
};
