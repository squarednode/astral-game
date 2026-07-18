import type { InputManager } from '../../engine/input/InputManager';
import { ACTION_LABELS } from '../../engine/input/InputBindings';
import type { InputAction, MovementControlScheme } from '../../engine/input/InputTypes';
import type { SettingsManager } from '../../engine/settings/SettingsManager';
import './SettingsMenu.css';

export interface SettingsMenuOptions {
  onVisibilityChanged?: (open: boolean) => void;
}

export class SettingsMenu {
  readonly element: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly deviceStatus: HTMLSpanElement;
  private readonly parentLayer: HTMLElement;
  private open = false;
  private rebindingAction: InputAction | null = null;
  private readonly onRebindKeyDown = (event: KeyboardEvent): void => {
    if (!this.rebindingAction) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.code === 'Escape') {
      this.rebindingAction = null;
      this.rebuild();
      return;
    }

    this.input.rebindKeyboard(this.rebindingAction, event.code);
    this.rebindingAction = null;
    this.rebuild();
  };

  constructor(
    parent: HTMLElement,
    private readonly settings: SettingsManager,
    private readonly input: InputManager,
    private readonly options: SettingsMenuOptions = {},
  ) {
    this.parentLayer = parent;
    this.element = document.createElement('div');
    this.element.className = 'settings-menu-backdrop';
    this.element.hidden = true;

    this.panel = document.createElement('div');
    this.panel.className = 'settings-menu-panel';
    this.panel.addEventListener('pointerdown', event => event.stopPropagation());
    this.panel.addEventListener('click', event => event.stopPropagation());

    const header = document.createElement('div');
    header.className = 'settings-menu-header';
    const title = document.createElement('div');
    title.innerHTML = '<strong>Player Configuration</strong><small>Keyboard, mouse, controller, and accessibility</small>';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'settings-action-button';
    close.textContent = 'Close';
    close.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
    });
    close.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.setOpen(false);
    });
    header.append(title, close);

    const body = document.createElement('div');
    body.className = 'settings-menu-body';
    body.append(
      this.buildControlSection(),
      this.buildGamepadSection(),
      this.buildAccessibilitySection(),
    );

    const footer = document.createElement('div');
    footer.className = 'settings-menu-footer';
    this.deviceStatus = document.createElement('span');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'settings-action-button';
    reset.textContent = 'Restore Defaults';
    reset.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });
    reset.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.settings.reset();
      this.rebuild();
    });
    footer.append(this.deviceStatus, reset);

    this.panel.append(header, body, footer);
    this.element.appendChild(this.panel);
    this.element.addEventListener('pointerdown', event => {
      if (event.target === this.element) this.setOpen(false);
    });
    parent.appendChild(this.element);
    window.addEventListener('keydown', this.onRebindKeyDown, true);
  }

  isOpen(): boolean { return this.open; }

  toggle(): void { this.setOpen(!this.open); }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.element.hidden = !open;
    this.parentLayer.classList.toggle('ui-layer--interactive', open);
    this.options.onVisibilityChanged?.(open);
  }

  update(): void {
    const diagnostics = this.input.getDiagnostics();
    this.deviceStatus.textContent = diagnostics.gamepadConnected
      ? `Keyboard & mouse ready · Controller connected · Active: ${diagnostics.device}`
      : `Keyboard & mouse ready · Controller optional · Active: ${diagnostics.device}`;
  }

  dispose(): void {
    this.parentLayer.classList.remove('ui-layer--interactive');
    window.removeEventListener('keydown', this.onRebindKeyDown, true);
    this.element.remove();
  }

  private rebuild(): void {
    const body = this.panel.querySelector<HTMLDivElement>('.settings-menu-body');
    if (!body) return;
    body.replaceChildren(
      this.buildControlSection(),
      this.buildGamepadSection(),
      this.buildAccessibilitySection(),
    );
  }

  private buildControlSection(): HTMLElement {
    const section = this.section('Movement & Controls');
    const current = this.settings.get();

    section.append(
      this.selectRow<MovementControlScheme>(
        'Movement style',
        current.input.movementControlScheme,
        [
          ['hybrid', 'Mouse-relative WASD + click-to-move'],
          ['click-to-move', 'Click-to-move'],
          ['screen-relative', 'Screen-relative WASD'],
          ['mouse-relative', 'Mouse-relative WASD'],
        ],
        value => this.settings.update({ input: { ...this.settings.get().input, movementControlScheme: value } }),
      ),
      this.toggleRow(
        'Face aim direction',
        current.input.faceAimDirection,
        value => this.settings.update({ input: { ...this.settings.get().input, faceAimDirection: value } }),
      ),
      this.toggleRow(
        'Left click attacks instead of moving',
        current.input.clickToAttack,
        value => this.settings.update({ input: { ...this.settings.get().input, clickToAttack: value } }),
      ),
    );

    const bindings = document.createElement('div');
    bindings.className = 'settings-binding-grid';
    const actions: readonly InputAction[] = [
      'moveUp',
      'moveDown',
      'moveLeft',
      'moveRight',
      'primaryAttack',
      'ability1',
      'ability2',
      'ability3',
      'ability4',
      'dodge',
      'jump',
      'toggleInventory',
      'toggleDeveloperHud',
      'toggleDeveloperConsole',
    ];

    for (const action of actions) {
      const label = document.createElement('span');
      label.textContent = ACTION_LABELS[action];

      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'settings-binding-button';
      change.dataset.action = action;
      change.textContent = this.rebindingAction === action
        ? 'Press a key…'
        : this.input.getBindingLabel(action);
      change.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.rebindingAction = action;
        this.rebuild();
      });

      bindings.append(label, change);
    }

    const resetBindings = document.createElement('button');
    resetBindings.type = 'button';
    resetBindings.className = 'settings-action-button settings-reset-bindings';
    resetBindings.textContent = 'Reset Keyboard Bindings';
    resetBindings.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.rebindingAction = null;
      this.input.resetBindings();
      this.rebuild();
    });
    section.append(bindings, resetBindings);
    return section;
  }

  private buildGamepadSection(): HTMLElement {
    const section = this.section('Controller');
    const current = this.settings.get();
    section.append(
      this.rangeRow(
        'Stick deadzone',
        current.input.gamepadDeadzone,
        0.05,
        0.5,
        0.01,
        value => this.settings.update({ input: { ...this.settings.get().input, gamepadDeadzone: value } }),
      ),
      this.rangeRow(
        'Aim sensitivity',
        current.input.gamepadAimSensitivity,
        0.5,
        2,
        0.05,
        value => this.settings.update({ input: { ...this.settings.get().input, gamepadAimSensitivity: value } }),
      ),
      this.rangeRow(
        'Trigger threshold',
        current.input.gamepadTriggerThreshold,
        0.1,
        0.9,
        0.05,
        value => this.settings.update({ input: { ...this.settings.get().input, gamepadTriggerThreshold: value } }),
      ),
    );
    return section;
  }

  private buildAccessibilitySection(): HTMLElement {
    const section = this.section('Accessibility & Presentation');
    const current = this.settings.get();
    section.append(
      this.rangeRow(
        'UI scale',
        current.accessibility.uiScale,
        0.8,
        1.4,
        0.05,
        value => this.settings.update({ accessibility: { ...this.settings.get().accessibility, uiScale: value } }),
      ),
      this.rangeRow(
        'Screen shake',
        current.accessibility.screenShake,
        0,
        1,
        0.1,
        value => this.settings.update({ accessibility: { ...this.settings.get().accessibility, screenShake: value } }),
      ),
      this.toggleRow(
        'Damage numbers',
        current.accessibility.damageNumbers,
        value => this.settings.update({ accessibility: { ...this.settings.get().accessibility, damageNumbers: value } }),
      ),
    );
    return section;
  }

  private section(titleText: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    const title = document.createElement('h3');
    title.textContent = titleText;
    section.appendChild(title);
    return section;
  }

  private toggleRow(
    labelText: string,
    checked: boolean,
    onChange: (value: boolean) => void,
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'settings-row';
    const label = document.createElement('span');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    row.append(label, input);
    return row;
  }

  private selectRow<T extends string>(
    labelText: string,
    selected: T,
    options: readonly (readonly [T, string])[],
    onChange: (value: T) => void,
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'settings-row';
    const label = document.createElement('span');
    label.textContent = labelText;
    const select = document.createElement('select');
    for (const [value, text] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      option.selected = value === selected;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value as T));
    row.append(label, select);
    return row;
  }

  private rangeRow(
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'settings-row settings-range-row';
    const label = document.createElement('span');
    label.textContent = labelText;
    const output = document.createElement('output');
    output.textContent = value.toFixed(2);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      output.textContent = next.toFixed(2);
      onChange(next);
    });
    const control = document.createElement('span');
    control.className = 'settings-range-control';
    control.append(input, output);
    row.append(label, control);
    return row;
  }
}
