import type { StatusEffectDefinition } from '../../game/definitions/combat';
import type { StatusComponent, StatusRuntime } from '../../game/status';

export interface StatusDebugTarget {
  entityId: string;
  displayName: string;
  component: StatusComponent;
}

export class StatusDeveloperPanel {
  private readonly root = document.createElement('section');
  private selectedTargetId = '';

  constructor(
    parent: HTMLElement,
    private readonly runtime: StatusRuntime,
    private readonly definitions: readonly Readonly<StatusEffectDefinition>[],
    private readonly targets: () => readonly StatusDebugTarget[],
  ) {
    this.root.className = 'status-developer-panel';
    parent.replaceChildren(this.root);
    this.render();
  }

  refresh(): void { this.render(); }

  private render(): void {
    const targets = this.targets();
    if (!targets.some(target => target.entityId === this.selectedTargetId)) this.selectedTargetId = targets[0]?.entityId ?? '';
    const target = targets.find(candidate => candidate.entityId === this.selectedTargetId);
    this.root.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = 'STATUS RUNTIME';
    this.root.appendChild(title);

    const select = document.createElement('select');
    for (const candidate of targets) {
      const option = document.createElement('option');
      option.value = candidate.entityId;
      option.textContent = candidate.displayName;
      option.selected = candidate.entityId === this.selectedTargetId;
      select.appendChild(option);
    }
    select.addEventListener('change', () => { this.selectedTargetId = select.value; this.render(); });
    this.root.appendChild(select);

    if (!target) return;
    const active = document.createElement('pre');
    active.textContent = [...target.component.active.entries()].flatMap(([id, instances]) => instances.map(instance => `${id}  ${instance.remainingSeconds.toFixed(1)}s  x${instance.stacks}`)).join('\n') || 'No active statuses';
    this.root.appendChild(active);

    const controls = document.createElement('div');
    controls.className = 'status-debug-controls';
    for (const definition of this.definitions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Apply ${definition.name}`;
      button.addEventListener('click', () => {
        this.runtime.apply(target.component, { definition, ownerEntityId: target.entityId, sourceEntityId: 'developer' });
        this.render();
      });
      controls.appendChild(button);
    }
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Cleanse All';
    clear.addEventListener('click', () => { this.runtime.cleanse(target.component, () => true); this.render(); });
    controls.appendChild(clear);
    this.root.appendChild(controls);
  }
}
