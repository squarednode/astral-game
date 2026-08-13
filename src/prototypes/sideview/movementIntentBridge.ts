export type MovementIntent = { x: number; z: number };
export type MovementIntentProvider = () => MovementIntent;

let provider: MovementIntentProvider = () => ({ x: 0, z: 0 });

export const movementIntent = {
  read: (): MovementIntent => provider(),
  setProvider: (next: MovementIntentProvider): void => { provider = next; },
  resetProvider: (): void => { provider = () => ({ x: 0, z: 0 }); },
};

(globalThis as typeof globalThis & { __astralMovementIntent?: typeof movementIntent }).__astralMovementIntent = movementIntent;
