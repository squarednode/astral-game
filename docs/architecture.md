# Architecture

## Principles

- Gameplay logic should not depend directly on rendering details.
- Game content should be data-driven where practical.
- Systems should be small and testable.
- Avoid premature abstraction.
- Every commit must build and remain playable.

## Layers

### Engine

Rendering-facing systems:

- Input
- Camera
- Scene setup
- Timing
- Asset loading

### Game

Gameplay rules:

- Characters
- Combat
- Party
- Enemies
- Loot
- World logic

### UI

Player-facing information:

- HUD
- Inventory
- Tooltips
- Menus

### Data

Definitions for:

- Characters
- Abilities
- Enemies
- Items
- Loot tables