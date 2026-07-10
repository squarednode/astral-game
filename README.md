# Astral Swap ARPG Demo

A browser-based 2.5D action-RPG combat prototype combining:

- Four-character instant party swapping
- Diablo-style arena combat and enemy waves
- Persistent frost and gravity fields
- Frost + physical shatter reactions
- Frost + lightning chain reactions
- Randomized Common, Magic, Rare, and Legendary loot
- Per-character equipment and swap-focused legendary powers

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse | Aim |
| Left mouse | Basic attack |
| Q / E | Character skills |
| Space | Dodge |
| 1–4 | Swap party member |
| I | Inventory |

## Run locally

Node.js 20 or newer is recommended.

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## GitHub Pages

This project includes a Pages workflow. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. Push to `main` and the workflow will deploy the game.

## Prototype intent

This is deliberately a combat-first vertical slice. It uses procedural primitive art so iteration stays focused on movement, swapping, rotations, reactions, enemy pressure, and loot—not asset production.

## Current party

- **Vanguard:** physical bruiser; shatters frozen enemies
- **Warden:** frost support; persistent frost field and party healing
- **Tempest:** lightning assassin; chain attacks and blink strike
- **Arcanist:** ranged controller; gravity well and piercing orb

## Suggested next development pass

1. Add attack telegraphs and enemy archetypes.
2. Add item comparison and unequip/salvage actions.
3. Move game definitions into data files.
4. Add sound, hit-stop, screen shake, and animation timing.
5. Replace primitives with GLB character and environment assets.
