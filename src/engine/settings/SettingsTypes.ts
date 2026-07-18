import type { InputSettings } from '../input/InputTypes';

export interface AccessibilitySettings {
  uiScale: number;
  damageNumbers: boolean;
  notificationDuration: number;
  screenShake: number;
  telegraphIntensity: number;
}

export interface PlayerSettings {
  schemaVersion: 1;
  input: InputSettings;
  accessibility: AccessibilitySettings;
}

export type SettingsListener = (
  settings: Readonly<PlayerSettings>,
) => void;
