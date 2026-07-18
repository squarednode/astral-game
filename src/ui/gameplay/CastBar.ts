export interface CastBarView {
  readonly name: string;
  readonly elapsed: number;
  readonly remaining: number;
  readonly maximum: number;
  readonly progress: number;
}

export class CastBar {
  readonly element: HTMLDivElement;
  private readonly name: HTMLSpanElement;
  private readonly time: HTMLSpanElement;
  private readonly fill: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-cast-bar';
    this.element.hidden = true;

    const header = document.createElement('div');
    header.className = 'gameplay-cast-header';
    this.name = document.createElement('span');
    this.time = document.createElement('span');
    header.append(this.name, this.time);

    const track = document.createElement('div');
    track.className = 'gameplay-cast-track';
    this.fill = document.createElement('div');
    this.fill.className = 'gameplay-cast-fill';
    track.appendChild(this.fill);

    this.element.append(header, track);
    parent.appendChild(this.element);
  }

  render(view?: CastBarView): void {
    this.element.hidden = !view;
    if (!view) return;
    this.name.textContent = view.name;
    this.time.textContent = `${view.remaining.toFixed(2)}s`;
    this.fill.style.width = `${Math.max(0, Math.min(1, view.progress)) * 100}%`;
  }
}
