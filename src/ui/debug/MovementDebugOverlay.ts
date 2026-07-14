import type { MovementDebugState } from '../../game/movement/PlayerMovementController';
import { GameBalance } from '../../game/config/GameBalance';

export class MovementDebugOverlay {
  private readonly element: HTMLDivElement;
  private elapsed = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:12px',
      'z-index:1000',
      'padding:8px 10px',
      'border:1px solid rgba(255,255,255,.18)',
      'border-radius:6px',
      'background:rgba(5,8,14,.72)',
      'color:#d8e6ff',
      'font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace',
      'pointer-events:none',
      'white-space:pre',
    ].join(';');
    this.element.hidden = !GameBalance.debug.enabled;
    document.body.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  update(dt: number, fps: number, state: MovementDebugState): void {
    if (this.element.hidden) return;

    this.elapsed += dt;
    if (this.elapsed < GameBalance.debug.updateIntervalSeconds) return;
    this.elapsed = 0;

    this.element.textContent = [
      `FPS       ${fps.toFixed(0)}`,
      `Speed     ${state.speed.toFixed(2)}`,
      `Grounded  ${state.grounded}`,
      `Dodging   ${state.dodging}`,
      `I-frames  ${state.invulnerable}`,
      `Input     ${state.movementSource}`,
      `Velocity  ${state.velocity.x.toFixed(2)}, ${state.velocity.z.toFixed(2)}`,
    ].join('\n');
  }

  dispose(): void {
    this.element.remove();
  }
}
