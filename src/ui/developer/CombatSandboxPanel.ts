import {
  combatSandboxTuning,
  type CombatSandboxPreset,
  type CombatSandboxValues,
} from '../../game/config/CombatSandboxTuning';

interface SliderDefinition {
  key: keyof CombatSandboxValues;
  label: string;
  min: number;
  max: number;
  step: number;
  group: 'Engagement' | 'Balance' | 'Presentation';
}

const SLIDERS: readonly SliderDefinition[] = [
  { key: 'detectionRangeScale', label: 'Detection Range', min: 0.2, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'preferredRangeScale', label: 'Preferred Range', min: 0.2, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'attackRangeScale', label: 'Attack Range', min: 0.35, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'retreatBufferScale', label: 'Retreat Buffer', min: 0, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'advanceBufferScale', label: 'Advance Buffer', min: 0, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'leashRangeScale', label: 'Leash Radius', min: 0.3, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'packAlertRangeScale', label: 'Pack Alert Radius', min: 0, max: 1.5, step: 0.05, group: 'Engagement' },
  { key: 'decisionIntervalSeconds', label: 'Decision Interval', min: 0.15, max: 1.2, step: 0.05, group: 'Engagement' },
  { key: 'enemyHealthScale', label: 'Enemy HP', min: 0.25, max: 3, step: 0.05, group: 'Balance' },
  { key: 'enemyDamageScale', label: 'Enemy Damage', min: 0.25, max: 3, step: 0.05, group: 'Balance' },
  { key: 'enemySpeedScale', label: 'Enemy Speed', min: 0.4, max: 2, step: 0.05, group: 'Balance' },
  { key: 'enemyCooldownScale', label: 'Enemy Cooldowns', min: 0.3, max: 2, step: 0.05, group: 'Balance' },
  { key: 'targetVolumeScale', label: 'Target Volume', min: 0.25, max: 1.5, step: 0.05, group: 'Presentation' },
  { key: 'projectileVisualScale', label: 'Projectile Visual', min: 0.25, max: 1.5, step: 0.05, group: 'Presentation' },
  { key: 'projectileCollisionScale', label: 'Projectile Collision', min: 0.25, max: 1.5, step: 0.05, group: 'Presentation' },
  { key: 'damageNumberScale', label: 'Damage Numbers', min: 0.4, max: 1.5, step: 0.05, group: 'Presentation' },
  { key: 'healthBarScale', label: 'Health Bars', min: 0.4, max: 1.5, step: 0.05, group: 'Presentation' },
];

export class CombatSandboxPanel {
  private readonly root = document.createElement('section');
  private readonly inputs = new Map<keyof CombatSandboxValues, HTMLInputElement>();
  private readonly outputs = new Map<keyof CombatSandboxValues, HTMLOutputElement>();

  constructor(parent: HTMLElement) {
    this.root.className = 'combat-sandbox-panel';
    this.root.innerHTML = '<h3>COMBAT SANDBOX</h3><p>Live values apply to active enemies.</p>';

    const presetRow = document.createElement('div');
    presetRow.className = 'combat-sandbox-presets';
    const presets: Array<[CombatSandboxPreset, string]> = [
      ['tiny-arena', 'Tiny Arena'],
      ['dungeon', 'Dungeon'],
      ['open-world', 'Open World'],
      ['boss-fight', 'Boss Fight'],
      ['stress-test', 'Stress Test'],
      ['defaults', 'Reset'],
    ];
    for (const [id, label] of presets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => combatSandboxTuning.applyPreset(id));
      presetRow.appendChild(button);
    }
    this.root.appendChild(presetRow);

    for (const group of ['Engagement', 'Balance', 'Presentation'] as const) {
      const details = document.createElement('details');
      details.open = group === 'Engagement';
      const summary = document.createElement('summary');
      summary.textContent = group;
      details.appendChild(summary);
      for (const definition of SLIDERS.filter(slider => slider.group === group)) {
        details.appendChild(this.createSlider(definition));
      }
      this.root.appendChild(details);
    }

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Copy Current Tuning';
    exportButton.addEventListener('click', async () => {
      const text = combatSandboxTuning.exportJson();
      try {
        await navigator.clipboard.writeText(text);
        exportButton.textContent = 'Copied';
      } catch {
        console.info('Combat Sandbox tuning', text);
        exportButton.textContent = 'Logged to Console';
      }
      window.setTimeout(() => { exportButton.textContent = 'Copy Current Tuning'; }, 1200);
    });
    this.root.appendChild(exportButton);
    parent.appendChild(this.root);

    combatSandboxTuning.subscribe(values => this.refresh(values));
  }

  private createSlider(definition: SliderDefinition): HTMLElement {
    const row = document.createElement('label');
    row.className = 'combat-sandbox-slider';
    const title = document.createElement('span');
    title.textContent = definition.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(definition.min);
    input.max = String(definition.max);
    input.step = String(definition.step);
    const output = document.createElement('output');
    input.addEventListener('input', () => {
      combatSandboxTuning.set(definition.key, Number(input.value));
    });
    row.append(title, input, output);
    this.inputs.set(definition.key, input);
    this.outputs.set(definition.key, output);
    return row;
  }

  private refresh(values: Readonly<CombatSandboxValues>): void {
    for (const definition of SLIDERS) {
      const value = values[definition.key];
      const input = this.inputs.get(definition.key);
      const output = this.outputs.get(definition.key);
      if (input) input.value = String(value);
      if (output) output.value = definition.key === 'decisionIntervalSeconds'
        ? `${value.toFixed(2)}s`
        : `${value.toFixed(2)}x`;
    }
  }
}
