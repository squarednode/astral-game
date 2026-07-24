import { UITheme } from '../shared/UITheme';
import { AbilityBar } from './AbilityBar';
import { BossBar } from './BossBar';
import { CastBar } from './CastBar';
import type {
  GameplayHudSnapshot,
  NotificationTone,
} from './GameplayHudTypes';
import { NotificationFeed } from './NotificationFeed';
import { PartyHud } from './PartyHud';
import { WaveHud } from './WaveHud';

export interface GameplayHudOptions {
  onRestart?: () => void;
}

export type GameplayHudRegionId =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export class GameplayHud {
  readonly element: HTMLDivElement;
  private readonly regions = new Map<GameplayHudRegionId, HTMLDivElement>();
  private readonly partyHud: PartyHud;
  private readonly abilityBar: AbilityBar;
  private readonly castBar: CastBar;
  private readonly waveHud: WaveHud;
  private readonly bossBar: BossBar;
  private readonly notifications: NotificationFeed;
  private readonly gameOver: HTMLDivElement;
  private readonly finalScore: HTMLParagraphElement;
  private readonly restart: HTMLButtonElement;

  constructor(
    gameplayLayer: HTMLElement,
    notificationLayer: HTMLElement,
    private readonly options: GameplayHudOptions = {},
  ) {
    this.hideLegacyHud();
    this.applyTheme(gameplayLayer);

    this.element = document.createElement('div');
    this.element.className = 'gameplay-hud';
    gameplayLayer.appendChild(this.element);

    for (const regionId of [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const) {
      const region = document.createElement('div');
      region.className = `gameplay-hud-region gameplay-hud-region--${regionId}`;
      region.dataset.hudRegion = regionId;
      this.regions.set(regionId, region);
      this.element.appendChild(region);
    }

    this.partyHud = new PartyHud(this.getRegion('top-right'));
    this.waveHud = new WaveHud(this.element);
    this.bossBar = new BossBar(this.element);
    this.castBar = new CastBar(this.element);
    this.abilityBar = new AbilityBar(this.element);
    this.notifications = new NotificationFeed(notificationLayer);

    this.gameOver = document.createElement('div');
    this.gameOver.className = 'gameplay-game-over';
    this.gameOver.hidden = true;

    const title = document.createElement('h2');
    title.textContent = 'Run Ended';
    this.finalScore = document.createElement('p');
    this.restart = document.createElement('button');
    this.restart.type = 'button';
    this.restart.textContent = 'Restart Run';
    this.restart.addEventListener('click', () => {
      if (this.options.onRestart) this.options.onRestart();
      else location.reload();
    });
    this.gameOver.append(title, this.finalScore, this.restart);
    this.element.appendChild(this.gameOver);
  }

  getRegion(regionId: GameplayHudRegionId): HTMLDivElement {
    const region = this.regions.get(regionId);
    if (!region) throw new Error(`Gameplay HUD region "${regionId}" is not registered.`);
    return region;
  }

  setGameplayVisible(visible: boolean): void {
    this.element.classList.toggle('gameplay-hud--menu-open', !visible);
  }

  render(snapshot: GameplayHudSnapshot): void {
    this.partyHud.render(snapshot.party);
    this.abilityBar.render(snapshot.abilities);
    this.castBar.render(snapshot.activeCast);
    this.waveHud.render(snapshot.wave, snapshot.kills, snapshot.power);
    this.bossBar.render(snapshot.boss);
  }

  notify(text: string, tone: NotificationTone = 'neutral'): void {
    this.notifications.push(text, tone);
  }

  showGameOver(summary: string): void {
    this.finalScore.textContent = summary;
    this.gameOver.hidden = false;
  }

  hideGameOver(): void {
    this.gameOver.hidden = true;
  }

  dispose(): void {
    this.notifications.dispose();
    this.regions.clear();
    this.element.remove();
  }

  private applyTheme(layer: HTMLElement): void {
    layer.style.setProperty('--ui-panel', UITheme.colors.panel);
    layer.style.setProperty('--ui-panel-strong', UITheme.colors.panelStrong);
    layer.style.setProperty('--ui-border', UITheme.colors.border);
    layer.style.setProperty('--ui-text', UITheme.colors.text);
    layer.style.setProperty('--ui-muted', UITheme.colors.muted);
    layer.style.setProperty('--ui-accent', UITheme.colors.accent);
    layer.style.setProperty('--ui-success', UITheme.colors.success);
    layer.style.setProperty('--ui-warning', UITheme.colors.warning);
    layer.style.setProperty('--ui-danger', UITheme.colors.danger);
  }

  private hideLegacyHud(): void {
    for (const selector of [
      '#party',
      '#abilities',
      '#lootFeed',
      '#bossBar',
      '#gameOver',
      '#wave',
      '#kills',
      '#power',
    ]) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) element.hidden = true;
    }
  }
}
