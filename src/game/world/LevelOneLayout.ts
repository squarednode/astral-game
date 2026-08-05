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
    // Water is deliberately above the blockout terrain top so it cannot be
    // hidden by overlapping rectangular terrain shelves.
    water: 0.265,
    ocean: 0.26,
    bridgeTop: 0.285,
  },
  terrain: {
    beach: { x: 7, z: -27, width: 118, depth: 34 },
    forest: { x: 4, z: 17, width: 120, depth: 54 },
    ocean: { x: 7, z: -61, width: 126, depth: 42 },
    camp: { x: -8, z: 13, width: 23, depth: 17 },
    sandPit: { x: 20, z: -23, width: 15, depth: 12 },
  },
  points: {
    playerSpawn: { x: 38, y: 0.25, z: -25 },
    campSpawn: { x: -8, y: 0.25, z: 13 },
    bridge: { x: -27, y: 0.285, z: -2 },
    wolfDen: { x: 50, y: 0.25, z: 31 },
    bossPortal: { x: 53, y: 0.25, z: 25 },
    bossSpawn: { x: 0, y: 0.25, z: -18 },
    bossCenter: { x: 0, y: 0.25, z: 5 },
    developerGrounds: { x: 0, y: 0.25, z: -16 },
  },
  actors: {
    hunterMara: { x: -14, y: 0, z: 9 },
    campMerchant: { x: -4, y: 0, z: 13 },
    ferryCaptain: { x: 10, y: 0, z: 16 },
    villageElder: { x: -8, y: 0, z: 0 },
    blacksmith: { x: 8, y: 0, z: 0 },
  },
  bridge: { x: -27, z: -2, width: 7, depth: 14 },
  boundaries: {
    west: { x: -61, z: 2, width: 4, depth: 104 },
    east: { x: 69, z: 2, width: 4, depth: 104 },
    south: { x: 4, z: -82, width: 126, depth: 4 },
    north: { x: 4, z: 48, width: 126, depth: 4 },
  },
  river: {
    // Variable widths make a broad ocean mouth and a narrower upstream route.
    halfWidths: [8, 7, 6.4, 5.8, 5.2, 4.8, 4.4, 4.2],
    centers: [
      { x: -46, y: 0.265, z: -18 },
      { x: -39, y: 0.265, z: -11 },
      { x: -31, y: 0.265, z: -5 },
      { x: -21, y: 0.265, z: -1 },
      { x: -10, y: 0.265, z: 4 },
      { x: 1, y: 0.265, z: 11 },
      { x: 11, y: 0.265, z: 20 },
      { x: 19, y: 0.265, z: 32 },
    ],
  },
} as const;

export function levelPoint(point: LevelPoint): { x: number; y: number; z: number } {
  return { x: point.x, y: point.y, z: point.z };
}
