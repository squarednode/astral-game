import { DEFAULT_INPUT_SETTINGS } from '../input/InputBindings';
import type { PlayerSettings, SettingsListener } from './SettingsTypes';

const STORAGE_KEY = 'astral.player-settings.v1';

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  schemaVersion: 1,
  input: { ...DEFAULT_INPUT_SETTINGS },
  accessibility: {
    uiScale: 1,
    damageNumbers: true,
    notificationDuration: 3.2,
    screenShake: 1,
    telegraphIntensity: 1,
  },
};

export class SettingsManager {
  private settings: PlayerSettings;
  private readonly listeners = new Set<SettingsListener>();

  constructor(private readonly storage: Storage | null = safeStorage()) {
    this.settings = this.load();
  }

  get(): Readonly<PlayerSettings> {
    return this.settings;
  }

  update(patch: Partial<PlayerSettings>): void {
    this.settings = {
      ...this.settings,
      ...patch,
      input: {
        ...this.settings.input,
        ...(patch.input ?? {}),
      },
      accessibility: {
        ...this.settings.accessibility,
        ...(patch.accessibility ?? {}),
      },
      schemaVersion: 1,
    };
    this.persist();
    this.emit();
  }

  reset(): void {
    this.settings = structuredClone(DEFAULT_PLAYER_SETTINGS);
    this.persist();
    this.emit();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.settings);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.settings);
  }

  private load(): PlayerSettings {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_PLAYER_SETTINGS);
      const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
      return {
        schemaVersion: 1,
        input: {
          ...DEFAULT_PLAYER_SETTINGS.input,
          ...(parsed.input ?? {}),
        },
        accessibility: {
          ...DEFAULT_PLAYER_SETTINGS.accessibility,
          ...(parsed.accessibility ?? {}),
        },
      };
    } catch {
      return structuredClone(DEFAULT_PLAYER_SETTINGS);
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Persistence is optional in restricted/private browser contexts.
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
