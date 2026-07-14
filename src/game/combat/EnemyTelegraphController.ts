import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from '@babylonjs/core';
import { DEFAULT_COMBAT_CONFIG } from './CombatConfig';
import type { CombatConfig } from './CombatConfig';

interface State {
  mesh: Mesh;
  target: Mesh;
  phase: 'windup' | 'recovery';
  timeRemaining: number;
  elite: boolean;
  onStrike: () => void;
}

export class EnemyTelegraphController {
  private readonly states = new Map<Mesh, State>();
  constructor(private readonly scene: Scene, private readonly config: Readonly<CombatConfig> = DEFAULT_COMBAT_CONFIG) {}

  isBusy(target: Mesh): boolean { return this.states.has(target); }

  begin(target: Mesh, elite: boolean, onStrike: () => void): boolean {
    if (this.states.has(target) || target.isDisposed()) return false;
    const radius = elite ? this.config.eliteTelegraphRadius : this.config.telegraphRadius;
    const marker = MeshBuilder.CreateCylinder('enemy-telegraph', { diameter: radius * 2, height: 0.035, tessellation: 48 }, this.scene);
    marker.isPickable = false;
    marker.position.copyFrom(target.position);
    marker.position.y = 0.035;
    const material = new StandardMaterial('enemy-telegraph-material', this.scene);
    material.disableLighting = true;
    material.emissiveColor = elite ? new Color3(1, 0.12, 0.58) : new Color3(1, 0.18, 0.12);
    material.alpha = 0.32;
    marker.material = material;
    this.states.set(target, {
      mesh: marker, target, phase: 'windup',
      timeRemaining: elite ? this.config.eliteWindupSeconds : this.config.enemyWindupSeconds,
      elite, onStrike,
    });
    return true;
  }

  update(dt: number): void {
    for (const [target, state] of [...this.states]) {
      if (target.isDisposed()) { this.disposeState(target, state); continue; }
      state.mesh.position.x = target.position.x;
      state.mesh.position.z = target.position.z;
      state.timeRemaining -= dt;
      if (state.phase === 'windup') {
        const total = state.elite ? this.config.eliteWindupSeconds : this.config.enemyWindupSeconds;
        const progress = 1 - Math.max(0, state.timeRemaining / total);
        state.mesh.visibility = 0.35 + progress * 0.65;
        state.mesh.scaling.setAll(0.45 + progress * 0.55);
        if (state.timeRemaining <= 0) {
          state.onStrike();
          state.phase = 'recovery';
          state.timeRemaining = state.elite ? this.config.eliteRecoverySeconds : this.config.enemyRecoverySeconds;
          state.mesh.visibility = 0.15;
        }
      } else if (state.timeRemaining <= 0) {
        this.disposeState(target, state);
      }
    }
  }

  cancel(target: Mesh): void {
    const state = this.states.get(target);
    if (state) this.disposeState(target, state);
  }

  dispose(): void { for (const [target, state] of [...this.states]) this.disposeState(target, state); }

  private disposeState(target: Mesh, state: State): void {
    state.mesh.material?.dispose();
    state.mesh.dispose();
    this.states.delete(target);
  }
}
