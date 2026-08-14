export type RunnerDirection = 'N' | 'E' | 'S' | 'W';
export type RunnerChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
export type RunnerChunkRole = 'main' | 'secret';

export interface RunnerGridPoint { x: number; z: number }
export interface RunnerChunk {
  id: string;
  cell: RunnerGridPoint;
  role: RunnerChunkRole;
  type: RunnerChunkType;
  sockets: RunnerDirection[];
  neighbors: string[];
  mainIndex: number | null;
  branchIndex: number | null;
}
export interface ProceduralRunnerMap {
  seed: number;
  chunks: RunnerChunk[];
  startId: string;
  exitId: string;
  endIds: string[];
  mainIds: string[];
  branchIds: string[];
}
export interface ProceduralRunnerConfig {
  totalChunks: number;
  minimumMainChunks: number;
  maximumMainChunks: number;
  minimumBranchChunks: number;
}

export const DEFAULT_RUNNER_CONFIG: ProceduralRunnerConfig = {
  totalChunks: 10,
  minimumMainChunks: 6,
  maximumMainChunks: 8,
  minimumBranchChunks: 2,
};

const DIRS: readonly RunnerDirection[] = ['N', 'E', 'S', 'W'];
export const RUNNER_DELTA: Readonly<Record<RunnerDirection, RunnerGridPoint>> = {
  N: { x: 0, z: -1 }, E: { x: 1, z: 0 }, S: { x: 0, z: 1 }, W: { x: -1, z: 0 },
};
export const RUNNER_OPPOSITE: Readonly<Record<RunnerDirection, RunnerDirection>> = {
  N: 'S', E: 'W', S: 'N', W: 'E',
};

interface Rng {
  next(): number;
  int(min: number, max: number): number;
  shuffle<T>(items: readonly T[]): T[];
}

const keyOf = (cell: RunnerGridPoint): string => `${cell.x},${cell.z}`;
const addCell = (cell: RunnerGridPoint, direction: RunnerDirection): RunnerGridPoint => ({
  x: cell.x + RUNNER_DELTA[direction].x,
  z: cell.z + RUNNER_DELTA[direction].z,
});

function createRng(seed: number): Rng {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    shuffle: <T>(items: readonly T[]): T[] => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

function directionBetween(a: RunnerGridPoint, b: RunnerGridPoint): RunnerDirection {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx === 1 && dz === 0) return 'E';
  if (dx === -1 && dz === 0) return 'W';
  if (dx === 0 && dz === 1) return 'S';
  if (dx === 0 && dz === -1) return 'N';
  throw new Error(`Runner cells are not cardinal neighbors: ${keyOf(a)} -> ${keyOf(b)}`);
}

function cardinalNeighbors(cell: RunnerGridPoint): RunnerGridPoint[] {
  return DIRS.map(direction => addCell(cell, direction));
}

function candidateIsClean(
  candidate: RunnerGridPoint,
  occupied: Map<string, RunnerGridPoint>,
  allowedTouch: RunnerGridPoint,
): boolean {
  if (occupied.has(keyOf(candidate))) return false;
  for (const neighbor of cardinalNeighbors(candidate)) {
    if (!occupied.has(keyOf(neighbor))) continue;
    if (neighbor.x === allowedTouch.x && neighbor.z === allowedTouch.z) continue;
    return false;
  }
  return true;
}

function growSelfAvoidingPath(
  rng: Rng,
  start: RunnerGridPoint,
  count: number,
  occupied: Map<string, RunnerGridPoint>,
  preferredDirection?: RunnerDirection,
): RunnerGridPoint[] | null {
  const path: RunnerGridPoint[] = [{ ...start }];
  const added: RunnerGridPoint[] = [];
  const recurse = (current: RunnerGridPoint, remaining: number): boolean => {
    if (remaining === 0) return true;
    let directions = rng.shuffle(DIRS);
    if (path.length === 1 && preferredDirection) {
      directions = [preferredDirection, ...directions.filter(direction => direction !== preferredDirection)];
    }
    for (const direction of directions) {
      const candidate = addCell(current, direction);
      if (!candidateIsClean(candidate, occupied, current)) continue;
      occupied.set(keyOf(candidate), candidate);
      added.push(candidate);
      path.push(candidate);
      if (recurse(candidate, remaining - 1)) return true;
      path.pop();
      added.pop();
      occupied.delete(keyOf(candidate));
    }
    return false;
  };
  if (recurse(start, count - 1)) return path;
  added.forEach(cell => occupied.delete(keyOf(cell)));
  return null;
}

function deriveType(sockets: readonly RunnerDirection[], endpoint: 'start' | 'exit' | 'end' | null): RunnerChunkType {
  if (endpoint) return endpoint;
  if (sockets.length === 4) return 'plus';
  if (sockets.length === 3) return 't';
  if (sockets.length === 2) return RUNNER_OPPOSITE[sockets[0]] === sockets[1] ? 'straight' : 'l';
  throw new Error(`Unsupported runner socket count ${sockets.length}.`);
}

export function createProceduralRunnerMap(
  seed: number,
  config: Readonly<ProceduralRunnerConfig> = DEFAULT_RUNNER_CONFIG,
): ProceduralRunnerMap {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const rng = createRng((seed + attempt * 2654435761) >>> 0);
    const mainCount = rng.int(config.minimumMainChunks, config.maximumMainChunks);
    const branchCount = config.totalChunks - mainCount;
    if (branchCount < config.minimumBranchChunks) continue;

    const occupied = new Map<string, RunnerGridPoint>();
    const origin = { x: 0, z: 0 };
    occupied.set(keyOf(origin), origin);
    const main = growSelfAvoidingPath(rng, origin, mainCount, occupied, 'E');
    if (!main) continue;

    const branchCandidates = rng.shuffle(
      main.map((cell, index) => ({ cell, index })).filter(({ index }) => index >= 1 && index <= main.length - 2),
    );
    let branch: RunnerGridPoint[] | null = null;
    let branchRootIndex = -1;

    for (const candidate of branchCandidates) {
      const used = new Set<RunnerDirection>();
      if (candidate.index > 0) used.add(directionBetween(candidate.cell, main[candidate.index - 1]));
      if (candidate.index < main.length - 1) used.add(directionBetween(candidate.cell, main[candidate.index + 1]));
      for (const direction of rng.shuffle(DIRS.filter(value => !used.has(value)))) {
        const first = addCell(candidate.cell, direction);
        if (!candidateIsClean(first, occupied, candidate.cell)) continue;
        occupied.set(keyOf(first), first);
        const path = growSelfAvoidingPath(rng, first, branchCount, occupied, direction);
        if (path) {
          branch = path;
          branchRootIndex = candidate.index;
          break;
        }
        occupied.delete(keyOf(first));
      }
      if (branch) break;
    }
    if (!branch || branchRootIndex < 0) continue;

    const idByCell = new Map<string, string>();
    main.forEach((cell, index) => idByCell.set(keyOf(cell), `main-${index}`));
    branch.forEach((cell, index) => idByCell.set(keyOf(cell), `secret-${index}`));

    const build = (
      cell: RunnerGridPoint,
      role: RunnerChunkRole,
      mainIndex: number | null,
      branchIndex: number | null,
    ): RunnerChunk => {
      const id = idByCell.get(keyOf(cell));
      if (!id) throw new Error('Generated runner cell is missing an id.');
      const sockets: RunnerDirection[] = [];
      const neighbors: string[] = [];
      for (const direction of DIRS) {
        const neighborId = idByCell.get(keyOf(addCell(cell, direction)));
        if (!neighborId) continue;
        sockets.push(direction);
        neighbors.push(neighborId);
      }
      let endpoint: 'start' | 'exit' | 'end' | null = null;
      if (mainIndex === 0) endpoint = 'start';
      else if (mainIndex === main.length - 1) endpoint = 'exit';
      else if (branchIndex === branch.length - 1) endpoint = 'end';
      return {
        id,
        cell: { ...cell },
        role,
        type: deriveType(sockets, endpoint),
        sockets,
        neighbors,
        mainIndex,
        branchIndex,
      };
    };

    const chunks: RunnerChunk[] = [];
    main.forEach((cell, index) => chunks.push(build(cell, 'main', index, null)));
    branch.forEach((cell, index) => chunks.push(build(cell, 'secret', null, index)));
    const junction = chunks.find(chunk => chunk.mainIndex === branchRootIndex);
    if (!junction || junction.sockets.length < 3) continue;

    return {
      seed: seed >>> 0,
      chunks,
      startId: 'main-0',
      exitId: `main-${main.length - 1}`,
      endIds: [`secret-${branch.length - 1}`],
      mainIds: main.map((_, index) => `main-${index}`),
      branchIds: branch.map((_, index) => `secret-${index}`),
    };
  }
  throw new Error(`Unable to generate ${config.totalChunks}-chunk runner map for seed ${seed}.`);
}
