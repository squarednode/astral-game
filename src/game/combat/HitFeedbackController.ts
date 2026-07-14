import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from '@babylonjs/core';
import { DEFAULT_COMBAT_CONFIG } from './CombatConfig';
import type { CombatConfig } from './CombatConfig';
import type { HitWeight } from './CombatTypes';

interface FlashEffect { mesh: Mesh; target: Mesh; ttl: number; total: number; }

export class HitFeedbackController {
  private readonly flashes: FlashEffect[] = [];
  private readonly playerFlash = document.createElement('div');
  private playerFlashRemaining = 0;

  constructor(private readonly scene: Scene, private readonly config: Readonly<CombatConfig> = DEFAULT_COMBAT_CONFIG) {
    Object.assign(this.playerFlash.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '35', opacity: '0',
      background: 'radial-gradient(circle, transparent 35%, rgba(255,30,30,0.52) 100%)',
    });
    document.body.appendChild(this.playerFlash);
  }

  flashEnemy(target: Mesh, weight: HitWeight): void {
    const flash = MeshBuilder.CreateSphere('enemy-hit-flash', { diameter: weight === 'reaction' ? 2 : 1.65, segments: 10 }, this.scene);
    flash.isPickable = false;
    flash.position.copyFrom(target.position);
    const material = new StandardMaterial('enemy-hit-flash-mat', this.scene);
    material.disableLighting = true;
    material.emissiveColor = weight === 'reaction' ? new Color3(0.75, 0.9, 1) : Color3.White();
    material.alpha = 0.82;
    flash.material = material;
    const total = this.config.enemyFlashSeconds * (weight === 'light' ? 1 : 1.25);
    this.flashes.push({ mesh: flash, target, ttl: total, total });
  }

  flashPlayer(): void {
    this.playerFlashRemaining = this.config.playerHitFlashSeconds;
    this.playerFlash.style.opacity = '1';
  }

  update(dt: number): void {
    for (const flash of [...this.flashes]) {
      flash.ttl -= dt;
      if (!flash.target.isDisposed()) flash.mesh.position.copyFrom(flash.target.position);
      flash.mesh.visibility = Math.max(0, flash.ttl / flash.total);
      if (flash.ttl <= 0 || flash.target.isDisposed()) {
        flash.mesh.material?.dispose();
        flash.mesh.dispose();
        this.flashes.splice(this.flashes.indexOf(flash), 1);
      }
    }
    this.playerFlashRemaining = Math.max(0, this.playerFlashRemaining - dt);
    this.playerFlash.style.opacity = `${this.playerFlashRemaining / this.config.playerHitFlashSeconds}`;
  }

  dispose(): void {
    this.flashes.forEach(f => { f.mesh.material?.dispose(); f.mesh.dispose(); });
    this.flashes.length = 0;
    this.playerFlash.remove();
  }
}
