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

#### 0.4.1 — Party Management Refinement
New behavior
Inventory has a fixed-height scroll region.
Party and character information remain visible as loot grows.
Character selection in Party Management is independent from the character
controlled in the game.
Inventory recommendation sorting and comparisons use the selected menu
character.
Equipped slots use rarity-colored borders.
Equipment has one equip path: the button under the selected character.
Bulk selection supports:
Select all visible unequipped items
Clear selection
Destroy selected
Destroy visible common and magic items
Equipped items cannot be destroyed.
The selected character has Equipment, Skills, and Statistics tabs.
Existing Q and E skills can be reassigned to slots 1–4.
Gear now has explicit tradeoffs:
Fortified: health and focus, reduced technique/precision
Agile: attack, precision, and swap power, reduced health
Focused: focus and technique, reduced health/raw attack
Files
Replace:
`src/main.ts`
`src/ui/party/PartyManagementTypes.ts`
`src/ui/party/PartyManagementScreen.ts`
`src/ui/party/PartyManagementScreen.css`
Test
```bash
npm run build
npm run dev
```
Validate:
Generate enough loot to exceed one screen.
Confirm only the inventory area scrolls.
Select each character without changing the controlled game character.
Confirm recommendation sorting changes with the selected character.
Confirm equipped slot colors reflect rarity.
Confirm only the selected character panel contains the Equip button.
Select visible loot and destroy it in bulk.
Confirm equipped items are protected from destruction.
Reassign Q and E to different skill slots.
Confirm the changed skill slots work in combat.
Equip gear with negative stats and confirm comparisons clearly show tradeoffs.
Suggested commit:
```bash
git add .
git commit -m "feat: refine party management, skills, and loot cleanup"
git push
```

#### 0.4.2 — Party Management Polish
Changes
A clicked item is now the single selected item for inspect, equip, favorite, and destroy actions.
Removed the separate selection checkbox workflow.
Hovering an item temporarily previews its comparison; moving away returns to the clicked item.
Favorited items display a star and are protected from destruction.
Single-item destruction asks for confirmation.
Bulk common/magic cleanup summarizes the count and excludes equipped/favorited items.
Ability HUD labels now follow the actual 1–4 skill assignments.
Developer console is restored on `P`.
Save/load work remains deferred.
Replace/add
Copy all included `src/` files into matching paths.
Test
```bash
npm run build
npm run dev
```
Click one item and use Equip, Favorite, and Destroy without a checkbox.
Hover another item and confirm preview returns to the clicked item afterward.
Confirm favorited and equipped items cannot be destroyed.
Confirm bulk cleanup shows a summary and excludes protected items.
Reassign skills and confirm the in-game HUD names move to the correct number slots.
Press `P` and confirm Developer Tools opens.
Suggested commit:
```bash
git add .
git commit -m "fix: polish item actions and restore developer tools"
git push
```

##### 0.5.0.1 — Outdoor Zone Foundation
This update replaces the small combat arena with the first handcrafted outdoor
prototype zone.
New files
`src/game/world/WorldTypes.ts`
`src/game/world/WorldCollisionSystem.ts`
`src/game/world/OutdoorZoneBuilder.ts`
Modified files
`src/main.ts`
`src/game/config/GameBalance.ts`
`src/devtools/DeveloperActions.ts`
`src/devtools/DeveloperConsole.ts`
`src/devtools/DeveloperState.ts`
The package includes the complete matching 0.4.2 source set.
World content
80 × 56 outdoor play space
Primary route and two alternate routes
Primitive trees, bushes, rocks, logs, stream, bridge, cliffs, ruins, wagon,
and watchtower landmark
Decorative and soft vegetation with no collision
Tree-trunk-only collision
Solid rocks, cliffs, ruins, wagon, and tower
Jumpable fallen logs and low rocks
Stream boundary with:
Bridge crossing
Jumpable log crossing
Natural world boundaries instead of invisible walls
Survival waves disabled by default
Environment interaction classes
Decorative: no collision
Soft: no collision
Traversable: blocks while grounded; can be crossed while jumping
Solid: always blocks movement
Developer tools
Press `P`.
New world controls:
Teleport to Entrance
Teleport to Stream
Teleport to NPC Camp
Teleport to Bridge
Teleport to Elite Arena
Teleport to Exit
Toggle World Collision
Toggle Traversal Highlight
Validate
```bash
npm run build
npm run dev
```
Test:
Confirm the game begins at the zone entrance.
Walk through small and tall bushes.
Confirm tree trunks and large rocks block movement.
Walk around the entrance fallen log.
Jump over the entrance fallen log.
Cross the stream by the bridge.
Cross the stream using the western log while jumping.
Explore both alternate routes.
Confirm no enemies spawn automatically.
Use `P` to test every world teleport.
Toggle collision and traversal highlighting.
Confirm Party Management, combat, loot, and developer spawning still work.
Suggested commit:
```bash
git add .
git commit -m "feat: add first outdoor zone and traversal collisions"
git push
```

##### 0.5.0.2 — Traversal Surface System
This update replaces the simple jump-clearance behavior for logs with reusable
traversal surfaces.
New file
`src/game/world/TraversalSurfaceSystem.ts`
Modified files
`src/main.ts`
`src/game/world/WorldTypes.ts`
`src/game/world/WorldCollisionSystem.ts`
`src/game/world/OutdoorZoneBuilder.ts`
The package includes the complete matching 0.5.0.1 source set.
Traversal behavior
Each traversal surface now owns:
Entry A
Entry B
Safe ground landing at each end
Constrained movement axis
Surface height
Entry radius
Associated collision object
Current traversal surfaces:
Entrance fallen-log vault
Western stream log crossing
Behavior changes
The player must jump near a defined entry anchor to enter a traversal.
Once on a traversal surface, movement is constrained along its valid axis.
The player can move forward or backward along the object.
Sideways movement cannot dump the player into water.
Passing either end places the player at a defined safe landing point.
The player is explicitly returned to ground height after exiting.
Jumping into the middle of a traversal object does not bypass its collision.
Developer teleporting cancels any active traversal state.
Developer testing
Press `P`, then enable `Traversal Highlight`.
Blue anchor markers show the valid entry and exit locations.
Validate
```bash
npm run build
npm run dev
```
Test:
Approach the entrance log while grounded; confirm it blocks movement.
Jump near either blue entry anchor.
Move across the log and confirm lateral movement is constrained.
Exit either side and confirm player height returns to zero.
Reverse direction while on the log and exit from the original side.
Repeat on the stream log.
Confirm no exit position lands in the stream.
Attempt to jump into the middle of the stream log; confirm it does not
bypass the defined entry points.
Teleport while on a traversal surface and confirm the player is reset.
Confirm bridge movement, normal world collision, combat, loot, and Party
Management still work.
Enemy-body collision is intentionally deferred to the enemy territory update.
Suggested commit:
```bash
git add .
git commit -m "feat: add anchored traversal surfaces for logs"
git push
```

##### 0.5.0.3 — Guided and Free Traversal Surfaces
This update generalizes traversal into two deliberate modes.
Traversal modes
Guided
Used for narrow or hazardous crossings:
Stream logs
Beams
Pipes
Narrow bridges later
Behavior:
Entry only at defined anchors
Movement constrained along the traversal axis
Exit only at approved landing points
Free
Used for broad objects:
Slab rocks
Low platforms
Wide logs in safe areas
Ruined floors later
Behavior:
Entry from any accessible edge while jumping
Free movement across the top surface
Exit from any edge with valid ground beside it
Unsafe edges act as boundaries
Player height returns to ground level after exit
Current examples
Western stream log: guided
Entrance path log: free
Two shortcut rocks: free circular surfaces
New east-route slab rock: free rectangular surface
New and modified files
Modified:
`src/game/world/WorldTypes.ts`
`src/game/world/TraversalSurfaceSystem.ts`
`src/game/world/OutdoorZoneBuilder.ts`
`src/main.ts`
The package includes the complete matching 0.5.0.2 source set.
Developer visualization
Press `P` and enable `Traversal Highlight`.
Blue anchor markers identify guided entry and exit points.
Green overlays identify free traversal footprints.
Validate
