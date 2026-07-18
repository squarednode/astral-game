export type UiLayerId =
  | 'gameplay'
  | 'notifications'
  | 'menus'
  | 'developer';

export class UIManager {
  private readonly root: HTMLDivElement;
  private readonly layers = new Map<UiLayerId, HTMLDivElement>();

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.id = 'ui-root';

    for (const layerId of [
      'gameplay',
      'notifications',
      'menus',
      'developer',
    ] as const) {
      const layer = document.createElement('div');
      layer.className = 'ui-layer';
      layer.dataset.uiLayer = layerId;
      this.layers.set(layerId, layer);
      this.root.appendChild(layer);
    }

    parent.appendChild(this.root);
  }

  getLayer(layerId: UiLayerId): HTMLDivElement {
    const layer = this.layers.get(layerId);
    if (!layer) {
      throw new Error(`UI layer "${layerId}" is not registered.`);
    }
    return layer;
  }

  isUiTarget(target: EventTarget | null): boolean {
    return target instanceof Node && this.root.contains(target);
  }

  dispose(): void {
    this.layers.clear();
    this.root.remove();
  }
}
