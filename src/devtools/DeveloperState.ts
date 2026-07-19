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
