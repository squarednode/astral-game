import type { InputAction, InputSettings } from './InputTypes';

export const DEFAULT_INPUT_SETTINGS: InputSettings = {
  movementMode: 'hybrid',
  clickToAttack: false,
};

export const KEY_BINDINGS: Partial<Record<string, InputAction>> = {
  KeyW: 'moveUp', KeyS: 'moveDown', KeyA: 'moveLeft', KeyD: 'moveRight',
  KeyR: 'dodge', Space: 'jump',
  Digit1: 'ability1', Digit2: 'ability2', Digit3: 'ability3', Digit4: 'ability4',
  KeyI: 'toggleInventory',
};
