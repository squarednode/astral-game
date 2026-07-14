export interface DeveloperState {
  panelOpen: boolean;
  godMode: boolean;
  enemyAiEnabled: boolean;
  enemyDamageEnabled: boolean;
  wavesEnabled: boolean;
  hitStopEnabled: boolean;
  damageNumbersEnabled: boolean;
  knockbackEnabled: boolean;
  cameraShakeEnabled: boolean;
  playerDamageFeedbackEnabled: boolean;
  enemyTelegraphsEnabled: boolean;
  movementDebugEnabled: boolean;
  noCooldowns: boolean;
}

export const developerState: DeveloperState = {
  panelOpen: false,
  godMode: false,
  enemyAiEnabled: true,
  enemyDamageEnabled: true,
  wavesEnabled: true,
  hitStopEnabled: true,
  damageNumbersEnabled: true,
  knockbackEnabled: true,
  cameraShakeEnabled: true,
  playerDamageFeedbackEnabled: true,
  enemyTelegraphsEnabled: true,
  movementDebugEnabled: true,
  noCooldowns: false,
};
