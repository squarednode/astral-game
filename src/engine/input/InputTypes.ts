export type InputAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'primaryAttack'
  | 'dodge'
  | 'jump'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'partyNext'
  | 'partyPrevious'
  | 'toggleInventory'
  | 'toggleSettings'
  | 'toggleDeveloperConsole'
  | 'toggleDeveloperHud';

export type InputContext =
  | 'gameplay'
  | 'inventory'
  | 'settings'
  | 'developer';

export type InputDevice = 'keyboard-mouse' | 'gamepad';

export type MovementControlScheme =
  | 'hybrid'
  | 'click-to-move'
  | 'screen-relative'
  | 'mouse-relative';

/** Compatibility alias used by the existing movement controller API. */
export type MovementMode = 'hybrid' | 'wasd' | 'click';

export type PointerButton = 'left' | 'middle' | 'right';

export interface InputSettings {
  movementControlScheme: MovementControlScheme;
  clickToAttack: boolean;
  faceAimDirection: boolean;
  gamepadDeadzone: number;
  gamepadTriggerThreshold: number;
  gamepadAimSensitivity: number;
}

export interface InputBindingProfile {
  keyboard: Readonly<Partial<Record<string, InputAction>>>;
  gamepadButtons: Readonly<Partial<Record<number, InputAction>>>;
}

export interface InputVector2 {
  x: number;
  y: number;
}

export interface InputDiagnostics {
  context: InputContext;
  device: InputDevice;
  gamepadConnected: boolean;
  gamepadId?: string;
  movementScheme: MovementControlScheme;
  moveAxes: InputVector2;
  aimAxes: InputVector2;
}
