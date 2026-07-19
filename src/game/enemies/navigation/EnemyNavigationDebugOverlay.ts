import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type {
  EnemySpawnCandidateDebug,
  EnemyTraversalLink,
} from './EnemyNavigationTypes';

export interface EnemyNavigationDebugSettings {
  showSpawnCandidates: boolean;
  showTraversalLinks: boolean;
  showPlannedMovement: boolean;
  showInvalidLandingPoints: boolean;
}

export class EnemyNavigationDebugOverlay {
  private readonly meshes: Mesh[] = [];
  private settings: EnemyNavigationDebugSettings = {
    showSpawnCandidates: false,
    showTraversalLinks: false,
    showPlannedMovement: false,
    showInvalidLandingPoints: false,
  };

  constructor(
    private readonly scene: Scene,
    links: ReadonlyArray<EnemyTraversalLink>,
  ) {
    this.createTraversalMeshes(links);
  }

  setSettings(settings: Partial<EnemyNavigationDebugSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.refreshVisibility();
  }

  showSpawnCandidates(candidates: readonly EnemySpawnCandidateDebug[]): void {
    this.disposeByPrefix('enemy-spawn-debug');
    if (!this.settings.showSpawnCandidates) return;
    candidates.forEach((candidate, index) => {
      if (!candidate.valid && !this.settings.showInvalidLandingPoints) return;
      const marker = MeshBuilder.CreateSphere(
        `enemy-spawn-debug-${index}`,
        { diameter: 0.22, segments: 8 },
        this.scene,
      );
      marker.position.copyFrom(candidate.position);
      marker.position.y += 0.12;
      marker.material = this.material(
        candidate.valid ? new Color3(0.2, 1, 0.35) : new Color3(1, 0.2, 0.15),
      );
      this.meshes.push(marker);
    });
  }

  showRoute(id: string, start: Vector3, end: Vector3, blocked: boolean): void {
    this.disposeByPrefix(`enemy-route-${id}`);
    if (!this.settings.showPlannedMovement) return;
    const delta = end.subtract(start);
    const length = delta.length();
    if (length <= 0.001) return;
    const line = MeshBuilder.CreateBox(
      `enemy-route-${id}`,
      { width: 0.045, height: 0.045, depth: length },
      this.scene,
    );
    line.position.copyFrom(Vector3.Lerp(start, end, 0.5));
    line.rotation.y = Math.atan2(delta.x, delta.z);
    line.material = this.material(
      blocked ? new Color3(1, 0.18, 0.12) : new Color3(0.2, 1, 0.4),
    );
    this.meshes.push(line);
  }

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.meshes.length = 0;
  }

  private createTraversalMeshes(links: ReadonlyArray<EnemyTraversalLink>): void {
    for (const link of links) {
      const delta = link.exitPosition.subtract(link.entryPosition);
      const length = Math.max(0.1, delta.length());
      const mesh = MeshBuilder.CreateBox(
        `enemy-traversal-debug-${link.id}`,
        { width: 0.08, height: 0.08, depth: length },
        this.scene,
      );
      mesh.position.copyFrom(Vector3.Lerp(link.entryPosition, link.exitPosition, 0.5));
      mesh.rotation.y = Math.atan2(delta.x, delta.z);
      mesh.material = this.material(
        link.type === 'jump'
          ? new Color3(0.2, 0.55, 1)
          : link.type === 'drop'
            ? new Color3(1, 0.75, 0.15)
            : new Color3(0.75, 0.3, 1),
      );
      mesh.visibility = 0;
      this.meshes.push(mesh);
    }
  }

  private refreshVisibility(): void {
    this.meshes
      .filter(mesh => mesh.name.startsWith('enemy-traversal-debug'))
      .forEach(mesh => {
        mesh.visibility = this.settings.showTraversalLinks ? 0.7 : 0;
      });
  }

  private disposeByPrefix(prefix: string): void {
    for (const mesh of [...this.meshes]) {
      if (!mesh.name.startsWith(prefix)) continue;
      mesh.dispose();
      this.meshes.splice(this.meshes.indexOf(mesh), 1);
    }
  }

  private material(color: Color3): StandardMaterial {
    const material = new StandardMaterial(`enemy-navigation-debug-${Math.random()}`, this.scene);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.6);
    material.alpha = 0.75;
    return material;
  }
}
