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
  worldCollisionEnabled: boolean;
  traversalHighlightsVisible: boolean;
  worldVolumeHighlightsVisible: boolean;
  enemySpawnCandidatesVisible: boolean;
  enemyTraversalLinksVisible: boolean;
  enemyNavigationRoutesVisible: boolean;
  enemyInvalidLandingsVisible: boolean;
}

export const developerState: DeveloperState = {
  panelOpen: false,
  godMode: false,
  enemyAiEnabled: true,
  enemyDamageEnabled: true,
  wavesEnabled: false,
  hitStopEnabled: true,
  damageNumbersEnabled: true,
  knockbackEnabled: true,
  cameraShakeEnabled: true,
  playerDamageFeedbackEnabled: true,
  enemyTelegraphsEnabled: true,
  movementDebugEnabled: true,
  noCooldowns: false,
  worldCollisionEnabled: true,
  traversalHighlightsVisible: false,
  worldVolumeHighlightsVisible: false,
  enemySpawnCandidatesVisible: false,
  enemyTraversalLinksVisible: false,
  enemyNavigationRoutesVisible: false,
  enemyInvalidLandingsVisible: false,
};

// The wave sandbox predates the authored world/encounter system. Keep the
// compatibility field for old developer UI code, but make it impossible to
// enable so legacy wave spawns cannot bleed into Level 1 or Level 2 testing.
Object.defineProperty(developerState, 'wavesEnabled', {
  configurable: false,
  enumerable: true,
  get: () => false,
  set: () => undefined,
});
