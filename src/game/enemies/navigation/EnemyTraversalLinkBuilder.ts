import { Vector3 } from '@babylonjs/core';
import type { TraversalSurface } from '../../world/WorldTypes';
import type { EnemyTraversalLink } from './EnemyNavigationTypes';

export function buildEnemyTraversalLinks(
  surfaces: ReadonlyArray<TraversalSurface>,
): readonly EnemyTraversalLink[] {
  const links: EnemyTraversalLink[] = [];

  for (const surface of surfaces) {
    if (surface.mode === 'guided') {
      links.push({
        id: `enemy-link-${surface.id}-forward`,
        type: surface.frameDelta ? 'platform' : 'jump',
        entryPosition: surface.start.clone(),
        exitPosition: surface.end.clone(),
        activationRadius: Math.max(0.8, surface.width),
        bidirectional: true,
        platformId: surface.frameDelta ? surface.id : undefined,
      });
      continue;
    }

    const center = surface.center.clone();
    const height = surface.sampleHeight
      ? surface.sampleHeight(center.x, center.z)
      : surface.surfaceHeight;
    const offset = surface.shape === 'box'
      ? Math.max(surface.halfWidth, surface.halfDepth) + 0.8
      : surface.radius + 0.8;

    links.push({
      id: `enemy-link-${surface.id}`,
      type: surface.frameDelta ? 'platform' : height > 0.7 ? 'jump' : 'drop',
      entryPosition: new Vector3(center.x - offset, 0, center.z),
      exitPosition: new Vector3(center.x, height, center.z),
      activationRadius: 1.25,
      bidirectional: true,
      platformId: surface.frameDelta ? surface.id : undefined,
    });
  }

  return links;
}
