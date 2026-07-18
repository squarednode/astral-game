export class WaveHud {
  readonly element: HTMLDivElement;
  private readonly wave = document.createElement('strong');
  private readonly kills = document.createElement('strong');
  private readonly power = document.createElement('strong');

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'gameplay-wave-hud';
    this.element.append(
      this.metric('Wave', this.wave),
      this.metric('Kills', this.kills),
      this.metric('Power', this.power),
    );
    parent.appendChild(this.element);
  }

  render(wave: number, kills: number, power: number): void {
    this.wave.textContent = String(wave);
    this.kills.textContent = String(kills);
    this.power.textContent = String(power);
  }

  private metric(label: string, value: HTMLElement): HTMLDivElement {
    const metric = document.createElement('div');
    metric.className = 'gameplay-wave-metric';
    const caption = document.createElement('span');
    caption.textContent = label;
    metric.append(caption, value);
    return metric;
  }
}
