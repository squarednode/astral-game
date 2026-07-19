export type DeveloperHudPageId =
  | 'overview'
  | 'entities'
  | 'events'
  | 'resources'
  | 'states'
  | 'movement'
  | 'abilities'
  | 'combat'
  | 'ai'
  | 'status'
  | 'loot'
  | 'bosses'
  | 'quests';

export interface DeveloperOverviewMetrics {
  fps: number;
  entities: number;
  enemies: number;
  eventErrors: number;
  assetFailures: number;
  definitionErrors: number;
  rejectedTransitions: number;
}

const PAGE_LABELS: Readonly<Record<DeveloperHudPageId, string>> = {
  overview: 'Overview',
  entities: 'Entities',
  events: 'Events',
  resources: 'Resources',
  states: 'State Machines',
  movement: 'Movement',
  abilities: 'Abilities',
  combat: 'Combat Library',
  ai: 'AI',
  status: 'Status',
  loot: 'Loot',
  bosses: 'Bosses',
  quests: 'Quests',
};

export class DeveloperHud {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly compact: HTMLButtonElement;
  private readonly overviewGrid: HTMLDivElement;
  private readonly pageButtons = new Map<
    DeveloperHudPageId,
    HTMLButtonElement
  >();
  private readonly pages = new Map<DeveloperHudPageId, HTMLElement>();
  private readonly textPages = new Map<
    Exclude<DeveloperHudPageId, 'overview' | 'movement' | 'abilities' | 'combat'>,
    HTMLPreElement
  >();
  private open = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'developer-hud';

    this.compact = document.createElement('button');
    this.compact.type = 'button';
    this.compact.className = 'developer-hud-compact';
    this.compact.title = 'Toggle engine diagnostics (U)';
    this.compact.addEventListener('click', () => this.toggle());
    this.root.appendChild(this.compact);

    this.panel = document.createElement('section');
    this.panel.className = 'developer-hud-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Engine diagnostics');

    const header = document.createElement('header');
    header.className = 'developer-hud-header';
    header.innerHTML = `
      <div>
        <strong>ENGINE DIAGNOSTICS</strong>
        <small>U to close</small>
      </div>
    `;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'developer-hud-close';
    closeButton.textContent = '×';
    closeButton.title = 'Close diagnostics';
    closeButton.addEventListener('click', () => this.setOpen(false));
    header.appendChild(closeButton);
    this.panel.appendChild(header);

    const tabBar = document.createElement('nav');
    tabBar.className = 'developer-hud-tabs';
    tabBar.setAttribute('aria-label', 'Diagnostic pages');

    for (const [id, label] of Object.entries(PAGE_LABELS) as Array<
      [DeveloperHudPageId, string]
    >) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.page = id;
      button.addEventListener('click', () => this.showPage(id));
      this.pageButtons.set(id, button);
      tabBar.appendChild(button);
    }
    this.panel.appendChild(tabBar);

    const body = document.createElement('div');
    body.className = 'developer-hud-body';

    const overview = document.createElement('article');
    overview.className = 'developer-hud-page';
    overview.dataset.page = 'overview';
    this.overviewGrid = document.createElement('div');
    this.overviewGrid.className = 'developer-overview-grid';
    overview.appendChild(this.overviewGrid);
    body.appendChild(overview);
    this.pages.set('overview', overview);

    for (const id of [
      'entities',
      'events',
      'resources',
      'states',
      'ai',
      'status',
      'loot',
      'bosses',
      'quests',
    ] as const) {
      const page = document.createElement('article');
      page.className = 'developer-hud-page';
      page.dataset.page = id;
      page.hidden = true;

      const pre = document.createElement('pre');
      pre.className = 'developer-hud-data';
      page.appendChild(pre);
      body.appendChild(page);
      this.pages.set(id, page);
      this.textPages.set(id, pre);
    }

    const abilities = document.createElement('article');
    abilities.className = 'developer-hud-page developer-abilities-page';
    abilities.dataset.page = 'abilities';
    abilities.hidden = true;
    body.appendChild(abilities);
    this.pages.set('abilities', abilities);

    const combat = document.createElement('article');
    combat.className = 'developer-hud-page developer-combat-page';
    combat.dataset.page = 'combat';
    combat.hidden = true;
    body.appendChild(combat);
    this.pages.set('combat', combat);

    const movement = document.createElement('article');
    movement.className = 'developer-hud-page developer-movement-page';
    movement.dataset.page = 'movement';
    movement.hidden = true;
    body.appendChild(movement);
    this.pages.set('movement', movement);

    this.textPages.get('ai')!.textContent = 'AI INSPECTOR\nReserved for 0.6.1 enemy archetypes.';
    this.textPages.get('status')!.textContent = 'STATUS INSPECTOR\nQuick status controls are available on the Abilities page.\nFull runtime inspection arrives with the status framework.';
    this.textPages.get('loot')!.textContent = 'LOOT INSPECTOR\nReserved for equipment and loot expansion.';
    this.textPages.get('bosses')!.textContent = 'BOSS INSPECTOR\nReserved for the boss framework.';
    this.textPages.get('quests')!.textContent = 'QUEST INSPECTOR\nReserved for the quest framework.';

    this.panel.appendChild(body);
    this.root.appendChild(this.panel);
    parent.appendChild(this.root);

    this.showPage('overview');
    this.updateOverview({
      fps: 0,
      entities: 0,
      enemies: 0,
      eventErrors: 0,
      assetFailures: 0,
      definitionErrors: 0,
      rejectedTransitions: 0,
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.panel.hidden = !open;
    this.compact.setAttribute('aria-expanded', String(open));
  }

  showPage(pageId: DeveloperHudPageId): void {
    for (const [id, page] of this.pages) {
      page.hidden = id !== pageId;
    }

    for (const [id, button] of this.pageButtons) {
      const selected = id === pageId;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    }
  }

  getPageContent(pageId: 'movement' | 'abilities' | 'combat' | 'ai'): HTMLElement {
    return this.pages.get(pageId)!;
  }

  setPageText(
    pageId: Exclude<DeveloperHudPageId, 'overview' | 'movement' | 'abilities' | 'combat'>,
    text: string,
  ): void {
    this.textPages.get(pageId)!.textContent = text;
  }

  updateOverview(metrics: DeveloperOverviewMetrics): void {
    const totalProblems =
      metrics.eventErrors +
      metrics.assetFailures +
      metrics.definitionErrors +
      metrics.rejectedTransitions;

    this.compact.classList.toggle('warning', totalProblems > 0);
    this.compact.innerHTML = [
      '<span>ENGINE</span>',
      `<b>${metrics.fps.toFixed(0)} FPS</b>`,
      `<em>${totalProblems === 0 ? 'HEALTHY' : `${totalProblems} ISSUE${totalProblems === 1 ? '' : 'S'}`}</em>`,
    ].join('');

    const cards: Array<[string, string, boolean]> = [
      ['FPS', metrics.fps.toFixed(0), metrics.fps < 45],
      ['Entities', String(metrics.entities), false],
      ['Enemies', String(metrics.enemies), false],
      ['Event errors', String(metrics.eventErrors), metrics.eventErrors > 0],
      ['Asset failures', String(metrics.assetFailures), metrics.assetFailures > 0],
      ['Definition errors', String(metrics.definitionErrors), metrics.definitionErrors > 0],
      ['Rejected transitions', String(metrics.rejectedTransitions), metrics.rejectedTransitions > 0],
    ];

    this.overviewGrid.replaceChildren(
      ...cards.map(([label, value, warning]) => {
        const card = document.createElement('div');
        card.className = 'developer-metric';
        card.classList.toggle('warning', warning);
        card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        return card;
      }),
    );
  }

  dispose(): void {
    this.pageButtons.clear();
    this.pages.clear();
    this.textPages.clear();
    this.root.remove();
  }
}
