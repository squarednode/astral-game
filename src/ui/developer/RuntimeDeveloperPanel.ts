import type { QuestSnapshot } from '../../game/actors';
import type { SaveSlotId, SaveSummary } from '../../game/save';

export interface RuntimeDeveloperPanelOptions {
  quests(): readonly QuestSnapshot[];
  acceptQuest(id: string): boolean;
  advanceQuest(id: string, objectiveId: string, amount: number): void;
  completeQuest(id: string): boolean;
  abandonQuest(id: string): boolean;
  resetQuest(id: string): void;
  copper(): number;
  addCopper(amount: number): void;
  merchantStock(): readonly { merchantId: string; count: number }[];
  refreshMerchant(merchantId: string): void;
  refreshAllMerchants(): void;
  saveSlots(): readonly SaveSummary[];
  save(slotId: SaveSlotId): boolean;
  load(slotId: SaveSlotId): boolean;
  deleteSave(slotId: SaveSlotId): void;
  activeCheckpoint(): string;
  activateNearestCheckpoint(): void;
  teleportToCheckpoint(): void;
  forceRespawn(): void;
  clearCheckpoint(): void;
  playtestMode(): boolean;
  setPlaytestMode(enabled: boolean): void;
  resetSession(): void;
  refresh(): void;
}

export class RuntimeDeveloperPanel {
  constructor(
    private readonly host: HTMLElement,
    private readonly options: RuntimeDeveloperPanelOptions,
  ) {
    this.host.addEventListener('click', this.onClick);
    this.host.addEventListener('change', this.onChange);
    this.render();
  }

  render(): void {
    const quests = this.options.quests();
    const slots = this.options.saveSlots();
    const slotMap = new Map(slots.map(slot => [slot.slotId, slot]));
    const merchants = this.options.merchantStock();
    this.host.innerHTML = `
      <section class="runtime-dev-panel">
        <header class="runtime-dev-header">
          <div><strong>GAMEPLAY RUNTIME TOOLS</strong><small>Quest, commerce, save, checkpoint, and playtest controls</small></div>
          <label class="runtime-dev-toggle"><input type="checkbox" data-action="playtest" ${this.options.playtestMode() ? 'checked' : ''}> Playtest mode</label>
        </header>

        <details open>
          <summary>QUESTS <span>${quests.length}</span></summary>
          <div class="runtime-dev-grid">
            ${quests.map(quest => `
              <article class="runtime-dev-card">
                <div class="runtime-dev-card-title"><strong>${quest.displayName}</strong><span class="runtime-dev-state">${quest.state}</span></div>
                <small>${quest.id}</small>
                <div class="runtime-dev-objectives">
                  ${quest.objectives.map(objective => `
                    <div><span>${objective.completed ? '✓' : '□'} ${objective.label}</span><b>${objective.current}/${objective.required}</b>
                    <button data-action="quest-advance" data-quest="${quest.id}" data-objective="${objective.id}">+1</button></div>
                  `).join('') || '<em>No objectives</em>'}
                </div>
                <div class="runtime-dev-actions">
                  <button data-action="quest-accept" data-quest="${quest.id}" ${quest.state !== 'available' ? 'disabled' : ''}>Accept</button>
                  <button data-action="quest-complete" data-quest="${quest.id}" ${quest.state === 'completed' ? 'disabled' : ''}>Complete</button>
                  <button data-action="quest-abandon" data-quest="${quest.id}" ${!quest.canAbandon ? 'disabled' : ''}>Abandon</button>
                  <button data-action="quest-reset" data-quest="${quest.id}">Reset</button>
                </div>
              </article>
            `).join('')}
          </div>
        </details>

        <details open>
          <summary>COMMERCE <span>${this.options.copper()} copper</span></summary>
          <div class="runtime-dev-toolbar">
            <button data-action="copper" data-amount="100">+100 Copper</button>
            <button data-action="copper" data-amount="1000">+1,000 Copper</button>
            <button data-action="merchant-all">Refresh All Stock</button>
          </div>
          <div class="runtime-dev-list">
            ${merchants.map(merchant => `<div><span>${merchant.merchantId}</span><b>${merchant.count} items</b><button data-action="merchant-refresh" data-merchant="${merchant.merchantId}">Refresh</button></div>`).join('') || '<em>No merchants registered.</em>'}
          </div>
        </details>

        <details open>
          <summary>SAVES & CHECKPOINTS <span>${this.options.activeCheckpoint()}</span></summary>
          <div class="runtime-dev-toolbar">
            <button data-action="checkpoint-nearest">Activate Nearest</button>
            <button data-action="checkpoint-teleport">Teleport Active</button>
            <button data-action="checkpoint-respawn">Force Respawn</button>
            <button data-action="checkpoint-clear">Clear Active</button>
          </div>
          <div class="runtime-dev-save-grid">
            ${(['autosave', 'slot1', 'slot2', 'slot3'] as SaveSlotId[]).map(slotId => {
              const slot = slotMap.get(slotId);
              return `<article class="runtime-dev-card"><strong>${slotId}</strong><small>${slot ? `${slot.checkpointName} · ${new Date(slot.savedAt).toLocaleString()}` : 'Empty'}</small><div class="runtime-dev-actions"><button data-action="save" data-slot="${slotId}">Save</button><button data-action="load" data-slot="${slotId}" ${slot ? '' : 'disabled'}>Load</button><button data-action="delete-save" data-slot="${slotId}" ${slot ? '' : 'disabled'}>Delete</button></div></article>`;
            }).join('')}
          </div>
        </details>

        <details>
          <summary>RESET CONTROLS</summary>
          <div class="runtime-dev-danger">
            <p>Resets the current session to the clean new-game baseline. Save first if the current state is needed.</p>
            <button data-action="reset-session">Reset Session</button>
          </div>
        </details>
      </section>
    `;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('change', this.onChange);
  }

  private readonly onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.action === 'playtest') {
      this.options.setPlaytestMode(input.checked);
      this.options.refresh();
    }
  };

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const questId = button.dataset.quest;
    const slot = button.dataset.slot as SaveSlotId | undefined;
    switch (action) {
      case 'quest-accept': if (questId) this.options.acceptQuest(questId); break;
      case 'quest-advance': if (questId && button.dataset.objective) this.options.advanceQuest(questId, button.dataset.objective, 1); break;
      case 'quest-complete': if (questId) this.options.completeQuest(questId); break;
      case 'quest-abandon': if (questId) this.options.abandonQuest(questId); break;
      case 'quest-reset': if (questId) this.options.resetQuest(questId); break;
      case 'copper': this.options.addCopper(Number(button.dataset.amount ?? 0)); break;
      case 'merchant-refresh': if (button.dataset.merchant) this.options.refreshMerchant(button.dataset.merchant); break;
      case 'merchant-all': this.options.refreshAllMerchants(); break;
      case 'save': if (slot) this.options.save(slot); break;
      case 'load': if (slot) this.options.load(slot); break;
      case 'delete-save': if (slot && confirm(`Delete ${slot}?`)) this.options.deleteSave(slot); break;
      case 'checkpoint-nearest': this.options.activateNearestCheckpoint(); break;
      case 'checkpoint-teleport': this.options.teleportToCheckpoint(); break;
      case 'checkpoint-respawn': this.options.forceRespawn(); break;
      case 'checkpoint-clear': this.options.clearCheckpoint(); break;
      case 'reset-session': if (confirm('Reset the current session to a new-game state?')) this.options.resetSession(); break;
    }
    this.options.refresh();
    this.render();
  };
}
