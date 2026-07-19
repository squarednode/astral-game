import type { DeveloperState } from '../../devtools/DeveloperState';

interface NavigationToggle {
  key:
    | 'enemySpawnCandidatesVisible'
    | 'enemyTraversalLinksVisible'
    | 'enemyNavigationRoutesVisible'
    | 'enemyInvalidLandingsVisible';
  label: string;
  group: 'Surfaces' | 'Routes' | 'Spawn';
}

const TOGGLES: readonly NavigationToggle[] = [
  { key: 'enemyTraversalLinksVisible', label: 'Show Traversal Links', group: 'Surfaces' },
  { key: 'enemyNavigationRoutesVisible', label: 'Show Planned Movement', group: 'Routes' },
  { key: 'enemyInvalidLandingsVisible', label: 'Show Invalid Landings', group: 'Routes' },
  { key: 'enemySpawnCandidatesVisible', label: 'Show Spawn Candidates', group: 'Spawn' },
];

export class NavigationDeveloperPanel {
  private readonly root = document.createElement('section');

  constructor(
    parent: HTMLElement,
    private readonly state: DeveloperState,
  ) {
    this.root.className = 'navigation-developer-panel';
    this.root.innerHTML = '<h3>NAVIGATION DEBUG</h3>';

    for (const groupName of ['Surfaces', 'Routes', 'Spawn'] as const) {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = groupName;
      summary.style.cursor = 'pointer';
      summary.style.fontWeight = '700';
      summary.style.margin = '8px 0 6px';
      details.appendChild(summary);

      for (const toggle of TOGGLES.filter(candidate => candidate.group === groupName)) {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.gap = '8px';
        label.style.marginBottom = '6px';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.state[toggle.key];
        input.addEventListener('change', () => {
          this.state[toggle.key] = input.checked;
        });
        label.append(input, document.createTextNode(toggle.label));
        details.appendChild(label);
      }
      this.root.appendChild(details);
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Hide Navigation Debug';
    reset.addEventListener('click', () => {
      for (const toggle of TOGGLES) this.state[toggle.key] = false;
      this.root.querySelectorAll<HTMLInputElement>('input').forEach(input => {
        input.checked = false;
      });
    });
    this.root.appendChild(reset);
    parent.prepend(this.root);
  }
}
