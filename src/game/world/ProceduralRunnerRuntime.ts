import type { ProceduralRunnerMap } from './ProceduralRunnerMap';

export interface ActiveProceduralRunnerWorld {
  readonly token: symbol;
  readonly map: ProceduralRunnerMap;
  readonly originX: number;
  readonly originZ: number;
  readonly cellSize: number;
}

let activeRunner: ActiveProceduralRunnerWorld | null = null;

export function publishProceduralRunnerWorld(
  map: ProceduralRunnerMap,
  originX: number,
  originZ: number,
  cellSize: number,
): ActiveProceduralRunnerWorld {
  const runtime: ActiveProceduralRunnerWorld = {
    token: Symbol('procedural-runner-world'),
    map,
    originX,
    originZ,
    cellSize,
  };
  activeRunner = runtime;
  return runtime;
}

export function clearProceduralRunnerWorld(runtime: ActiveProceduralRunnerWorld): void {
  if (activeRunner?.token === runtime.token) activeRunner = null;
}

export function getActiveProceduralRunnerWorld(): ActiveProceduralRunnerWorld | null {
  return activeRunner;
}
