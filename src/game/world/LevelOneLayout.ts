export interface LevelPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LevelRect {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

export const LEVEL_ONE_LAYOUT = {
  elevation: {
    landTop: 0.24,
    water: 0.18,
    ocean: 0.16,
    bridgeTop: 0.28,
  },
  terrain: {
    beach: { x: 8, z: -31, width: 112, depth: 32 },
    forest: { x: 8, z: 14, width: 112, depth: 44 },
    ocean: { x: 8, z: -56, width: 128, depth: 22 },
    camp: { x: -9, z: 11, width: 22, depth: 16 },
    sandPit: { x: 4, z: -18, width: 13, depth: 12 },
  },
  points: {
    playerSpawn: { x: 38, y: 0.25, z: -34 },
    campSpawn: { x: -8, y: 0.25, z: 10 },
    bridge: { x: -24, y: 0.28, z: -5 },
    wolfDen: { x: 55, y: 0.25, z: 35 },
    bossPortal: { x: 55, y: 0.25, z: 28 },
    bossSpawn: { x: 0, y: 0.25, z: 82 },
    bossCenter: { x: 0, y: 0.25, z: 105 },
    developerGrounds: { x: 220, y: 0.25, z: 0 },
  },
  actors: {
    hunterMara: { x: -14, y: 0, z: 7 },
    campMerchant: { x: -4, y: 0, z: 11 },
    ferryCaptain: { x: 19, y: 0, z: 5 },
    villageElder: { x: 212, y: 0, z: -3 },
    blacksmith: { x: 228, y: 0, z: -3 },
  },
  bridge: { x: -24, z: -5, width: 5.5, depth: 13 },
  routeBarrier: {
    segments: [
      { x: 29, z: -10.5, width: 42, depth: 3.5 },
      { x: 55, z: -10.5, width: 12, depth: 3.5 },
    ],
  },
  boundaries: {
    west: { x: -48, z: 7, width: 4, depth: 82 },
    east: { x: 65, z: 7, width: 4, depth: 82 },
    southA: { x: -28, z: -50, width: 42, depth: 4 },
    southB: { x: 35, z: -50, width: 56, depth: 4 },
    north: { x: 8, z: 43, width: 112, depth: 4 },
  },
  river: {
    halfWidth: 4.7,
    centers: [
      { x: -50, y: 0.18, z: -8 },
      { x: -34, y: 0.18, z: -5 },
      { x: -18, y: 0.18, z: -2 },
      { x: 0, y: 0.18, z: -1 },
      { x: 18, y: 0.18, z: 2 },
      { x: 32, y: 0.18, z: 9 },
      { x: 43, y: 0.18, z: 20 },
      { x: 52, y: 0.18, z: 34 },
    ],
  },
} as const;

export function levelPoint(point: LevelPoint): { x: number; y: number; z: number } {
  return { x: point.x, y: point.y, z: point.z };
}
