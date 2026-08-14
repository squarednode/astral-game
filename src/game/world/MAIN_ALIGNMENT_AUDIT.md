# 0.6.10 Main Alignment Audit

- `npm run dev` must serve the production main game through root `index.html` -> `/src/main.ts`.
- Vite development base is `/`; production build base remains `/astral-game/` for GitHub Pages.
- Level One `main` uses the procedural runner world.
- Boss and testing spaces remain authored LevelInstance spaces.
- Player input remains owned by `PlayerMovementController`; no prototype input listener is imported by main.
- Runner camera framing is delegated from `PlayerCameraController` only while a procedural runner runtime is active.
- Runner geometry publishes normal `WorldCollider` and `TraversalSurface` data for player/enemy movement systems.
- Main Exit retains `level-one.portal-to-boss`, preserving the existing quest-gated boss transfer.
- Prototype sideview HTML/entry files are not part of the main branch dev entrypoint.
- Existing fixed-position NPC/quest placement is a known follow-up for semantic procedural placement.
