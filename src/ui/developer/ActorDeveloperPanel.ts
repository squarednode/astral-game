import type {
  ActorRuntime,
  DialogueRuntime,
  WorldStateRuntime,
  QuestRuntime,
} from '../../game/actors';

export interface ActorDeveloperPanelOptions {
  actors(): readonly ActorRuntime[];
  dialogue(): DialogueRuntime;
  worldState(): WorldStateRuntime;
  quests(): QuestRuntime;
  interact(actorId: string): void;
  setState(actorId: string, state: string): void;
}

export class ActorDeveloperPanel {
  constructor(
    private readonly host: HTMLElement,
    private readonly options: ActorDeveloperPanelOptions,
  ) {
    this.host.addEventListener('click', this.onClick);
    this.render();
  }

  render(): void {
    const dialogue = this.options.dialogue().snapshot();
    const world = this.options.worldState().snapshot();
    const quests = this.options.quests().all();
    const tracked = this.options.quests().tracked();

    this.host.innerHTML = `
      <section class="actor-developer-panel">
        <header>
          <strong>ACTOR & WORLD INTERACTION</strong>
          <small>Runtime state, components, goals, and conditions</small>
        </header>

        <div class="actor-dev-grid">
          ${this.options.actors().map(actor => {
            const snapshot = actor.snapshot();
            return `
              <article class="actor-dev-card">
                <div>
                  <strong>${snapshot.displayName}</strong>
                  <small>${snapshot.actorId}</small>
                </div>
                <dl>
                  <dt>State</dt><dd>${snapshot.state}</dd>
                  <dt>Goal</dt><dd>${snapshot.goal}</dd>
                  <dt>Distance</dt><dd>${Number.isFinite(snapshot.distanceToPlayer) ? snapshot.distanceToPlayer.toFixed(1) : '—'}</dd>
                  <dt>Targeted</dt><dd>${snapshot.targeted ? 'Yes' : 'No'}</dd>
                  <dt>Available</dt><dd>${snapshot.available ? 'Yes' : 'No'}</dd>
                  <dt>Components</dt><dd>${snapshot.components.join(', ')}</dd>
                </dl>
                <div class="actor-dev-actions">
                  <button data-action="interact" data-actor-id="${snapshot.actorId}">Interact</button>
                  <button data-action="idle" data-actor-id="${snapshot.actorId}">Idle</button>
                  <button data-action="disable" data-actor-id="${snapshot.actorId}">Disable</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>

        <pre class="developer-hud-data">ACTIVE DIALOGUE
${dialogue.active
  ? `${dialogue.dialogueId}
Node: ${dialogue.nodeId}
Speaker: ${dialogue.speakerId}
Choices: ${dialogue.choices.map(choice => `${choice.enabled ? '✓' : '✕'} ${choice.text}`).join(' | ')}`
  : 'None'}

WORLD FLAGS
${Object.entries(world.flags).map(([id, value]) => `${id}: ${value}`).join('\n') || 'None'}

WORLD COUNTERS
${Object.entries(world.counters).map(([id, value]) => `${id}: ${value}`).join('\n') || 'None'}

GAMEPLAY LOOP DEBUGGER
${tracked ? `Current: ${tracked.displayName}
State: ${tracked.state}
${tracked.objectives.map(objective => `${objective.completed ? '✓' : '□'} ${objective.label} ${objective.current}/${objective.required}`).join('\n')}
Next expected event: ${tracked.objectives.find(objective => !objective.completed)?.label ?? (tracked.state === 'ready-to-complete' ? 'Return to quest giver' : 'Reward claimed')}` : 'No tracked quest'}

QUEST MANAGER
${quests.map(quest => `${quest.state.toUpperCase()}  ${quest.displayName}`).join('\n') || 'None'}</pre>
      </section>
    `;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button) return;
    const actorId = button.dataset.actorId;
    if (!actorId) return;

    switch (button.dataset.action) {
      case 'interact':
        this.options.interact(actorId);
        break;
      case 'idle':
        this.options.setState(actorId, 'idle');
        break;
      case 'disable':
        this.options.setState(actorId, 'disabled');
        break;
    }

    this.render();
  };
}
