import type { AbilityRuntimeSnapshot } from '../../game/abilities';

export interface AbilityDeveloperView {
  readonly characterName: string;
  readonly queuedAbility?: string;
  readonly abilities: readonly AbilityRuntimeSnapshot[];
  readonly events: readonly string[];
  readonly noCooldowns: boolean;
  readonly castTimersFrozen: boolean;
}

export interface AbilityDeveloperActions {
  resetCooldowns(): void;
  interruptCast(): void;
  finishCast(): void;
  resetAbilities(): void;
  toggleNoCooldowns(): void;
  toggleCastTimerFreeze(): void;
}

export class AbilityDeveloperPanel {
  readonly element: HTMLDivElement;
  private readonly summary: HTMLPreElement;
  private readonly eventLog: HTMLPreElement;

  constructor(parent: HTMLElement, actions: AbilityDeveloperActions) {
    this.element = document.createElement('div');
    this.element.className = 'ability-developer-panel';

    const controls = document.createElement('div');
    controls.className = 'ability-developer-controls';
    const definitions: Array<[string, () => void]> = [
      ['Reset Cooldowns', actions.resetCooldowns],
      ['Interrupt Cast', actions.interruptCast],
      ['Finish Cast', actions.finishCast],
      ['Reset Ability States', actions.resetAbilities],
      ['Toggle No Cooldowns', actions.toggleNoCooldowns],
      ['Freeze Cast Timer', actions.toggleCastTimerFreeze],
    ];
    for (const [label, action] of definitions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      controls.appendChild(button);
    }

    this.summary = document.createElement('pre');
    this.summary.className = 'developer-hud-data';
    this.eventLog = document.createElement('pre');
    this.eventLog.className = 'developer-hud-data ability-event-log';

    this.element.append(controls, this.summary, this.eventLog);
    parent.appendChild(this.element);
  }

  render(view: AbilityDeveloperView): void {
    const rows = [
      `ACTIVE CHARACTER  ${view.characterName}`,
      `QUEUED ABILITY    ${view.queuedAbility ?? 'none'}`,
      `NO COOLDOWNS      ${view.noCooldowns ? 'ON' : 'OFF'}`,
      `CAST TIMER FROZEN  ${view.castTimersFrozen ? 'YES' : 'NO'}`,
      '',
    ];

    for (const ability of view.abilities) {
      const request = ability.blackboard.request;
      rows.push(
        `${ability.name.toUpperCase()}  [${ability.state}]`,
        `Runtime       ${ability.id}`,
        `Definition    ${ability.definitionId}`,
        `Cast          ${ability.castElapsed.toFixed(2)} / ${ability.castMaximum.toFixed(2)}s (${(ability.castProgress * 100).toFixed(0)}%)`,
        `Commit        ${(ability.commitThreshold * 100).toFixed(0)}% · ${ability.committed ? 'REACHED' : 'pending'}`,
        `Move cast     ${ability.canMoveWhileCasting ? 'YES' : 'NO'}`,
        `Rotate cast   ${ability.canRotateWhileCasting ? 'YES' : 'NO'}`,
        `Cooldown      ${ability.cooldownRemaining.toFixed(2)} / ${ability.cooldownMaximum.toFixed(2)}s`,
        `Sequence      ${ability.blackboard.castSequence}`,
        `Caster        ${request?.casterId ?? 'none'}`,
        `Aim position  ${request ? formatVector(request.aimPosition) : 'none'}`,
        `Aim direction ${request ? formatVector(request.aimDirection) : 'none'}`,
        `Interrupt     ${ability.blackboard.interruptReason ?? 'none'}`,
        `Tags          ${ability.tags.join(', ')}`,
        '',
      );
    }

    this.summary.textContent = rows.join('\n');
    this.eventLog.textContent = [
      'ABILITY EVENT STREAM',
      ...view.events,
    ].join('\n');
  }
}

function formatVector(vector: { x: number; y: number; z: number }): string {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}
