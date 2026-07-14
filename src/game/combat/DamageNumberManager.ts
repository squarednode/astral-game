import { Camera, Engine, Matrix, Scene, Vector3 } from '@babylonjs/core';
import { DEFAULT_COMBAT_CONFIG } from './CombatConfig';
import type { CombatConfig } from './CombatConfig';
import type { DamageElement } from './CombatTypes';

interface DamageNumber {
  element: HTMLDivElement;
  worldPosition: Vector3;
  age: number;
  riseOffset: number;
}

const COLORS: Record<DamageElement, string> = {
  physical: '#f4f2ea',
  fire: '#ff765f',
  frost: '#7fd8ff',
  lightning: '#c19bff',
  arcane: '#ff8ed5',
};

export class DamageNumberManager {
  private readonly active: DamageNumber[] = [];
  private readonly root = document.createElement('div');

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly engine: Engine,
    private readonly config: Readonly<CombatConfig> = DEFAULT_COMBAT_CONFIG,
  ) {
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '40',
    });
    document.body.appendChild(this.root);
  }

  spawn(worldPosition: Vector3, amount: number, element: DamageElement, label?: string): void {
    const node = document.createElement('div');
    node.textContent = label ?? `${Math.max(1, Math.round(amount))}`;
    Object.assign(node.style, {
      position: 'absolute', transform: 'translate(-50%, -50%)',
      fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: label ? '22px' : '18px',
      letterSpacing: '0.02em', color: COLORS[element],
      textShadow: '0 2px 3px rgba(0,0,0,0.95)', whiteSpace: 'nowrap',
    });
    this.root.appendChild(node);
    this.active.push({
      element: node,
      worldPosition: worldPosition.clone().add(new Vector3(0, 1.45, 0)),
      age: 0,
      riseOffset: 0,
    });
  }

  update(dt: number): void {
    const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
    for (const number of [...this.active]) {
      number.age += dt;
      number.riseOffset += this.config.damageNumberRiseSpeed * dt;
      const projected = Vector3.Project(number.worldPosition, Matrix.Identity(), this.scene.getTransformMatrix(), viewport);
      const progress = number.age / this.config.damageNumberLifetimeSeconds;
      number.element.style.left = `${projected.x}px`;
      number.element.style.top = `${projected.y - number.riseOffset}px`;
      number.element.style.opacity = `${Math.max(0, 1 - progress)}`;
      if (progress >= 1) {
        number.element.remove();
        this.active.splice(this.active.indexOf(number), 1);
      }
    }
  }

  dispose(): void {
    this.root.remove();
    this.active.length = 0;
  }
}
