export type InputAction =
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'dodge' | 'jump'
  | 'ability1' | 'ability2' | 'ability3' | 'ability4'
  | 'partyNext' | 'partyPrevious' | 'toggleInventory';

export type MovementMode = 'hybrid' | 'wasd' | 'click';

export interface InputSettings {
  movementMode: MovementMode;
  clickToAttack: boolean;
}
