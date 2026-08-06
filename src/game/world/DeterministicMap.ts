import { Color3, Vector3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance, LevelSpaceId } from './LevelInstanceSystem';
import { LevelInstanceBuilder } from './LevelInstanceBuilderSupport';
import type { WorldVolume } from './WorldVolumeTypes';

export type DeterministicSurface =
  | 'grass'
  | 'sand'
  | 'slow-sand'
  | 'shallow-water'
  | 'deep-water'
  | 'bridge'
  | 'rock';

export interface DeterministicCell {
  readonly surface: DeterministicSurface;
  readonly elevation?: number;
}

export interface DeterministicMapDefinition {
  readonly id: LevelSpaceId;
  readonly cellSize: number;
  readonly originX: number;
  readonly originZ: number;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly DeterministicCell[];
}

export interface DeterministicMapBuildResult {
  readonly builder: LevelInstanceBuilder;
  readonly map: DeterministicMapDefinition;
}

const SURFACE_COLORS: Readonly<Record<Exclude<DeterministicSurface, 'shallow-water' | 'deep-water' | 'bridge'>, Color3>> = {
  grass: new Color3(0.16, 0.29, 0.14),
  sand: new Color3(0.72, 0.59, 0.4),
  'slow-sand': new Color3(0.64, 0.45, 0.29),
  rock: new Color3(0.29, 0.31, 0.3),
};

const WATER_COLOR = new Color3(0.03, 0.43, 0.72);

export function deterministicCellIndex(map: DeterministicMapDefinition, column: number, row: number): number {
  return row * map.width + column;
}

export function deterministicCellAt(
  map: DeterministicMapDefinition,
  column: number,
  row: number,
): DeterministicCell | null {
  if (column < 0 || row < 0 || column >= map.width || row >= map.height) return null;
  return map.cells[deterministicCellIndex(map, column, row)] ?? null;
}

export function deterministicWorldToCell(
  map: DeterministicMapDefinition,
  x: number,
  z: number,
): { column: number; row: number } {
  return {
    column: Math.floor((x - map.originX) / map.cellSize),
    row: Math.floor((z - map.originZ) / map.cellSize),
  };
}

export function deterministicCellCenter(
  map: DeterministicMapDefinition,
  column: number,
  row: number,
): { x: number; z: number } {
  return {
    x: map.originX + (column + 0.5) * map.cellSize,
    z: map.originZ + (row + 0.5) * map.cellSize,
  };
}

export function deterministicSurfaceAtWorld(
  map: DeterministicMapDefinition,
  x: number,
  z: number,
): DeterministicSurface | 'outside' {
  const { column, row } = deterministicWorldToCell(map, x, z);
  return deterministicCellAt(map, column, row)?.surface ?? 'outside';
}

function addRunVolume(
  builder: LevelInstanceBuilder,
  map: DeterministicMapDefinition,
  row: number,
  startColumn: number,
  endColumn: number,
  surface: DeterministicSurface,
  sequence: number,
): void {
  const start = deterministicCellCenter(map, startColumn, row);
  const end = deterministicCellCenter(map, endColumn, row);
  const centerX = (start.x + end.x) / 2;
  const centerZ = start.z;
  const width = (endColumn - startColumn + 1) * map.cellSize;
  const base: Pick<WorldVolume, 'id' | 'label' | 'footprint'> = {
    id: `${map.id}-${surface}-${row}-${sequence}`,
    label: surface,
    footprint: {
      shape: 'box',
      centerX,
      centerZ,
      halfWidth: width / 2,
      halfDepth: map.cellSize / 2,
    },
  };

  if (surface === 'slow-sand') {
    builder.worldVolumes.push({
      ...base,
      kind: 'modifier',
      speedMultiplier: 0.5,
      disableDodge: true,
      groundContactOnly: true,
    });
  } else if (surface === 'shallow-water') {
    builder.worldVolumes.push({
      ...base,
      kind: 'modifier',
      speedMultiplier: 0.65,
      groundContactOnly: true,
      maximumY: 0.2,
    });
  } else if (surface === 'deep-water') {
    builder.worldVolumes.push({
      ...base,
      kind: 'water-hazard',
      speedMultiplier: 0.25,
      drownSeconds: 5,
      disableJump: true,
      disableDodge: true,
      bankAxis: 'z',
      bankCenter: centerZ + map.cellSize / 2,
      recoveryPadding: 0.5,
      maximumY: 0.2,
    });
  }
}

/**
 * Builds a level exclusively from explicit deterministic cells. Visual ground,
 * water, collision, movement modifiers, and traversal support all originate
 * from the same cell data.
 */
export function buildDeterministicMap(
  map: DeterministicMapDefinition,
  options: OutdoorZoneBuildOptions,
): DeterministicMapBuildResult {
  if (map.cells.length !== map.width * map.height) {
    throw new Error(`Deterministic map ${map.id} has ${map.cells.length} cells; expected ${map.width * map.height}.`);
  }

  const builder = new LevelInstanceBuilder(map.id, options);
  let runSequence = 0;

  for (let row = 0; row < map.height; row += 1) {
    let column = 0;
    while (column < map.width) {
      const cell = deterministicCellAt(map, column, row);
      if (!cell) break;
      let endColumn = column;
      while (
        endColumn + 1 < map.width
        && deterministicCellAt(map, endColumn + 1, row)?.surface === cell.surface
        && deterministicCellAt(map, endColumn + 1, row)?.elevation === cell.elevation
      ) {
        endColumn += 1;
      }

      const first = deterministicCellCenter(map, column, row);
      const last = deterministicCellCenter(map, endColumn, row);
      const centerX = (first.x + last.x) / 2;
      const centerZ = first.z;
      const width = (endColumn - column + 1) * map.cellSize;
      const depth = map.cellSize;
      const elevation = cell.elevation ?? 0.24;
      const runId = `${cell.surface}-${row}-${runSequence}`;

      switch (cell.surface) {
        case 'grass':
        case 'sand':
        case 'slow-sand':
          builder.ground(runId, centerX, centerZ, width, depth, SURFACE_COLORS[cell.surface], elevation);
          addRunVolume(builder, map, row, column, endColumn, cell.surface, runSequence);
          break;
        case 'shallow-water':
        case 'deep-water': {
          // A low floor below water provides reliable ground contact while the
          // visible water surface and gameplay volume come from this same run.
          builder.ground(`${runId}-bed`, centerX, centerZ, width, depth, new Color3(0.26, 0.38, 0.31), 0.08);
          const water = builder.water(runId, centerX, centerZ, width, depth, 0.11);
          water.material = options.material(`${map.id}-water`, WATER_COLOR, 0.2);
          water.renderingGroupId = 1;
          addRunVolume(builder, map, row, column, endColumn, cell.surface, runSequence);
          break;
        }
        case 'bridge':
          builder.bridge(runId, centerX, centerZ, width, depth, elevation);
          break;
        case 'rock': {
          builder.box(runId, centerX, centerZ, width, depth, 2.8, SURFACE_COLORS.rock);
          builder.boxCollider(runId, centerX, centerZ, width, depth, 'solid', 2.8);
          break;
        }
      }

      runSequence += 1;
      column = endColumn + 1;
    }
  }

  return { builder, map };
}

export function finishDeterministicMap(
  result: DeterministicMapBuildResult,
  update: (dt: number) => void = () => undefined,
): LevelInstance {
  return result.builder.finish(update);
}

export function deterministicMapSnapshot(map: DeterministicMapDefinition, position?: Vector3) {
  const surface = position
    ? deterministicSurfaceAtWorld(map, position.x, position.z)
    : null;
  const cell = position
    ? deterministicWorldToCell(map, position.x, position.z)
    : null;
  return {
    id: map.id,
    width: map.width,
    height: map.height,
    cellSize: map.cellSize,
    originX: map.originX,
    originZ: map.originZ,
    position: position ? { x: position.x, y: position.y, z: position.z } : null,
    cell,
    surface,
  };
}
