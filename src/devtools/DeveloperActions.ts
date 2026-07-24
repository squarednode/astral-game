export interface DeveloperActions {
  restorePartyHealth(): void;
  resetCooldowns(): void;
  spawnEnemy(elite: boolean): void;
  killAllEnemies(): void;
  startNextWave(): void;
  spawnLoot(rarity: 'common' | 'magic' | 'rare' | 'legendary'): void;
  clearInventory(): void;
  activateNearestCheckpoint(): void;
  clearCheckpoint(): void;
  forceCheckpointRespawn(): void;
  teleportToActiveCheckpoint(): void;
  teleportToLandmark(landmarkId: string): void;
  setWorldCollision(enabled: boolean): void;
  setTraversalHighlightsVisible(visible: boolean): void;
  setWorldVolumeHighlightsVisible(visible: boolean): void;
  getStatus(): {
    wave: number;
    enemies: number;
    loot: number;
    activeCharacter: string;
    checkpoint: string;
  };
}
