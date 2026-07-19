import type { DeveloperState } from '../../devtools/DeveloperState';

interface NavigationToggle {
  key:
    | 'enemySpawnCandidatesVisible'
    | 'enemyTraversalLinksVisible'
    | 'enemyNavigationRoutesVisible'
    | 'enemyInvalidLandingsVisible';
  label: string;
}

const TOGGLES: readonly NavigationToggle[] = [
  { key: 'enemySpawnCandidatesVisible', label: 'Show Spawn Candidates' },
  { key: 'enemyTraversalLinksVisible', label: 'Show Traversal Links' },
  { key: 'enemyNavigationRoutesVisible', label: 'Show Planned Movement' },
  { key: 'enemyInvalidLandingsVisible', label: 'Show Invalid Landings' },
];

export class NavigationDeveloperPanel {
  private readonly root = document.createElement('section');

  constructor(
    parent: HTMLElement,
    private readonly state: DeveloperState,
  ) {
    this.root.className = 'navigation-developer-panel';
    this.root.innerHTML = '<h3>NAVIGATION DEBUG</h3>';

    for (const toggle of TOGGLES) {
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
      this.root.appendChild(label);
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
