import type { DeterministicCell, DeterministicMapDefinition, DeterministicSurface } from './DeterministicMap';

interface MutableGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: DeterministicCell[];
}


const isWalkable = (surface: DeterministicSurface): boolean => surface !== 'rock';

const validateRoute = (
  map: DeterministicMapDefinition,
  from: { x: number; z: number },
  to: { x: number; z: number },
  label: string,
): void => {
  const start = {
    column: Math.floor((from.x - map.originX) / map.cellSize),
    row: Math.floor((from.z - map.originZ) / map.cellSize),
  };
  const goal = {
    column: Math.floor((to.x - map.originX) / map.cellSize),
    row: Math.floor((to.z - map.originZ) / map.cellSize),
  };
  const key = (column: number, row: number) => `${column}:${row}`;
  const queue = [start];
  const visited = new Set([key(start.column, start.row)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.column === goal.column && current.row === goal.row) return;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const column = current.column + dx;
      const row = current.row + dz;
      if (column < 0 || row < 0 || column >= map.width || row >= map.height) continue;
      const visitKey = key(column, row);
      if (visited.has(visitKey)) continue;
      const cell = map.cells[row * map.width + column];
      if (!cell || !isWalkable(cell.surface)) continue;
      visited.add(visitKey);
      queue.push({ column, row });
    }
  }
  throw new Error(`Deterministic map route validation failed: ${label}.`);
};

const CELL_SIZE = 4;
const WIDTH = 32;
const HEIGHT = 28;
const ORIGIN_X = -64;
const ORIGIN_Z = -56;

const createGrid = (surface: DeterministicSurface): MutableGrid => ({
  width: WIDTH,
  height: HEIGHT,
  cells: Array.from({ length: WIDTH * HEIGHT }, () => ({ surface })),
});

const setCell = (grid: MutableGrid, column: number, row: number, surface: DeterministicSurface, elevation?: number): void => {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) return;
  grid.cells[row * grid.width + column] = elevation === undefined ? { surface } : { surface, elevation };
};

const fillRect = (
  grid: MutableGrid,
  column: number,
  row: number,
  width: number,
  height: number,
  surface: DeterministicSurface,
  elevation?: number,
): void => {
  for (let z = row; z < row + height; z += 1) {
    for (let x = column; x < column + width; x += 1) setCell(grid, x, z, surface, elevation);
  }
};

const worldToCell = (x: number, z: number): { column: number; row: number } => ({
  column: Math.floor((x - ORIGIN_X) / CELL_SIZE),
  row: Math.floor((z - ORIGIN_Z) / CELL_SIZE),
});

const stampDisc = (grid: MutableGrid, x: number, z: number, radius: number, surface: DeterministicSurface): void => {
  const min = worldToCell(x - radius, z - radius);
  const max = worldToCell(x + radius, z + radius);
  for (let row = min.row; row <= max.row; row += 1) {
    for (let column = min.column; column <= max.column; column += 1) {
      const centerX = ORIGIN_X + (column + 0.5) * CELL_SIZE;
      const centerZ = ORIGIN_Z + (row + 0.5) * CELL_SIZE;
      if (Math.hypot(centerX - x, centerZ - z) <= radius) setCell(grid, column, row, surface);
    }
  }
};

const stampRiver = (
  grid: MutableGrid,
  points: readonly { x: number; z: number; width: number }[],
): void => {
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const start = points[segment];
    const end = points[segment + 1];
    const distance = Math.hypot(end.x - start.x, end.z - start.z);
    const steps = Math.max(1, Math.ceil(distance / 2));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      stampDisc(
        grid,
        start.x + (end.x - start.x) * t,
        start.z + (end.z - start.z) * t,
        start.width + (end.width - start.width) * t,
        'shallow-water',
      );
    }
  }
};

function createMainMap(): DeterministicMapDefinition {
  const grid = createGrid('rock');

  // Authored playable silhouette. Outer rock cells are visible boundaries.
  fillRect(grid, 1, 1, WIDTH - 2, HEIGHT - 2, 'grass');
  fillRect(grid, 1, 1, WIDTH - 2, 6, 'deep-water');
  fillRect(grid, 1, 7, WIDTH - 2, 2, 'shallow-water');
  fillRect(grid, 1, 9, WIDTH - 2, 7, 'sand');
  fillRect(grid, 18, 10, 4, 3, 'slow-sand');

  // River is cut into the same deterministic cells as the land. It ends west
  // of the wolf den and never reaches the boss portal approach.
  stampRiver(grid, [
    { x: -54, z: -18, width: 8 },
    { x: -42, z: -11, width: 7 },
    { x: -30, z: -4, width: 6 },
    { x: -17, z: 1, width: 5.5 },
    { x: -5, z: 8, width: 5 },
    { x: 7, z: 17, width: 4.5 },
    { x: 15, z: 27, width: 4 },
  ]);

  // Guaranteed walkable crossings and authored points of interest.
  const bridge = worldToCell(-28, -2);
  fillRect(grid, bridge.column - 1, bridge.row - 2, 2, 5, 'bridge', 0.28);
  const westDock = worldToCell(10, 16);
  fillRect(grid, westDock.column - 1, westDock.row - 1, 2, 2, 'bridge', 0.28);
  const eastDock = worldToCell(24, 24);
  fillRect(grid, eastDock.column - 1, eastDock.row - 1, 2, 2, 'bridge', 0.28);

  // Portal and approach are explicitly grass, preventing hidden blockers.
  const portal = worldToCell(52, 28);
  fillRect(grid, portal.column - 2, portal.row - 2, 5, 5, 'grass');
  const den = worldToCell(52, 36);
  fillRect(grid, den.column - 2, den.row - 1, 5, 3, 'grass');

  const map: DeterministicMapDefinition = {
    id: 'main',
    cellSize: CELL_SIZE,
    originX: ORIGIN_X,
    originZ: ORIGIN_Z,
    width: WIDTH,
    height: HEIGHT,
    cells: grid.cells,
  };
  validateRoute(map, { x: 38, z: -25 }, { x: 53, z: 27 }, 'beach spawn to boss portal');
  return map;
}

function createBossMap(): DeterministicMapDefinition {
  const width = 24;
  const height = 18;
  const originX = -48;
  const originZ = -36;
  const grid: MutableGrid = {
    width,
    height,
    cells: Array.from({ length: width * height }, () => ({ surface: 'rock' as const })),
  };
  fillRect(grid, 1, 1, width - 2, height - 2, 'sand');
  // Keep a clear, guaranteed route from entry portal to arena center.
  fillRect(grid, 10, 1, 4, 8, 'sand');
  const map: DeterministicMapDefinition = {
    id: 'boss',
    cellSize: CELL_SIZE,
    originX,
    originZ,
    width,
    height,
    cells: grid.cells,
  };
  validateRoute(map, { x: 0, z: -24 }, { x: 0, z: 5 }, 'quarry entrance to boss center');
  return map;
}

export const LEVEL_ONE_MAIN_MAP = createMainMap();
export const LEVEL_ONE_BOSS_MAP = createBossMap();
