export * from './EncounterTypes';
export * from './EncounterRegistry';

import { EncounterManager as BaseEncounterManager } from './EncounterManager';
import type { EncounterRegistry } from './EncounterRegistry';
import type { EncounterRuntimeCallbacks } from './EncounterTypes';

export class EncounterManager extends BaseEncounterManager {
  constructor(registry: EncounterRegistry, callbacks: EncounterRuntimeCallbacks) {
    super(registry, callbacks);
    (globalThis as typeof globalThis & { __astralEncounterManager?: EncounterManager })
      .__astralEncounterManager = this;
  }
}
