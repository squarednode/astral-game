# Changelog

All notable project changes will be documented here.

- Initial browser-based ARPG prototype
- Babylon.js rendering
- TypeScript and Vite build system
- GitHub Pages deployment
- Initial party, combat, enemy, and loot systems

## 0.2.0
Sprint 2 input update
Copy the `src` files into the repository, then run `npm run build`.
Controls: LMB move, RMB basic attack, WASD direct movement, R dodge, Space jump, 1-4 abilities, Tab/Shift+Tab or mouse wheel cycle control, I inventory.

## 0.2.2 movement feel
Sprint 2B — Movement feel
Replace/add the included files, then run:
```bash
npm run build
npm run dev
```
Changes
Movement logic extracted to `PlayerMovementController`.
Movement tuning centralized in `MovementConfig`.
WASD uses acceleration and deceleration instead of instant velocity changes.
Quick left click moves to a destination.
Holding left click continuously steers toward the cursor.
Releasing after a hold stops continuous steering.
WASD cancels click movement in hybrid mode.
Dodge distance increased and world bounds applied after dodging.
Jump logic moved into the movement controller.
Test checklist
W moves up-screen and S moves down-screen.
Quick click moves to the chosen point.
Click-and-hold follows the cursor as it moves.
Releasing a held click stops the character.
WASD immediately takes priority over click movement.
R dodges farther than before.
Space jumps and lands cleanly.
Right-click combat, abilities, party switching, loot, and waves still work.

## v0.2.3 movement updates
Version 0.2.3 — Game Balance and Movement Feel
Replace/add:
`src/main.ts`
`src/game/config/GameBalance.ts`
`src/game/movement/MovementConfig.ts`
`src/game/movement/PlayerMovementController.ts`
`src/game/camera/PlayerCameraController.ts`
`src/ui/debug/MovementDebugOverlay.ts`
Included
Centralized movement and camera tuning in `GameBalance.ts`
Smoothed directional turning
Continuous dodge over time instead of teleporting
Dodge invulnerability frames
Improved jump arc and landing ring
Camera follow smoothing
Movement look-ahead
Slight movement-based camera zoom
Temporary movement debug overlay
Validate
```bash
npm run build
npm run dev
```
Commit suggestion:
```bash
git add .
git commit -m "feat: add game balance and movement feel tuning"
git push
```
### 0.3.0 - Combat Feel Foundation
Copy the included files into matching repository paths.
Run:
```bash
npm run build
npm run dev
```
Verify enemy hit flash, damage numbers, knockback, strong-hit camera shake,
enemy attack telegraphs, dodge avoidance, player hit feedback, and all prior
movement and party controls.
Suggested commit:
```bash
git add .
git commit -m "feat: add combat hit feedback and enemy telegraphs"
git push
```

### 0.3.1 — Developer Tools
New files
`src/devtools/DeveloperConsole.ts`
`src/devtools/DeveloperActions.ts`
`src/devtools/DeveloperState.ts`
`src/devtools/DeveloperConsole.css`
Modified files
`src/main.ts`
`src/engine/input/InputTypes.ts`
`src/engine/input/InputBindings.ts`
`src/engine/input/InputManager.ts`
`src/game/combat/CombatSystem.ts`
`src/ui/debug/MovementDebugOverlay.ts`
Other included combat/config files are unchanged reference copies.
Controls
`F1`: open or close Developer Tools
`Escape`: close Developer Tools
Test
Open the panel with F1.
Spawn normal and elite enemies.
Toggle enemy AI and enemy damage separately.
Toggle telegraphs.
Restore party health and reset cooldowns.
Toggle god mode and no cooldowns.
Spawn all loot rarities.
Toggle hit stop, damage numbers, knockback, camera shake, and player feedback.
Pause auto waves and start the next wave manually.
Toggle the movement debug overlay.
```bash
npm run build
npm run dev
```
Suggested commit:
```bash
git add .
git commit -m "feat: add in-game developer tools panel"
git push
```

#### 0.4.0 - Party Management
New files:
src/ui/party/PartyManagementTypes.ts
src/ui/party/PartyManagementScreen.ts
src/ui/party/PartyManagementScreen.css
Modified:
src/main.ts
Press I to open the unified party screen. Generate loot with the developer console, select an item, compare all three characters, and equip in two clicks.
Validate:
```bash
npm run build
npm run dev
```
Suggested commit:
```bash
git add .
git commit -m "feat: add unified party management and shared inventory"
git push
```