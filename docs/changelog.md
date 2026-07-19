# Changelog

All notable project changes will be documented here.

- Initial browser-based ARPG prototype
- Babylon.js rendering
- TypeScript and Vite build system
- GitHub Pages deployment
- Initial party, combat, enemy, and loot systems

# 0.2.0
Sprint 2 input update
Copy the `src` files into the repository, then run `npm run build`.
Controls: LMB move, RMB basic attack, WASD direct movement, R dodge, Space jump, 1-4 abilities, Tab/Shift+Tab or mouse wheel cycle control, I inventory.

## 0.2.2 movement feel
Sprint 2B — Movement feel
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

# 0.3.0 - Combat Feel Foundation
Copy the included files into matching repository paths.

Verify enemy hit flash, damage numbers, knockback, strong-hit camera shake,
enemy attack telegraphs, dodge avoidance, player hit feedback, and all prior
movement and party controls.


## 0.3.1 — Developer Tools
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

# 0.4.0 - Party Management
New files:
src/ui/party/PartyManagementTypes.ts
src/ui/party/PartyManagementScreen.ts
src/ui/party/PartyManagementScreen.css
Modified:
src/main.ts
Press I to open the unified party screen. Generate loot with the developer console, select an item, compare all three characters, and equip in two clicks.


## 0.4.1 — Party Management Refinement
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

## 0.4.2 — Party Management Polish
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

# 0.5.0.1 — Outdoor Zone Foundation
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

## 0.5.0.2 — Traversal Surface System
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

## 0.5.0.3 — Guided and Free Traversal Surfaces
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

## 0.5.0.4 — Movement Surface Polish and Blink Rules
This update refines traversal transitions and establishes the first formal
Blink traversal rules.
Traversal changes
Traversal now reports explicit movement states:
Ground
Air
Entering guided
Guided
Entering free
Free
Leaving
Entering a traversal surface uses a short smooth blend instead of a hard
positional snap.
Walking off a valid edge uses a short exit blend back to ground height.
Jump can be used directly from guided and free traversal surfaces.
Jump immediately releases the surface constraint and returns control to the
normal airborne movement.
Re-entry is temporarily locked while airborne to prevent snapping back onto
the surface.
Blink cancels traversal state cleanly.
Blink rules
Tempest's Blink Strike now works as both a combat and traversal ability.
Blink can:
Cross thin water
Cross short gaps
Clear low traversable objects
Exit traversal surfaces
Blink toward an enemy or toward the cursor when no enemy is selected
Blink cannot:
Pass through trees
Pass through rocks
Pass through walls, cliffs, ruins, gates, or other solid geometry
End in water
End inside a collider
exceed its configured maximum range
The Blink path is sampled from start to destination. Hazards such as water do
not block the path, but solid geometry does. If the requested endpoint is not
safe, Blink backs up to the last valid landing point.
Modified files
`src/main.ts`
`src/game/world/WorldTypes.ts`
`src/game/world/WorldCollisionSystem.ts`
`src/game/world/TraversalSurfaceSystem.ts`
`src/game/world/OutdoorZoneBuilder.ts`
The package includes the complete matching 0.5.0.3 source set.

## 0.5.0.5 — Traversal Hotfix
This hotfix removes the over-constrained entry/exit state machine introduced in
0.5.0.4.
Fixes
Jump immediately releases guided and free traversal surfaces.
Normal airborne movement controls the player after release.
The player is temporarily prevented from reattaching to the same surface.
Guided surfaces exit when the player reaches an endpoint and continues moving
outward.
The stream log no longer requires movement beyond a clamped hidden threshold.
Entry assistance is lightweight and does not freeze normal movement.
Free surfaces retain unrestricted movement across their top.
Blink rules from 0.5.0.4 remain unchanged.
Modified files
`src/main.ts`
`src/game/world/TraversalSurfaceSystem.ts`
The package includes the complete matching 0.5.0.4 source set.


# Astral 0.5.1.0 — Surface-Aware Movement

This update replaces the competing traversal/jump logic with one coordinated
vertical movement model.

## Architecture

`PlayerMovementController` now owns all vertical behavior:

- Grounded state
- Jump velocity
- Gravity
- Landing
- Support height
- Falling from raised surfaces

`TraversalSurfaceSystem` now owns only:

- Which surface is under the player
- Surface support height
- Guided horizontal constraints
- Free-surface boundaries
- Safe edge exits
- Collider exclusions

The traversal system no longer directly changes player height or jump state.

## Modified files

- `src/main.ts`
- `src/game/movement/PlayerMovementController.ts`
- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/WorldCollisionSystem.ts`

`MovementConfig.ts` is included unchanged from the current project.

## Expected behavior

### Jumping

- Jump works normally from ground, guided logs, free logs, rocks, and slabs.
- Jump starts from the current support height.
- Gravity and landing remain controlled by one movement system.
- Jumping from a raised surface naturally releases the traversal guide.
- Walking off a raised free surface begins a short natural fall instead of
  snapping immediately to ground.

### Guided surfaces

- Narrow stream logs remain endpoint-entry only.
- Horizontal movement is constrained along the log while grounded.
- Continuing outward at either endpoint exits the log.
- Jumping releases the guide immediately.

### Free surfaces

- Broad logs, rocks, and slabs can be landed on from any accessible side.
- Movement remains free across the top.
- Safe edges allow exit.
- Unsafe edges remain blocked.
- Jump works from anywhere on the surface.

### Collision

- Traversable colliders still block grounded movement.
- Airborne players above the object's clearance height may pass over the
  collider and land on its support surface.
- Solid geometry still blocks walking, jumping paths, and Blink.

### Blink

- Blink still crosses thin water and short gaps.
- Blink still cannot pass through walls, trees, cliffs, or other solid
  geometry.
- Blink resets vertical and traversal state at its final safe landing.

## Astral 0.5.1.1 — Continuous Geometry Support

This update removes remembered traversal support. Logs, rocks, and slabs are
queried from geometry every frame.

### Core behavior

Every frame the world system asks:

- Is the player over a traversal footprint?
- Is the player standing on it?
- Is the player descending through its top height?
- Is the surface guided or free?
- Does the surface need a horizontal constraint?
- Is the adjacent exit safe?

The surface must be rediscovered every frame. The player can no longer acquire
support once and then fall through it on the next frame.

### Architecture

`PlayerMovementController` continues to own:

- Jump
- Gravity
- Grounded state
- Vertical velocity
- Landing
- Support height

`TraversalSurfaceSystem` is now a stateless geometry query:

- No active surface
- No entry state
- No exit state
- No traversal cooldowns
- No vertical movement control

### Guided surfaces

The stream log remains guided:

- Initial landing is only accepted near either endpoint.
- Once supported, the player is projected onto the log axis each frame.
- Walking beyond an endpoint removes support and starts a natural fall to the
  bank.
- Jumping removes support automatically because the player is airborne.

### Free surfaces

Broad logs, shortcut rocks, and slabs:

- Can be landed on from accessible sides.
- Continuously provide support while the player remains over the footprint.
- Allow free movement across the top.
- Release support when the player leaves a safe edge.
- Block unsafe exits beside water or other hazards.

### Modified files

- `src/main.ts`
- `src/game/world/TraversalSurfaceSystem.ts`

# Astral 0.5.1.2 — Guided Traversal Corridors

This update keeps continuous geometry support and changes narrow crossings into
soft guided corridors.

## Traversal categories

### Free geometry

Used for:

- Broad logs
- Slab rocks
- Shortcut rocks
- Platforms
- Ruined floors later

Behavior:

- Land from any accessible side
- Move freely across the top
- Jump off normally
- Leave any safe edge

### Guided corridors

Used for:

- Stream logs
- Narrow beams
- Pipes
- Fallen columns
- Narrow bridges later

Behavior:

- Land anywhere along the corridor, including the middle
- Continuous support from geometry every frame
- Soft invisible side guides keep the player over the crossing
- Lateral movement is clamped rather than snapped to the centerline
- Jumping removes support naturally
- Walking beyond either end removes support naturally

## Current stream-log behavior

The western stream log now:

- Accepts a descending jump anywhere along its usable length
- Supports the player continuously in the middle
- Allows some side-to-side movement
- Prevents accidental sideways movement into water
- Allows jumping off at any point
- Allows walking off either bank-facing end

## Developer visualization

Press `P` and enable `Traversal Highlight`.

- Blue endpoint markers remain visible.
- A translucent blue rectangle shows the full guided corridor.
- Green overlays continue to show free traversal surfaces.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`

# Astral 0.5.1.3 — Movement Model Lock

This milestone finalizes the movement and surface-support model before World
Volumes begin in 0.5.2.

## Locked movement rules

Universal values are now defined in `GameBalance.movement`:

- `stepHeight: 0.22`
- `maximumJumpOntoHeight: 1.15`
- `maximumWalkableSlopeDegrees: 42`
- `groundSnapDistance: 0.18`

### Height behavior

- Height changes at or below `stepHeight` may be walked onto.
- Raised surfaces above `stepHeight` require an airborne descending landing.
- Normal jumps may land only on surfaces no more than
  `maximumJumpOntoHeight` above the prior support.
- Surfaces beyond the maximum walkable slope are rejected as support.
- The stream log remains raised at `Y = 0.58`, so it cannot be walked over or
  entered without jumping.

## Stream-log changes

The river log is now one continuous raised walkable surface:

- No endpoint landing spots
- No entry anchors
- No endpoint state logic
- Land anywhere along the usable length
- Continuous support at `Y = 0.58`
- Soft lateral guide corridor similar to bridge-side protection
- Walk or jump off either end
- Jump remains required to get onto it

The guide corridor is a movement constraint, not a hard physical wall.

## Surface model

All walkable geometry now supports the same foundation:

- Static support height
- Optional sampled support height for hills, stairs, ramps, and uneven terrain
- Optional slope metadata
- Optional per-frame surface movement for moving platforms, elevators, boats,
  and similar systems
- Optional lateral guidance for narrow walkable objects

## Future-ready examples

### Stairs

Use a sampled ramp support surface. Visible stair treads remain art geometry.

### Hills and ramps

Provide `sampleHeight(x, z)` and `slopeDegrees`.

### Moving platforms

Provide `frameDelta` each frame. Supported actors inherit that movement.

### Narrow beams and pipes

Use a guided surface with a narrow `guideHalfWidth`.

### Broad rocks, roofs, and slabs

Use free box or circular surfaces without lateral guidance.

## Modified files

- `src/game/config/GameBalance.ts`
- `src/game/movement/MovementConfig.ts`
- `src/game/world/WorldTypes.ts`
- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`

## Validate

The supplied source package does not contain the repository-level
`package.json`, so validation must be run after copying it into the repository:

# Astral 0.5.2.0 — World Volumes

This milestone begins the world-volume framework while preserving the locked
surface movement model.

## Final surface rule

All logs and small beams now behave like the entrance log:

- Raised free walkable surfaces
- Jump required when above `stepHeight`
- Land from any accessible point
- Move freely on top
- Walk or jump off any edge

The stream log is no longer a guided corridor. Restrictions near ledges,
bridges, hazards, and narrow paths should be built with world volumes rather
than special traversal behavior.

## New files

- `src/game/world/WorldVolumeTypes.ts`
- `src/game/world/WorldVolumeSystem.ts`

## Modified files

- `src/main.ts`
- `src/game/config/GameBalance.ts`
- `src/game/world/WorldTypes.ts`
- `src/game/world/WorldCollisionSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/devtools/DeveloperActions.ts`
- `src/devtools/DeveloperConsole.ts`
- `src/devtools/DeveloperState.ts`

## World-volume foundation

The engine now supports:

### Modifier volumes

Change movement without causing direct damage.

Current example:

- Shallow water
- 65% movement speed
- Jump and dodge remain available

Future uses:

- Mud
- Snow
- Ice
- Tall grass
- Wind
- Slow fields

### Hazard volumes

Change movement and apply timed danger.

Current example:

- Deep river water
- 25% movement speed
- Jump disabled
- Dodge disabled
- Five-second drowning timer
- Player may retreat toward the original bank
- Player may not continue swimming across the river
- Drowning returns the player to the original bank and defeats the active
  character

Future uses:

- Lava
- Acid
- Poison
- Quicksand
- Deep mud
- Environmental damage zones

## River behavior

The river is divided into:

1. South shallow-water band
2. Deep-water center
3. North shallow-water band

Raised surfaces take precedence over water volumes. The bridge and logs remain
safe while the player is supported above the water.

The player may intentionally enter the river:

- Shallow water slows movement
- Deep water starts the timer
- Deep movement is constrained toward the entry bank
- Crossing through deep water is prevented
- Blink may cross the water only when it reaches valid ground
- Blink may not end inside water

## Developer tools

Press `P`.

The World section now contains:

- Surface Highlight
- World Volumes

World-volume visualization:

- Blue: modifier volume
- Red: hazard volume

# Astral 0.5.2.1 — Volume Type Validation

This update fixes the remaining free-surface edge retention and expands World
Volumes into a reusable set of validated gameplay categories.

## Confirmed log issue

The cross-river log was still affected by legacy free-surface edge protection.
When the system detected blocked or hazardous ground beneath an edge, it
clamped the player back onto the surface. The entrance log did not show the
same behavior because it had safe ground beside it.

That behavior has been removed.

All free surfaces now release support at every edge. Logs, beams, rocks, slabs,
and similar objects never hold the player in place. Any desired ledge rail,
edge restriction, one-way boundary, or safety barrier must now be authored as a
World Volume.

## World volume types

### Modifier volume

Changes movement rules while occupied.

Validated with the brown mud pad:

- 45% movement speed
- Dodge disabled
- No damage

Future uses include shallow water, mud, snow, tall grass, wind, and silence
fields.

### Hazard volume

Applies continuous environmental damage and may also modify movement.

Validated with the red fire pad:

- 18 damage per second
- 80% movement speed
- Damage bypasses normal combat hit invulnerability

Future uses include fire, lava, poison, acid, electrified floors, and damaging
weather.

### Water hazard volume

Retains the existing river behavior:

- Deep-water movement reduction
- Jump and dodge restrictions
- Five-second drowning timer
- Entry-bank recovery
- No swimming across

### Constraint volume

Rejects entry and restores the prior position.

Validated with the orange constraint pad. This is the reusable replacement for
special ledge clamps and invisible traversal rails.

Future uses include:

- Ledge safety strips
- Temporary arena boundaries
- One-way world gates
- Narrow-path side limits
- Cutscene containment

### Trigger volume

Emits a named event on entry.

Validated with the yellow trigger pad. The test trigger fires again after the
player leaves and re-enters.

Future uses include dialogue, quests, music, checkpoints, cutscenes, boss
activation, and tutorial prompts.

### Spawn volume

Emits an enemy-spawn request on entry.

Validated with the purple spawn pad:

- Spawns two normal enemies
- Can be retriggered after exiting and re-entering

Future uses include ambushes, wildlife, encounter groups, reinforcements, and
loot or prop population.

## Volume test lane

Open Developer Tools with `P` and select **Volume Tests**.

The test lane contains, from left to right:

1. Brown — modifier
2. Red — damage hazard
3. Yellow — trigger
4. Purple — spawn
5. Orange — constraint

Enable **World Volumes** to see the debug footprints.

Debug colors:

- Blue — modifier
- Red — hazard or water hazard
- Orange — constraint
- Yellow — trigger
- Purple — spawn

## Modified files

- `src/main.ts`
- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/WorldVolumeTypes.ts`
- `src/game/world/WorldVolumeSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/devtools/DeveloperConsole.ts`

## Validation checklist

1. Walk off every side and both ends of the cross-river log.
2. Confirm the character falls naturally instead of being retained.
3. Repeat on the entrance log, rocks, and slab.
4. Enter the brown pad and verify movement slows and dodge is disabled.
5. Leave the brown pad and verify normal movement returns.
6. Enter the red pad and confirm health decreases continuously.
7. Enter, leave, and re-enter the yellow pad; confirm the trigger message fires
   on each entry only.
8. Enter the purple pad and confirm two enemies spawn.
9. Remain on the purple pad and confirm it does not repeatedly spawn enemies.
10. Leave and re-enter the purple pad and confirm it triggers again.
11. Attempt to enter the orange pad from several directions and confirm entry
    is rejected.
12. Retest shallow water, deep water, drowning, bank recovery, bridge crossing,
    and Blink landing rules.
13. Enable World Volumes and confirm all debug footprints match their pads.

# Astral 0.5.2.2 — Surface and Volume Precedence Fix

This patch addresses the two remaining river-crossing issues found during
0.5.2 validation.

## Fix 1: River log releases at both ends

The log was no longer using guided traversal, but its physical collider could
still block the player during the exact frame that support changed from the
log to ground.

Free surfaces now:

- Detect when the actor leaves their footprint
- Return ground support immediately
- Ignore their own collider for that release frame
- Allow gravity to take over naturally

This applies consistently to:

- Logs
- Small beams
- Rocks
- Slabs
- Similar raised free surfaces

No edge safety or retention is provided by the surface system. Any intentional
restriction must be authored through a world volume.

## Fix 2: Bridge overrides water

The bridge visuals did not have a matching support surface, so the player
remained at ground support height while crossing it. The water system correctly
interpreted that as entering the river.

The old bridge now has a free box support surface:

- Support height: `0.22`
- Full bridge footprint
- Walk-on step height
- Water volumes ignored while supported
- Water activates normally after walking or jumping off

The water system now explicitly follows this precedence:

```text
Resolved raised support
    overrides
Water volume beneath it
```

This rule applies to bridges, logs, rocks, platforms, docks, and future moving
surfaces without requiring per-volume exclusions.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/world/WorldVolumeSystem.ts`

# Astral 0.5.3 — Movement Validation Course

This milestone adds a developer-only regression course containing twelve
movement and world-system tests. The course is intentionally separate from the
playable zone so it can remain stable while world content changes.

## Access

Press `P`, then choose **Movement Course** under World.

The teleport places the player immediately before Station 1. The course runs
north in numerical order. Enable **Surface Highlight** and **World Volumes** to
inspect the underlying support and volume geometry.

## The 12 validation stations

1. **Small step**
   - Height: `0.22`
   - Must be entered without jumping
   - Confirms the universal step-height limit

2. **Jump-only ledge**
   - Height: `0.58`
   - Must reject walk-on entry
   - Must accept a descending jump

3. **Stairs**
   - Six visual treads
   - `0.18` rise per tread
   - Uses sampled support height rather than six unique movement states

4. **Hill**
   - Continuous `sampleHeight(x, z)` support
   - Tests ascent, cresting, descent, and slope acceptance

5. **Narrow beam**
   - Standard free surface
   - No guided behavior
   - No edge retention

6. **Bridge with side volumes**
   - Raised support surface
   - Constraint volumes along both side rails
   - Both ends remain open

7. **Shallow water**
   - Ground-contact-only modifier
   - Movement reduced to 65%
   - No drowning timer

8. **Deep water**
   - Movement reduced to 25%
   - Jump and dodge disabled
   - Five-second drowning timer
   - Retreat allowed only toward the entry bank
   - Side bypass allows the full course to continue

9. **Horizontal moving platform**
   - Oscillates four units left and right
   - Updates visual mesh, collider, and support footprint together
   - Supported player inherits horizontal `frameDelta`

10. **Elevator**
    - Oscillates between approximately `0.4` and `2.8` support height
    - Carries a grounded player upward and downward
    - Walking or jumping off releases support normally

11. **Conveyor**
    - Walkable low support surface
    - Force volume moves the player forward at `2.4` units/second
    - Player input remains active against or with the conveyor

12. **Crosswind force volume**
    - Applies a sideways force of `3.2` units/second
    - Reduces voluntary movement to 85%
    - Validates reusable environmental push behavior

## Engine changes

### Dynamic surfaces

`OutdoorZone.update(dt)` now advances authored dynamic surfaces before movement
resolution. Dynamic surfaces update:

- Mesh position
- Collider position
- Support footprint or height
- Per-frame surface delta

The surface system applies horizontal platform delta to a supported actor.
Vertical movement is resolved through the sampled support height.

### Descending support following

`PlayerMovementController.setSupportHeight()` now accepts a
`followDescendingSupport` flag. Elevators use it to carry a grounded player
downward. Normal loss of support still starts a fall.

### Force volumes

A reusable `force` world-volume type was added with:

- X velocity
- Z velocity
- Optional movement-speed multiplier
- Optional jump or dodge restrictions

This supports conveyors, wind, currents, fans, push fields, and similar future
world mechanics.

### Ground-contact modifiers

Modifier volumes may now set `groundContactOnly`. This prevents shallow water,
mud, and similar ground effects from influencing actors supported on bridges,
logs, platforms, or other raised geometry.

## Modified files

- `src/main.ts`
- `src/devtools/DeveloperConsole.ts`
- `src/game/config/GameBalance.ts`
- `src/game/movement/PlayerMovementController.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/WorldTypes.ts`
- `src/game/world/WorldVolumeSystem.ts`
- `src/game/world/WorldVolumeTypes.ts`

## Validation checklist

Run the full course from Station 1 through Station 12 with both WASD and click
movement where practical. Pay particular attention to:

- Walking onto the `0.22` step without jumping
- Being blocked by the `0.58` ledge until jumping
- Smooth support changes on stairs and the hill
- Falling freely from the beam
- Bridge side constraints and open ends
- Raised supports ignoring ground-contact water modifiers
- Deep-water retreat and drowning recovery
- Standing still on the horizontal platform
- Walking while the horizontal platform moves
- Jumping from and landing on the moving platform
- Riding the elevator through a complete up/down cycle
- Walking against the conveyor and crosswind

# Astral 0.5.3.1 — Movement Course Fixes and Dynamic Collision

This patch addresses the first complete test pass through the 0.5.3 movement
validation course.

## Fixes from the test report

1. **0.22 step acquisition**
   - Added a small numerical tolerance to the universal step-height comparison.
   - Expanded the step acquisition footprint so the actor can acquire support
     before its capsule is stopped by the traversable collider.

2. **0.22 edge sticking**
   - Jump landings now require the actor center to be inside the actual surface
     footprint, rather than the padded approach area.
   - Padded acquisition remains available only for grounded step-up behavior.

3. **Stair and hill undersides**
   - Added side and back constraint volumes so the test geometry cannot be
     entered from underneath or behind.

4. **Stairs-to-hill landing**
   - Descending actors may now acquire any valid lower support crossed during
     the frame. Landing is no longer rejected because the prior support was
     more than the ground-snap distance above the destination surface.

5. **Bridge rails**
   - Visible bridge rails now receive solid colliders. They cannot be bypassed
     by jumping over a short constraint volume.

6. **Raised support over water**
   - Added raised-support tests inside both shallow and deep water stations.
   - These verify that raised support suppresses ground-contact water modifiers
     and deep-water hazards.

7. **Horizontal dynamic collision**
   - Added `DynamicCollisionSystem`.
   - A moving platform now pushes an actor standing beside it on the zero plane
     instead of passing through.
   - Riding on top continues to use surface `frameDelta` and is not double-pushed.

8. **Elevator underside collision**
   - The elevator now has a dynamic solid volume.
   - When rising into an actor beneath it, the actor is moved to the platform
     top rather than being penetrated.

9. **Conveyor**
   - Existing behavior retained.

10. **Wind accessibility**
    - Extended the ground and added a connecting approach path.
    - Moved the final force station slightly inward.

## New engine file

- `src/game/world/DynamicCollisionSystem.ts`

## Modified files

- `src/main.ts`
- `src/game/world/WorldTypes.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/world/TraversalSurfaceSystem.ts`

## Test order

1. Walk directly onto the 0.22 step from all four sides.
2. Jump near each step edge and walk off slowly in every direction.
3. Try to enter beneath the stairs and hill from the sides and back.
4. Jump from the upper stairs onto multiple points of the hill.
5. Walk and jump against both bridge rails.
6. Cross both raised water supports and verify no water effects occur while on top.
7. Stand beside the horizontal platform and let it move into the character.
8. Stand on top and confirm the horizontal platform still carries correctly.
9. Stand under the elevator and let it rise.
10. Ride the elevator up and down from the top.
11. Recheck the conveyor.
12. Walk through the connected wind station.

# Astral 0.5.3.2 — Support Ownership Final Test

This is the final movement-course correction pass before moving into the
engine-core roadmap.

## Support ownership

`TraversalSurfaceSystem` now tracks one explicit support owner:

```text
currentSupportSurfaceId
```

While grounded:

- The current surface remains the owner only while the actor center remains
  inside its true footprint.
- Entry padding is not used to retain an existing support.
- Leaving the footprint immediately releases that support.
- The released surface's collider is ignored for that one frame.
- Another valid surface may take ownership during the same frame.
- If no valid support exists, ground support is selected and gravity begins.

This prevents alternating support decisions at stair and hill edges, which
caused partial embedding and stuck states.

Blink and developer teleports clear support ownership.

## Stairs and hill

The temporary side and rear constraint volumes were removed.

Permanent authored structures now use:

```text
Visual geometry
Support surface
Solid collision
```

The stairs and hill have solid side collision and height-aware rear collision.

Rear collision prevents walking underneath from ground level but permits the
player to leave from the supported upper surface. This preserves course
progression while closing the visible underside.

## Height-aware world collision

World colliders now optionally support:

```ts
minimumY
maximumY
```

This allows solid geometry to block at ground level without creating infinitely
tall invisible barriers above a structure.

Existing colliders remain unchanged when these fields are omitted.

## Final station access

The movement-course world bound was extended:

```text
maxZ: 122
→
maxZ: 145
```

Station 12 is centered near `Z = 130`, so the former player bound was the
invisible blocker shown before the crosswind test.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/WorldTypes.ts`
- `src/game/world/WorldCollisionSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/config/GameBalance.ts`

## Final validation route

Run the full 12-station course:

1. Walk onto and off the `0.22` step from all sides.
2. Jump onto the step near each edge.
3. Confirm no partial embedding or stuck state.
4. Traverse the stairs from bottom to top and back down.
5. Push against both stair sides and the rear from ground level.
6. Leave the stair top toward the hill.
7. Jump from stairs to hill repeatedly at the left, center, and right.
8. Traverse both hill slopes and test every outer edge.
9. Confirm the player cannot walk beneath the hill terraces.
10. Retest beam, bridge, shallow water, and deep water.
11. Stand beside the horizontal platform and confirm it pushes the player.
12. Stand under the elevator and confirm it resolves contact.
13. Confirm conveyor behavior remains correct.
14. Continue beyond the conveyor and reach the crosswind station.
15. Cross the full wind area in both directions.
16. Repeat the route with collision, support, and volume debug displays active.

# Astral 0.5.3.3 — Movement Polish

This milestone closes the movement-validation phase with support-contact
refinement, visual/collision parity, continuous hill geometry, and smoother
dynamic-platform following.

## 1. Capsule-aware support contact

Support is no longer accepted from the player center point alone.

The surface system samples the player capsule footprint at:

- Center
- Left
- Right
- Front
- Rear

All five samples must be over a free surface before that surface may become or
remain the support owner.

This changes edge behavior:

- Landing with only part of the capsule over an edge is rejected.
- The actor falls cleanly instead of becoming split between support and
  collision.
- Existing support releases before the capsule becomes partially embedded.
- Narrow beams remain usable because their authored width supports the defined
  contact radius.

The current test contact radius is:

```text
0.42
```

## 2. Continuous hill geometry

The seven terraced hill pieces were removed.

The hill is now:

- One continuous visible mesh
- One matching sampled support surface
- Two visible triangular side faces with matching side collision
- Open at both sloped ends
- Free of invisible rear or side walls

The support height now follows the visible two-sided hill profile exactly.
There are no terrace seams for the player to land between.

## 3. Stair collision parity

The stairs retain their visible treads.

Each visible tread now has matching collision using the same shared stair
support label. The former invisible side and rear walls remain removed.

This means:

- Collision exists only where stair geometry exists.
- The stair support can still ignore its own tread collision while walking.
- The player is not blocked by walls that are not visually represented.

## 4. Edge landing refinement

Entry padding no longer makes an edge landing valid.

Step, jump, and owned-support checks use the same capsule-contact test. This
keeps acquisition and retention rules consistent.

## 5. Moving-platform smoothing

Dynamic vertical support remains logically exact, but the visible actor height
now follows moving support with a short exponential blend.

This reduces abrupt snapping on:

- Elevators
- Vertically moving platforms
- Future lift tables

Horizontal platform displacement remains exact so the player does not drift
off a moving platform.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/movement/PlayerMovementController.ts`
- `src/main.ts`

# Astral 0.5.3.4 — Single-Contact Support

This revision simplifies movement support after the multipoint capsule test
introduced conflicting support decisions.

## Core rule

```text
Collision decides where the actor may exist.
Support decides what is directly beneath the actor's feet.
```

The support system no longer samples five points around the capsule.

## Single foot query

Support acquisition now uses one foot position at the player root.

When multiple surfaces are available, the engine selects the highest valid
walkable support beneath that point.

The support system no longer attempts to solve capsule overlap. That remains
the responsibility of world and dynamic collision.

## One active support owner

The resolver continues to track:

```text
currentSupportSurfaceId
```

While grounded:

1. The current owner is checked first.
2. If the foot point remains inside its release boundary, ownership continues.
3. If ownership is lost, all valid supports beneath the foot are evaluated.
4. The highest valid support becomes the new owner.
5. If no support is available, the actor falls to ground support.

Blink, teleport, and reset operations clear ownership.

## Support hysteresis

Two small boundaries are used:

```text
Acquisition inset:       0.035
Ownership release pad:   0.025
```

A new surface cannot be acquired from its exact mathematical edge.

An existing owner receives only a very small tolerance to avoid floating-point
flicker. The tolerance is intentionally too small to hold the actor visibly
outside the surface.

## Smooth stair support

The six visible stair treads remain unchanged, but they no longer provide
individual collision or stepped support heights.

The stairs now use one continuous ramp support:

```text
Visible stairs
+
Continuous support ramp
```

This removes conflicting contacts between adjacent treads and produces a
stable transition into jumps and nearby sloped surfaces.

There are no added stair side or rear walls.

## Hill

The continuous hill mesh and matching sampled support introduced in 0.5.3.3
are retained.

## Moving-platform follow

The vertical support blend was tightened slightly:

```text
22
→
28
```

This should reduce visible snapping without introducing noticeable separation
between the player and an elevator.

Horizontal inherited movement remains exact.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/OutdoorZoneBuilder.ts`
- `src/game/movement/PlayerMovementController.ts`

# Astral 0.5.3.5 — Passive Support Refactor

This revision removes horizontal correction from the support system.

## Final ownership rule

```text
Collision owns X/Z.
Support owns Y.
```

Support no longer:

- Clamps horizontal position
- Moves the player onto a surface
- Corrects the player toward an edge
- Applies platform displacement through its support result
- Uses acquisition insets or ownership padding

Given a collision-resolved foot position, support returns only:

- Support height
- Surface ID
- Surface movement delta
- Collider label that may be ignored while standing on that surface

## Frame order

The gameplay frame now resolves in this order:

1. Dynamic world geometry updates.
2. The currently owned moving surface contributes its frame delta.
3. Collision resolves inherited platform motion.
4. Dynamic colliders push actors contacted from the side or underneath.
5. Player input and movement update.
6. A preliminary passive support query identifies a traversable collider that
   may be ignored, such as the `0.22` step.
7. World collision resolves the requested X/Z position.
8. A final passive support query samples the collision-resolved foot position.
9. The movement controller applies only the returned support height.
10. World volumes apply gameplay effects.

## `0.22` step

Walking onto the step is supported again without allowing support to move the
player.

When the requested foot position lies on the step and the height change is
within `stepHeight`, the preliminary query identifies the step as walkable.
World collision then ignores that step's traversable collider for the move.
The final query applies the `0.22` support height at the resolved position.

## Edge release

When the foot point leaves the current support footprint:

- Support immediately returns ground or another valid surface.
- The old support collider is ignored for one release query.
- Horizontal movement continues through collision normally.
- Gravity begins when no support is found.

No ownership padding or edge correction remains.

## Moving platforms

A supported actor inherits the platform's current `frameDelta` before player
input. That inherited movement is passed through world collision.

The support result itself does not change X/Z.

This prevents support acquisition from placing the player on another part of
the platform.

## Horizontal dynamic collision

The side-push resolver now preserves which side of a moving platform the actor
was on relative to the platform's previous position.

Previously, the actor could be pushed to the platform's travel-direction edge,
which could appear as a teleport across the full platform.

Now:

- Actor on the left remains on the left.
- Actor on the right remains on the right.
- Actor in front or behind retains that side.
- The platform still pushes rather than passing through the actor.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/game/world/DynamicCollisionSystem.ts`
- `src/main.ts`

# Astral 0.5.3.6 — Collision Refactor

This revision addresses two collision failures found during movement-course
testing:

- The `0.22` platform side wall blocked movement before legal step-up.
- The actor capsule caught on the vertical side face while leaving platforms.

## Collision model

Walkable geometry is now treated as two separate concepts:

```text
Walkable top
    Used for step-up, landing, and support height

Blocking side faces
    Used for horizontal collision
```

The support resolver remains passive. It never modifies X/Z.

## Explicit step-up resolver

Before horizontal collision is allowed to reject movement, the traversal
surface system now checks for a legal step candidate.

A step is valid when:

- The actor is grounded.
- The actor is moving toward a free walkable surface.
- The capsule has reached the expanded side-face boundary.
- The top is above the current support.
- The rise is no more than `stepHeight + 0.015`.
- The surface slope is walkable.

For a valid step:

1. The candidate surface collider is ignored for that horizontal move.
2. Collision resolves the requested X/Z.
3. The step top supplies the support height.
4. Normal exact-foot support takes over once the foot point reaches the top
   footprint.

This allows the `0.22` platform to be walked onto without jumping.

## Clean ledge release

When the foot leaves a support surface, its vertical side collider remains
ignored until the entire actor capsule has cleared the expanded footprint.

Release clearance is:

```text
actorRadius + 0.04
```

The bypass is based on physical clearance rather than a one-frame timer.

This prevents the sequence:

```text
Support releases
Capsule overlaps side face
Collision restores previous X/Z
Actor hangs on the ledge
```

The side face becomes active again as soon as the capsule is fully clear.

## Moving platforms

The previous passive-support and side-preserving dynamic-platform changes are
retained.

- Support does not reposition the actor horizontally.
- Platform frame movement is inherited before player input.
- Side contact preserves the actor's original side instead of teleporting them
  across the platform.

## Modified files

- `src/game/world/TraversalSurfaceSystem.ts`
- `src/main.ts`

# Astral 0.5.4.1 — Entity Foundation

This milestone begins the 0.5.4 engine-architecture phase without migrating
movement or combat into a new framework prematurely.

## Goal

Provide one central authority for:

- Stable entity identity
- Entity lookup
- Tags
- Components
- Lifecycle state
- Deferred destruction
- Queries
- Developer inspection

Behavior remains in systems. Entities are lightweight containers.

## New engine files

```text
src/engine/entity/
  Entity.ts
  EntityComponents.ts
  EntityRegistry.ts
  EntityTypes.ts
  index.ts
```

## Entity identity

Every entity has a stable string ID.

IDs may be authored:

```ts
entities.create({
  id: 'player',
  name: 'Player',
});
```

or generated automatically:

```text
entity-1
entity-2
entity-3
```

Duplicate IDs throw immediately.

## Lifecycle

Supported states:

```text
active
disabled
destroy-pending
destroyed
```

Destruction is deferred:

```ts
entities.destroy(entity.id);
entities.flushDestroyed();
```

This allows gameplay systems to iterate query results safely during the frame.

Destroyed entities:

- Are removed from the registry
- Lose tags
- Lose components
- Cannot be modified

## Tags

Tags provide broad classification:

```ts
entity
  .addTag('actor')
  .addTag('player')
  .addTag('controllable');
```

Queries may require one or multiple tags.

## Components

Components are keyed plain data or object references.

Initial component keys:

```text
core.transform
core.metadata
gameplay.health
```

The framework does not put behavior inside components. Systems will read and
modify component data in later milestones.

## Registry queries

The registry supports:

```ts
entities.withTag('player');

entities.withComponent(
  EntityComponentKeys.transform,
);

entities.query(
  ['actor', 'player'],
  [EntityComponentKeys.transform],
);
```

Inactive entities are excluded by default from gameplay queries.

## Initial integration

The existing player is now registered as:

```text
ID: player
Tags:
  actor
  player
  controllable

Components:
  core.transform
  core.metadata
```

Movement, combat, party state, and input still use their existing code paths.
This is deliberate. The first milestone establishes identity and lookup before
systems are migrated.

## Validation probe

A disabled entity named:

```text
entity-validation-probe
```

is created at startup to validate:

- Authored IDs
- Disabled lifecycle state
- Tag queries
- Component queries

Startup throws if the foundation test fails.

## Developer display

A small status line appears at the lower-left corner:

```text
Entities 2 · Active 1 · Disabled 1
```

It refreshes twice per second and confirms the registry is alive.

## Frame integration

The registry now receives:

```ts
entities.beginFrame(frameNumber);
```

at the beginning of the game frame and:

```ts
entities.flushDestroyed();
```

at the end.

This establishes the lifecycle boundary that future systems will use.

## Intentional exclusions

This milestone does not yet:

- Replace the existing `Enemy` interface
- Convert projectiles into entities
- Convert effects into entities
- Add an event bus
- Add state machines
- Add serialization
- Add prefabs or archetype factories
- Add parent-child entity relationships
- Add system scheduling

Those changes should follow incrementally after the base registry is validated.

## Validation checklist

1. Start the game and confirm no startup error.
2. Confirm the lower-left display reads:
   `Entities 2 · Active 1 · Disabled 1`.
3. Confirm movement remains unchanged.
4. Confirm combat remains unchanged.
5. Confirm the movement validation course remains stable.
6. Open and close the developer console.
7. Restart and confirm IDs remain deterministic.
8. Confirm browser shutdown does not report disposal errors.

# Astral 0.5.4.2 — Entity Lifecycle & System Bridge

This milestone connects the existing enemy gameplay objects to the entity
framework without replacing or rewriting combat behavior.

## Goal

Prove that an existing gameplay system can adopt entity identity and lifecycle
incrementally.

The current enemy array remains the combat system's working data structure.
The entity registry now provides:

- Stable identity
- Tags and classification
- Transform lookup
- Health data exposure
- Enemy metadata
- Deferred destruction
- Centralized transform disposal
- Lifecycle diagnostics

## Enemy registration

Every spawned enemy now receives an entity ID and registry entry.

Standard enemy tags:

```text
actor
enemy
standard
entity-owned-transform
```

Elite enemy tags:

```text
actor
enemy
elite
entity-owned-transform
```

Each enemy entity receives:

```text
core.transform
core.metadata
gameplay.health
gameplay.enemy
```

The existing `Enemy` gameplay object stores its corresponding `entityId`.
This creates a bridge in both directions:

```text
Existing combat object -> entityId -> registry entity
Registry entity -> transform and gameplay metadata
```

## Shared health component

Enemy entities expose a `HealthComponent`:

```ts
interface HealthComponent {
  current: number;
  maximum: number;
}
```

The existing combat health values remain authoritative during this milestone.
Damage operations synchronize the shared component immediately.

This avoids changing combat calculations while allowing later systems and
debug tools to inspect health through the entity registry.

## Enemy component

A lightweight enemy component was added:

```ts
interface EnemyComponent {
  elite: boolean;
  spawnWave: number;
}
```

This gives future systems enough classification data without importing the
large temporary `Enemy` interface from `main.ts`.

## Lifecycle callbacks

`EntityRegistry` now supports subscriptions:

```ts
entities.onCreated(listener);
entities.onDestroyed(listener);
```

Both return unsubscribe functions.

Created callbacks run after registration.
Destroyed callbacks run during the deferred destruction flush, before tags and
components are cleared.

## Deferred enemy destruction

Enemy death now follows:

```text
Combat marks enemy dead
Existing enemy object leaves combat array
Entity enters destroy-pending
End-of-frame lifecycle flush runs
Destroyed callback disposes the owned transform
Registry removes the entity
```

This means gameplay systems may finish iterating the enemy collection without
having the registry or scene node disappear in the middle of the frame.

The developer `Kill All Enemies` action uses the same lifecycle path.

## Transform ownership

Only entities tagged:

```text
entity-owned-transform
```

have their transform disposed by the lifecycle bridge.

The player is registered but does not carry this tag, so registry cleanup does
not accidentally dispose player-owned scene structure during normal gameplay.

## Pause-safe lifecycle flush

Pending destruction is flushed even while:

- The developer console is open
- Inventory is open
- The game-over screen is active

This prevents destroy-pending entities from remaining indefinitely when the
normal gameplay frame exits early.

## Developer HUD

The Entity Framework panel now shows:

```text
ENTITY FRAMEWORK
Total      10
Active      9
Disabled    1
Pending     0
Enemies     8
Created    10
Destroyed   0
```

`Enemies` comes from a registry tag query rather than the existing enemy array.
It should track visible living enemies.

`Created` and `Destroyed` confirm that lifecycle callbacks are running.

## Intentional compatibility layer

This milestone intentionally retains:

- The existing `Enemy` interface
- The existing `enemies` array
- Existing AI loops
- Existing combat targeting
- Existing damage calculations
- Existing wave behavior

The bridge is additive. It demonstrates safe adoption before gameplay data is
moved fully into components.

## Modified files

```text
src/engine/entity/EntityComponents.ts
src/engine/entity/EntityRegistry.ts
src/engine/entity/index.ts
src/main.ts

# Astral 0.5.4.3 — Event Bus Foundation

This milestone adds a typed, queued event bus without replacing the existing
gameplay systems.

## Goal

Provide a deterministic communication layer for systems that should not call
each other directly.

```text
Producer
  emits a typed event

Event queue
  stores it until the frame boundary

Subscribers
  react without the producer knowing who is listening
```

## New engine files

```text
src/engine/events/
  EventBus.ts
  EventTypes.ts
  index.ts
```

## Typed event map

All supported events are declared in `EngineEventMap`.

Initial event types:

```text
entity.created
entity.destroyed
combat.enemyKilled
movement.playerLanded
world.triggerActivated
framework.validation
```

TypeScript links each event name to its required payload. A publisher cannot
emit a known event with the wrong payload shape without producing a compile
error.

## Queued dispatch

`emit()` does not immediately invoke subscribers.

Events are queued and dispatched by:

```ts
events.flush();
```

at the frame boundary.

This provides:

- Deterministic ordering through sequence numbers
- No recursive dispatch
- Safe subscription changes during handlers
- A clear place for future recording, replay, and diagnostics

Events emitted by a handler are deferred until the next flush rather than
recursively dispatched during the current flush.

## Frame integration

The entity registry and event bus receive the same frame number:

```ts
entities.beginFrame(entityFrame);
events.beginFrame(entityFrame);
```

At the end of the frame:

```text
Deferred entity destruction flushes
  ↓
Entity destroyed events are queued
  ↓
Event bus dispatches queued events
```

This allows destruction events generated by the lifecycle flush to be handled
in the same frame boundary.

The same infrastructure flush also runs while:

- The developer console is open
- Inventory is open
- The game-over screen is active

## Event subscriptions

Subscriptions return an unsubscribe callback:

```ts
const unsubscribe = events.subscribe(
  'world.triggerActivated',
  event => {
    console.log(event.payload.triggerId);
  },
);

unsubscribe();
```

The bus also supports `subscribeAll()` for future debugging, recording, and
analytics tools.

## Initial gameplay bridges

### Entity lifecycle

The existing entity registry callbacks now publish:

```text
entity.created
entity.destroyed
```

The registry remains responsible for lifecycle. The event bus only reports
what happened.

### Enemy death

`killEnemy()` now publishes:

```text
combat.enemyKilled
```

Payload:

```text
entityId
elite
wave
totalKills
```

Loot, wave progression, VFX, and existing combat behavior remain in their
current code paths.

### Player landing

The movement callback now publishes:

```text
movement.playerLanded
```

The landing-ring VFX subscribes to this event. This is the first existing
behavior moved from a direct callback action to an event consumer.

Payload:

```text
impactSpeed
supportHeight
```

### World triggers

Trigger volumes now publish:

```text
world.triggerActivated
```

The loot-feed message subscribes to that event instead of being called
directly from the world-volume loop.

## Error isolation

A failing subscriber does not stop other subscribers from running.

Handler errors are:

- Counted in event diagnostics
- Reported to the frame-level error callback
- Logged with the event type

## Developer HUD

The framework panel now displays both entity and event diagnostics:

```text
ENGINE FRAMEWORK
Entities
  Total
  Active
  Disabled
  Pending
  Enemies
  Created
  Destroyed
Events
  Queued
  Emitted
  Dispatched
  Handled
  Subscribers
  Errors
  Last
```

Expected stable values include:

- `Subscribers 2` after startup
- `Errors 0`
- `Last` changing as gameplay events occur

`Queued` may briefly increase during a frame and should return to zero after
the frame-boundary flush.

## Startup validation

A temporary `framework.validation` subscriber and event verify that:

- Subscription works
- Typed emission works
- Queued dispatch works
- Payload delivery works
- Unsubscription works

The temporary validation subscriber is removed and diagnostics are reset
before normal gameplay begins.

## Intentional exclusions

This milestone does not yet:

- Move loot generation into an event subscriber
- Move wave progression into an event subscriber
- Move HUD refreshes to events
- Add event priorities
- Add event cancellation
- Add event persistence or replay
- Add asynchronous events
- Add state machines
- Convert all direct system calls

The current bridges are intentionally small so event infrastructure can be
validated without changing gameplay outcomes.

## Validation checklist

1. Start the game and confirm no event validation error.
2. Confirm movement, combat, waves, and entity counts behave normally.
3. Jump and land; confirm the landing ring still appears.
4. Enter a trigger volume; confirm its feed message still appears.
5. Kill a standard enemy and confirm `Last` reaches
   `combat.enemyKilled` or `entity.destroyed`.
6. Kill an elite and confirm normal loot and wave behavior.
7. Use developer enemy spawning and Kill All Enemies.
8. Open the developer console while destruction is pending.
9. Confirm pending entities and queued events still flush.
10. Confirm event `Errors` remains zero.
11. Confirm `Queued` returns to zero at frame boundaries.
12. Retest the movement validation course for regressions.
Tested valid build:

# Astral 0.5.4.4 — State Machine Foundation

This milestone adds a generic deterministic state machine under the engine
layer and validates it with one isolated visual test. Existing player,
movement, combat, enemy, and world behavior remain unchanged.

## New engine package

```text
src/engine/state/
  State.ts
  StateMachine.ts
  StateTypes.ts
  index.ts
```

## Core model

A state machine owns:

- A stable machine ID
- A typed context object
- Registered states
- Current and previous state
- Time in the current state
- Deferred transition requests
- Transition and rejection diagnostics

Each state may define:

```text
canEnter
canExit
enter
update
exit
```

All callbacks are optional except the state ID.

## Deterministic transition behavior

Transitions requested during a state's `update` callback are queued until that
callback finishes.

```text
Current state update
        ↓
Transition requested
        ↓
Update completes
        ↓
Exit current state
        ↓
Enter next state
```

This prevents recursive state changes and guarantees that one state owns each
update tick.

Only one pending transition is retained during a tick. A later request in the
same update replaces an earlier request, keeping the result deterministic.

## Transition validation

A transition is rejected when:

- The destination state does not exist
- The machine is already in the requested state
- The current state's `canExit` returns false
- The destination state's `canEnter` returns false

Rejected transitions do not call `exit`, `enter`, or `changed` callbacks.

## State events

The existing event bus now includes:

```text
state.entered
state.exited
state.changed
state.transitionRejected
```

The validation machine publishes these events through normal queued event
dispatch. No state implementation depends directly on UI or debugging code.

## Validation machine

An isolated machine named:

```text
framework-validation
```

cycles between:

```text
waiting
   ↓
pulse
   ↓
waiting
```

A small cube near the initial player position visualizes the cycle:

- `waiting`: blue, normal scale
- `pulse`: magenta, expands and rotates

The machine changes state approximately every:

```text
waiting: 1.6 seconds
pulse:   0.7 seconds
```

This validates:

- State registration
- Initial state entry
- Update callbacks
- Deferred transition requests
- Exit callbacks
- Enter callbacks
- Context access
- Event publication
- Repeated cycling

The validation machine is intentionally independent from movement and combat.

## Framework HUD

The existing engine framework panel now includes:

```text
State Machine
  ID
  Current
  Previous
  Time
  Transitions
  Rejected
```

Expected normal behavior:

- `Current` alternates between `waiting` and `pulse`
- `Previous` shows the last state
- `Time` resets after each transition
- `Transitions` steadily increases
- `Rejected` remains `0`
- Event bus `Errors` remains `0`

## Intentional exclusions

This milestone does not yet:

- Convert player movement to states
- Convert enemy AI to states
- Convert elevators or platforms to states
- Add hierarchical states
- Add parallel state regions
- Add serialized state definitions
- Add a global state-machine registry
- Add automatic entity-to-machine ownership

Those should be introduced incrementally after the base machine is validated.

## Validation checklist

1. Start the game and confirm there is no startup error.
2. Find the small validation cube near the initial player location.
3. Confirm it alternates between blue waiting and magenta pulse behavior.
4. Confirm the framework HUD alternates between `waiting` and `pulse`.
5. Confirm `Time` resets after every transition.
6. Confirm `Transitions` increases continuously.
7. Confirm `Rejected` remains `0`.
8. Confirm event bus `Errors` remains `0`.
9. Confirm event queue returns to `0` after dispatch.
10. Confirm movement and collision remain unchanged.
11. Confirm combat, enemy death, and entity lifecycle remain unchanged.
12. Open the developer console and confirm the validation machine continues to
    cycle without affecting gameplay.

# Astral 0.5.4.5 — Elevator State-Machine Bridge

This milestone converts the movement-validation elevator into the first real
game-world consumer of the generic state-machine framework.

## Production state machine

The elevator now uses:

```text
bottom-idle
moving-up
top-idle
moving-down
```

The former sine-wave animation has been removed.

## Timing

```text
Bottom height:   0.4
Top height:      2.8
Idle duration:   1.2 seconds
Travel duration: 2.6 seconds
```

Movement uses a smooth-step curve so acceleration and deceleration remain
gentle while platform support continues to receive exact frame deltas.

## State responsibilities

### `bottom-idle`

- Holds the elevator at the bottom.
- Waits for the idle duration.
- Requests `moving-up`.

### `moving-up`

- Interpolates from bottom to top.
- Updates the visual mesh.
- Updates the traversal support height.
- Updates the dynamic collider.
- Publishes the platform frame delta.
- Requests `top-idle` when complete.

### `top-idle`

- Holds the elevator at the top.
- Waits for the idle duration.
- Requests `moving-down`.

### `moving-down`

- Interpolates from top to bottom.
- Updates all elevator geometry and support data.
- Requests `bottom-idle` when complete.

## Event integration

The elevator publishes the same generic events as the validation machine:

```text
state.entered
state.exited
state.changed
state.transitionRejected
```

The machine ID is:

```text
course-elevator
```

No elevator-specific event type was added.

## Developer HUD

The framework HUD now shows two state machines:

```text
State Machine · Validation
State Machine · Elevator
```

The elevator section displays:

- ID
- Current state
- Previous state
- Time in state
- Transition count
- Rejected transition count

## Architecture retained

The state machine controls elevator behavior, but the existing movement
architecture remains unchanged:

```text
Elevator state
    ↓
Elevator height and frame delta
    ↓
Dynamic collision and traversal support
    ↓
Player inherits platform movement
```

The player movement controller does not know that the elevator uses a state
machine.

## Files modified

```text
src/game/world/OutdoorZoneBuilder.ts
src/game/world/WorldTypes.ts
src/main.ts
README.md
```

No movement, collision, support, combat, entity, or core state-machine files
were changed.

# Astral 0.5.4.6 — Standard Enemy State Validation

This milestone migrates standard enemies to the generic state-machine
framework while deliberately leaving elite enemies on the original behavior
path for comparison.

## Standard enemy states

```text
idle
chase
attack-windup
recover
dead
```

## Behavior flow

### `idle`

- Evaluates the player distance.
- Requests `attack-windup` when the player is already in range and the attack
  cooldown is ready.
- Otherwise requests `chase`.

### `chase`

- Moves toward the player using the existing enemy speed.
- Retains the existing frost slow multiplier.
- Does not move while an attack telegraph owns the enemy.
- Requests `attack-windup` when range and cooldown conditions are met.
- Requests `dead` if health reaches zero.

### `attack-windup`

- Starts the existing standard-enemy telegraph.
- Uses the existing attack range, damage, and hit protection.
- Requests `recover` when the telegraphed strike resolves.
- Cancels the telegraph when transitioning to `dead`.

### `recover`

- Holds for `0.35` seconds after an attack.
- Requests `chase` when recovery completes.
- Existing attack cooldown timing remains unchanged.

### `dead`

- Cancels any active telegraph.
- Existing `killEnemy()` logic still owns loot, kill count, wave progression,
  entity destruction, and VFX.

## Elite comparison path

Elite enemies remain on the pre-state-machine behavior loop.

This provides a direct validation comparison:

```text
Standard enemies → generic state machine
Elite enemies    → legacy branch
```

No elite tuning or combat values were changed.

## Event integration

Every standard enemy machine emits the existing generic events:

```text
state.entered
state.exited
state.changed
state.transitionRejected
```

Machine IDs use the enemy entity ID:

```text
enemy-entity-#
```

## Developer diagnostics

The framework HUD now includes:

```text
State Machine · Standard Enemies
  Machines
  Idle
  Chase
  Windup
  Recover
  Dead
  Rejected
  Elites      legacy behavior
```

The counts provide a live view of the current standard-enemy state
distribution.

## Retained systems

The migration does not change:

- Enemy entity registration
- Enemy health component synchronization
- Combat damage
- Attack telegraphs
- Attack range
- Attack cooldowns
- Frost slow behavior
- Knockback
- Loot
- Wave progression
- Elite AI
- Player movement
- Collision
- Elevator state machine

## Files modified

```text
src/main.ts
src/game/world/OutdoorZoneBuilder.ts
src/game/world/WorldTypes.ts
README.md

# Astral 0.5.5.1 — Asset Registry Foundation

This milestone begins the data and resource phase with a central typed registry
for reusable engine assets.

## New engine package

```text
src/engine/assets/
  AssetRecord.ts
  AssetRegistry.ts
  AssetTypes.ts
  index.ts
```

## Supported asset kinds

```text
mesh
material
texture
audio
prefab
data
other
```

The registry is Babylon-agnostic. It can store Babylon resources, plain data,
factories, or future engine-specific asset descriptors.

## Asset identity

Every asset uses a stable string ID:

```ts
assets.register(
  {
    id: 'material:enemy-standard',
    kind: 'material',
  },
  material,
);
```

Duplicate or empty IDs fail immediately.

## Asset lifecycle

Supported states:

```text
registered
loading
ready
failed
disposed
```

Assets may be registered with an existing value or with a synchronous or
asynchronous loader.

```ts
assets.registerLoader(
  {
    id: 'texture:hero-icon',
    kind: 'texture',
    source: '/assets/ui/hero.png',
  },
  async () => loadTexture(),
);
```

Calling `load()` more than once while an asset is loading returns the same
promise.

## Retrieval

The registry supports:

```ts
assets.get(id);
assets.require(id);
assets.load(id);
assets.acquire(id);
assets.release(id);
```

`require()` throws when an asset is missing or not ready.

## Reference tracking

`acquire()` increments the asset reference count.

`release()` decrements it without allowing the count to become negative.

Future streaming and scene-unload systems can use:

```ts
assets.disposeUnused();
```

Persistent assets are excluded from unused disposal.

## Disposal

A record may provide an asset-specific disposer:

```ts
assets.register(
  descriptor,
  material,
  value => value.dispose(),
);
```

Assets with active references cannot be disposed unless forced.

The full registry is disposed during application shutdown.

## Tags and queries

Descriptors support tags:

```ts
tags: ['runtime', 'shared']
```

The registry provides:

```ts
assets.all();
assets.all('material');
assets.withTag('shared');
```

## Validation

The registry validates:

- Empty IDs
- Failed asset loads

Startup creates and reads:

```text
data:asset-registry-validation
```

The game throws immediately if the registry cannot retrieve that asset or if
validation returns an error.

## Material bridge

The previous standalone material `Map` has been removed.

The existing `mat()` helper now uses the asset registry:

```text
mat(...)
  ↓
material:<generated-key>
  ↓
AssetRegistry
```

This preserves every current call site while making shared runtime materials
visible to the central asset system.

Gameplay mesh creation, textures, audio, and prefabs are intentionally not
migrated yet.

## Developer diagnostics

The framework HUD now includes:

```text
Assets
  Total
  Ready
  Loading
  Failed
  References
  Materials
  Data
  Validation
```

Expected startup values vary because materials are created as the scene is
built, but:

```text
Failed      0
Validation  0
```

should remain constant.

## Files added

```text
src/engine/assets/AssetRecord.ts
src/engine/assets/AssetRegistry.ts
src/engine/assets/AssetTypes.ts
src/engine/assets/index.ts
```

## Files modified

```text
src/main.ts
README.md
```

No movement, collision, world, entity, event, state-machine, or combat files
were changed.

## Validation checklist

1. Start the game with no startup exception.
2. Confirm the movement course remains functional.
3. Confirm enemies and elites retain their existing behavior.
4. Confirm the elevator and validation cube continue operating.
5. Confirm materials display correctly.
6. Confirm repeated use of the same `mat()` parameters reuses one material.
7. Confirm the HUD asset count increases as runtime materials are created.
8. Confirm `Failed` remains `0`.
9. Confirm `Validation` remains `0`.
10. Confirm event-bus `Errors` remains `0`.
11. Reload the page and confirm shutdown does not report disposal errors.

# Astral 0.5.5.2 — Definition Registry Foundation

This milestone adds a typed, read-only registry for gameplay definitions and migrates the existing playable character data into it without changing gameplay behavior.

## New engine package

```text
src/engine/definitions/
  DefinitionRegistry.ts
  DefinitionTypes.ts
  index.ts
```

## New gameplay definition package

```text
src/game/definitions/
  CharacterDefinitions.ts
  index.ts
```

## Definition contract

Every definition now has:

```text
id
kind
metadata.schemaVersion
metadata.contentVersion
metadata.source
metadata.tags
metadata.deprecated
```

The registry rejects:

- Empty IDs
- Duplicate IDs
- Empty kinds
- Unregistered kinds
- Missing content versions
- Invalid schema versions
- Definition-specific validation failures

## Registry API

```ts
definitions.registerKind(...);
definitions.register(...);
definitions.registerMany(...);
definitions.get(id);
definitions.require(id);
definitions.all(kind);
definitions.withTag(tag);
definitions.validate();
definitions.stats();
```

Definitions are shallow-frozen when registered. Metadata and tag arrays are also frozen so gameplay systems receive read-only configuration rather than mutable runtime state.

## Character definition bridge

The previous hardcoded character array in `main.ts` has moved to:

```text
src/game/definitions/CharacterDefinitions.ts
```

Registered definitions:

```text
vanguard
warden
tempest
```

The party is now created from:

```ts
const defs = definitions.all<CharacterDefinition>('character');
```

All existing character values are unchanged:

- Names and roles
- Elements and colors
- Health
- Movement speed
- Attack damage
- Attack range
- Attack cooldown
- Q and E ability names
- Preferred equipment family

Runtime state such as current health, cooldowns, equipment, and skill-slot assignment is still created separately. Definitions remain configuration only.

## Character validation

Character definitions validate:

- Non-empty name and role
- Positive maximum health
- Positive movement speed
- Non-negative attack damage
- Positive attack range
- Positive attack cooldown
- Non-empty Q and E ability names

The character definition schema is currently:

```text
character schema version 1
content version 0.5.5.2
```

## Developer diagnostics

The framework HUD now includes:

```text
Definitions
  Total
  Kinds
  Characters
  Deprecated
  Validation
```

Expected initial values:

```text
Total       3
Kinds       1
Characters  3
Deprecated  0
Validation  0
```

## Existing systems retained

This milestone does not alter:

- Player behavior
- Character balance
- Movement or collision
- Combat
- Enemy state machines
- Elevator state machine
- Entity lifecycle
- Event bus
- Asset registry behavior
- UI behavior
- Loot or equipment behavior

## Files added

```text
src/engine/definitions/DefinitionRegistry.ts
src/engine/definitions/DefinitionTypes.ts
src/engine/definitions/index.ts
src/game/definitions/CharacterDefinitions.ts
src/game/definitions/index.ts
```

## Files modified

```text
src/main.ts
README.md
```

# Astral 0.5.6.1 — Developer HUD and UI Manager Foundation

This milestone begins the player-experience phase by separating developer diagnostics from the gameplay HUD and creating the UI structure needed for upcoming HUD, controls, menus, and quality-of-life work.

## Browser-safe toggle

Press:

```text
U
```

to open or close the engine diagnostics panel.

The existing developer control console remains on `P`. The two tools now have separate purposes:

```text
U  Engine diagnostics
P  Developer controls
```

## Compact engine status

The former full-height diagnostics column has been removed from the always-visible layout.

A compact status control now remains in the lower-right corner and reports:

```text
ENGINE
FPS
HEALTHY / ISSUE COUNT
```

Green indicates that the tracked validation values are clear. The control turns red when event errors, asset failures, definition errors, or rejected state transitions are present.

Clicking the compact control also opens the full diagnostics panel.

## Tabbed diagnostics

The full panel is scrollable and contains focused pages:

```text
Overview
Entities
Events
Resources
State Machines
Movement
```

Only one page is displayed at a time, preventing the panel from continuously growing as new engine systems are added.

### Overview

The overview reports the high-value health checks:

```text
FPS
Entities
Enemies
Event errors
Asset failures
Definition errors
Rejected transitions
```

### Entities

Contains entity counts, lifecycle state, enemy registration, and created/destroyed totals.

### Events

Contains queue, emission, dispatch, handler, subscriber, error, and last-event diagnostics.

### Resources

Combines the current asset and definition registry diagnostics.

### State Machines

Contains the validation cube, elevator, and standard-enemy state-machine diagnostics.

### Movement

The existing movement debug overlay now renders inside the Movement page rather than occupying a separate always-visible card.

## UI Manager foundation

New structure:

```text
src/ui/core/UIManager.ts
src/ui/UIManager.css
src/ui/developer/DeveloperHud.ts
src/ui/developer/DeveloperHud.css
```

`UIManager` establishes independent layers for:

```text
gameplay
notifications
menus
developer
```

Only the developer layer is migrated in this milestone. The remaining layers are intentionally present so the next builds can move the gameplay HUD, notifications, pause menu, settings, and controls into the same managed structure without replacing the foundation.

## Input changes

The input framework now includes:

```text
toggleDeveloperHud
```

with the default binding:

```text
KeyU
```

No function keys are used.

## Preserved behavior

This build does not change:

- Movement or collision
- Camera behavior
- Combat values
- Enemy AI
- State-machine behavior
- Entity lifecycle
- Event processing
- Assets or definitions
- Party and inventory behavior
- Ability bindings
- Developer control-console behavior

## Files added

```text
src/ui/core/UIManager.ts
src/ui/UIManager.css
src/ui/developer/DeveloperHud.ts
src/ui/developer/DeveloperHud.css
```
## Files modified
```text
src/main.ts
src/engine/input/InputBindings.ts
src/engine/input/InputTypes.ts
README.md
```

# Astral 0.5.6.2 — Gameplay UI & Presentation Framework

This milestone combines the gameplay HUD cleanup with the UI architecture
work that had previously been planned as 0.5.6.6.

The validated gameplay systems remain unchanged. The work is focused on
presentation ownership, reusable UI modules, responsive layout, and the first
UI event bridge.

## New UI architecture

```text
src/ui/
  core/
    UIManager.ts
  developer/
    DeveloperHud.ts
  gameplay/
    AbilityBar.ts
    BossBar.ts
    CharacterFrame.ts
    GameplayHud.ts
    GameplayHud.css
    GameplayHudTypes.ts
    NotificationFeed.ts
    PartyHud.ts
    WaveHud.ts
    index.ts
  shared/
    UITheme.ts
```

`UIManager` continues to own the four presentation layers:

```text
gameplay
notifications
menus
developer
```

The new `GameplayHud` coordinates the gameplay components without owning
combat, movement, inventory, entity, or character logic.

## Gameplay HUD ownership

The following direct DOM responsibilities were removed from `main.ts`:

- Party-card construction
- Health-bar construction
- Ability-slot construction
- Cooldown-number construction
- Wave, kill, and power DOM updates
- Boss-bar visibility and width updates
- Notification-line creation and removal
- Game-over panel updates

`main.ts` now produces a typed `GameplayHudSnapshot` and passes it to:

```text
GameplayHud
  PartyHud
    CharacterFrame
  AbilityBar
  WaveHud
  BossBar
```

## Party HUD

The party panel now provides:

- Dedicated character frames
- Stronger active-character emphasis
- Current and maximum HP values
- Smooth health-bar updates
- Character-specific accent colors
- Defeated-character presentation
- Responsive width and spacing

The party panel remains in the upper-right but no longer shares that space
with the developer framework panel.

## Ability bar

The ability bar is now a standalone component and owns:

- Current binding labels
- Assigned and unassigned states
- Cooldown values
- Cooldown progress overlays
- Ability names
- Responsive compact behavior

The existing bindings remain unchanged:

```text
RMB    Basic attack
1–4    Assigned ability slots
R      Dodge
Space  Jump
```

Cooldown maximums are presentation metadata only. Ability behavior and timing
are still owned by gameplay.

## Wave and boss presentation

A new compact upper-left panel displays:

```text
Wave
Kills
Power
```

Elite health is displayed through the dedicated `BossBar` component. The
legacy boss DOM is no longer updated by gameplay code.

## Notification event bridge

The engine event map now includes:

```text
ui.notification
```

The existing `feed()` helper publishes a typed UI event instead of creating
DOM elements directly:

```text
Gameplay code
  EventBus
    ui.notification
      GameplayHud
        NotificationFeed
```

Notifications support semantic presentation tones:

```text
neutral
success
warning
danger
loot
```

This is the first production UI event bridge. Additional UI events should be
added only when a real consumer needs them.

## Theme foundation

`UITheme.ts` provides centralized semantic values for:

- Panels
- Borders
- Text
- Muted text
- Accent
- Success
- Warning
- Danger
- Cooldown
- Item rarity colors
- Shared radii and spacing

`GameplayHud` applies the theme to CSS custom properties so later theme and
accessibility settings can update the presentation layer without changing
gameplay code.

## Game-over presentation

The game-over view is now created and owned by `GameplayHud`.

The existing run result and page-reload behavior remain unchanged.

## Legacy compatibility

The previous HTML HUD elements are hidden when `GameplayHud` initializes.
This allows the build to work with the current repository HTML while removing
runtime ownership from those elements.

The inventory screen remains on the existing `PartyManagementScreen` path and
will be migrated with the menu/settings work.

## Developer controls

The 0.5.6.1 developer UI remains unchanged:

```text
U  Toggle engine diagnostics
P  Toggle developer controls
```

No function keys are used.

## Files added

```text
src/ui/gameplay/AbilityBar.ts
src/ui/gameplay/BossBar.ts
src/ui/gameplay/CharacterFrame.ts
src/ui/gameplay/GameplayHud.ts
src/ui/gameplay/GameplayHud.css
src/ui/gameplay/GameplayHudTypes.ts
src/ui/gameplay/NotificationFeed.ts
src/ui/gameplay/PartyHud.ts
src/ui/gameplay/WaveHud.ts
src/ui/gameplay/index.ts
src/ui/shared/UITheme.ts
```

## Files modified

```text
src/main.ts
src/engine/events/EventTypes.ts
README.md
```
# Astral 0.5.6.3 — Player Input & Configuration Framework

This milestone replaces device-specific gameplay checks with a unified player
input layer supporting keyboard, mouse, and standard browser gamepads.

## Core architecture

```text
Keyboard + Mouse ─┐
                  ├─> InputManager ─> Input Actions ─> Gameplay
Gamepad ──────────┘
```

Gameplay continues to consume actions such as `ability1`, `dodge`, and
`primaryAttack`; it does not need to know which device produced them.

## New and expanded engine modules

```text
src/engine/input/
  InputBindings.ts
  InputManager.ts
  InputTypes.ts
  index.ts

src/engine/settings/
  SettingsManager.ts
  SettingsTypes.ts
  index.ts

src/ui/menus/
  SettingsMenu.ts
  SettingsMenu.css
  index.ts
```

## Input contexts

The player input system now tracks:

```text
gameplay
inventory
settings
developer
```

Gameplay actions are suppressed outside the gameplay context. Switching
contexts clears held movement and pointer input to prevent stuck actions.

## Movement control schemes

The settings menu supports:

```text
Hybrid: WASD + click-to-move
Click-to-move
Screen-relative WASD
Mouse-relative WASD
```

Mouse-relative WASD uses the cursor direction as forward:

```text
W  move toward cursor
S  move away from cursor
A  strafe left
D  strafe right
```

Controller movement remains analog and screen-relative through the left stick.
Controller aiming uses the right stick.

## Default controller mapping

The implementation uses the standard Gamepad API layout:

```text
Left Stick    Move
Right Stick   Aim
RT / R2       Primary attack
X / Square    Ability 1
Y / Triangle  Ability 2
B / Circle    Ability 3
Left Stick    Ability 4
A / Cross     Dodge
Right Stick   Jump
LB / L1       Previous character
RB / R1       Next character
View          Inventory
Menu          Settings
```

Controller hot-plug and disconnect are supported. The active input device
changes automatically when keyboard, mouse, or controller activity is detected.

## Dynamic HUD prompts

The gameplay HUD no longer hardcodes `RMB`, `1`, `2`, `3`, `4`, `R`, and
`Space`. It asks the input manager for the active binding label.

When the active device changes, the HUD displays the matching keyboard/mouse or
controller prompts on the next HUD refresh.

## Gamepad tuning

The settings menu includes:

```text
Stick deadzone
Aim sensitivity
Trigger threshold
```

Stick values use a radial deadzone rather than independent axis clipping.

## Player settings persistence

Settings are saved to local storage under:

```text
astral.player-settings.v1
```

Persisted values include:

- Movement control scheme
- Click-to-attack preference
- Face-aim-direction preference
- Controller deadzone
- Controller trigger threshold
- Controller aim sensitivity
- UI scale
- Damage-number preference
- Screen-shake preference
- Telegraph intensity
- Notification duration

Restricted or private browser contexts gracefully fall back to in-memory
defaults if local storage is unavailable.

## Settings menu

Press:

```text
Esc       Keyboard
Menu      Controller
```

The settings screen provides movement, controller, and accessibility controls.
It also shows whether a controller is connected and which input device is
currently active.

## Browser input recovery

The input manager clears held actions when:

- The browser window loses focus
- The document becomes hidden
- The active input context changes
- A controller disconnects

This prevents stuck WASD, pointer movement, and gamepad actions after Alt+Tab or
focus loss.

## Developer diagnostics

The Resources diagnostic page now includes:

```text
PLAYER INPUT
Context
Device
Controller
Movement
Move axes
Aim axes
```

## Existing behavior retained

This milestone does not change:

- Collision resolution
- Support ownership
- Jump or dodge physics
- Combat damage and cooldown values
- Enemy behavior
- State machines
- Assets or definitions
- Loot and wave progression

The movement controller still owns movement resolution. The new input layer only
provides requested movement and aim data.

# Astral 0.5.7 — Advanced State Machine Framework

This milestone completes the planned state-machine work before the definition-driven ability framework.

## Added capabilities

### Timed states

States may declare a duration and automatic timeout transition:

```ts
{
  id: 'recover',
  duration: context => context.recoverDuration,
  timeout: {
    to: 'chase',
    reason: 'recovery-complete',
  },
}
```

The machine exposes:

```ts
machine.getStateTimer();
```

which returns elapsed time, duration, remaining time, normalized progress, and completion state.

### Interaction-driven transitions

Active states may declare interactions:

```ts
{
  id: 'casting',
  interactions: [
    {
      type: 'interrupted',
      to: 'recover',
    },
  ],
}
```

Callers deliver them through:

```ts
machine.interact('interrupted', payload);
```

Only the current state handles the interaction.

### Typed blackboard

Every machine owns a typed shared blackboard:

```ts
machine.blackboard.get('target');
machine.blackboard.set('target', nextTarget);
machine.blackboard.patch({ chargeTime: 0 });
```

The blackboard tracks revisions for diagnostics. Persistent gameplay data should remain in components or the machine context; the blackboard is intended for behavior coordination between states.

### Transition guards

Machines may register transition-specific guards:

```ts
machine.addTransitionGuard({
  id: 'requires-resource',
  from: 'ready',
  to: 'casting',
  check: context => context.resource >= context.cost,
});
```

Rejected guard transitions report `rejectedBy: 'guard'` and the guard ID.

### Lifecycle callbacks

New callbacks:

```text
onTimerCompleted
onInteraction
```
# Astral 0.6.0 — Gameplay Ability Framework

This milestone begins Phase 2 by adding a definition-driven gameplay ability
system that uses the existing definition registry, advanced state machine,
blackboard, event bus, input actions, and gameplay HUD.

## Ability framework

New modules:

```text
src/game/abilities/
  AbilityComponent.ts
  AbilityRuntime.ts
  AbilityTypes.ts
  index.ts

src/game/definitions/abilities/
  AbilityDefinitions.ts
  index.ts
```

Each runtime follows:

```text
ready
  ↓
casting
  ↓
executing
  ↓
cooldown
  ↓
ready
```

Instant abilities skip `casting` and enter `executing` directly.

## Blackboard

Each ability machine owns a typed blackboard containing:

```text
castSequence
request
interruptReason
```

The cast request stores the caster ID, caster position, aim position, and aim
direction. This data remains stable through casting and execution.

## Ability definitions

Definitions include:

- Stable ID
- Name and description
- Executor ID
- Targeting mode
- Cast style
- Resource model
- Element
- Semantic tags
- Cooldown
- Cast and execution times
- Range
- Damage and duration values
- Future icon asset ID

## Validation abilities

### Fireball

- Directional cast
- Cast time
- Fire projectile
- Damage and fire status
- Projectile and damage tags

### Blink

- Ground targeting
- Instant execution
- Uses the validated collision-safe blink path
- Movement and mobility tags

### Astral Shield

- Self targeting
- Restores health
- Grants four seconds of 50% incoming-damage reduction
- Defensive and buff tags

### Ice Spear

- Directional cast
- Faster piercing projectile
- Frost damage and frost status
- Ice, projectile, crowd-control, and status tags

## Validation loadouts

All three party members receive the four validation abilities in different slot
orders. This exercises dynamic HUD names, prompts, cooldowns, and four ability
input actions without requiring a character-definition migration yet.

## Events

New events:

```text
ability.castStarted
ability.executed
ability.cooldownStarted
ability.ready
ability.interrupted
```

Ability machines also publish the existing generic state entered, exited, and
changed events.

## HUD bridge

The ability bar now reads directly from ability runtime snapshots:

- Ability name
- Current state
- Cooldown remaining
- Cooldown maximum
- Cast progress
- Semantic tags
- Current keyboard or controller prompt

Casting uses the existing progress overlay. Cooldown rendering remains
unchanged.

## Developer support

Reset Cooldowns now resets both legacy movement/basic-attack cooldowns and all
ability state machines.

The existing no-cooldowns developer option continually returns ability
runtimes to `ready`.

## Intentional limits

This first vertical slice does not yet add:

- Mana or stamina costs
- Charges
- Channels or charged casts
- Ability interruption from damage
- Ability icons or audio assets
- Generalized status-effect components
- Enemy ability users
- AI ability selection

The definition vocabulary includes the future cast and resource types so these
can be added without replacing the foundation.

## Validation checklist

1. Confirm definition validation remains zero.
2. Cast all four slots using keyboard controls.
3. Confirm controller prompts remain available when a controller is connected.
4. Confirm Fireball and Ice Spear travel toward mouse or right-stick aim.
5. Confirm Fireball damages enemies.
6. Confirm Ice Spear applies frost and can pierce one enemy.
7. Confirm Blink stops at the last safe collision position.
8. Confirm Astral Shield restores health and reduces incoming damage for four seconds.
9. Confirm cast progress appears for Fireball and Ice Spear.
10. Confirm cooldown numbers and overlays update from ability state timers.
11. Confirm abilities cannot be recast during casting, execution, or cooldown.
12. Confirm Reset Cooldowns returns all abilities to ready.
13. Confirm event-bus errors and state-machine rejections remain zero.
14. Confirm movement, inventory, settings, enemies, elevator, and character swapping remain functional.

# Astral 0.6.0.1 — Ability Runtime Polish & Gameplay Developer Toolkit

This milestone makes cast time visible and authoritative, adds one-slot ability
queueing, and introduces an ability-focused developer toolkit.

## Runtime corrections

Ability execution is owned by the state machine:

```text
ready -> casting -> executing -> cooldown -> ready
```

The executor runs only when `executing` is entered.

Validation timings:

```text
Fireball       0.50 s cast / 8.0 s cooldown
Ice Spear      0.30 s cast / 6.0 s cooldown
Astral Shield  0.20 s cast / 12.0 s cooldown
Blink          instant / 6.0 s cooldown
```

## Ability queue

Each character has one queued ability slot.

Pressing another ability while one is casting or executing replaces the queued
request. When the active execution finishes, the queued request begins if its
runtime is ready.

## Gameplay HUD

A cast bar appears above the ability bar with:

- Ability name
- Remaining cast time
- Cast progress

Ability icons continue to show state and cooldown overlays.

## Developer HUD — Abilities

The new Abilities page shows:

- Runtime state
- Cast elapsed, remaining, maximum, and progress
- Cooldown remaining
- Blackboard cast sequence
- Caster ID
- Aim position
- Aim direction
- Interrupt reason
- Ability tags
- Queued ability
- Recent ability event stream

Controls:

- Reset cooldowns
- Interrupt cast
- Finish cast
- Reset ability states
- Toggle no cooldowns
- Freeze cast timer
- Apply burn to nearest enemy
- Apply frost to nearest enemy
- Apply shock to nearest enemy
- Clear nearest-enemy statuses

Reserved developer pages were added for AI, Status, Loot, Bosses, and Quests.
# Astral 0.6.0.2 — Ability Commitment & Combat Feel

This milestone completes the player-side cast interruption and action queue rules before enemy archetypes are introduced.

## Cast commitment

Cast-time abilities declare a commitment threshold. The current validation abilities use 95%.

```text
0%–94.9%
  A movement, jump, dodge, swap, or ability request interrupts the cast.
  The requested action begins immediately.

95%–100%
  The cast is committed and will execute.
  One requested action is stored and begins immediately afterward.
```

Blink is instant and therefore begins in execution without a visible cast window.

## Per-ability cast rules

Definitions now declare:

```ts
canMoveWhileCasting
canRotateWhileCasting
commitThreshold
queueBehavior
interruptPriority
```

Current validation settings:

| Ability | Move while casting | Rotate while casting | Commit |
|---|---:|---:|---:|
| Fireball | No | Yes | 95% |
| Ice Spear | No | Yes | 95% |
| Astral Shield | Yes | Yes | 95% |
| Blink | Instant | Yes | 0% |

## Generalized action queue

A character owns one queued action. Supported action types are:

```text
ability
movement
jump
dodge
swap
```

The default `replace` behavior means the newest late-cast action replaces the prior queued action. Future definitions may use `preserve` or `reject`.

## Movement behavior

Stationary casts stop movement until interrupted or completed. Mobile casts, such as Astral Shield, allow movement without cancelling the cast.

Aim-facing is independently controlled by `canRotateWhileCasting`.

## Events

```text
ability.commitReached
ability.queued
ability.queueConsumed
ability.interrupted
```

## Developer inspection

The Abilities page now shows:

- Cast progress
- Commit threshold
- Whether commitment has been reached
- Move-while-casting setting
- Rotate-while-casting setting
- Queued action
- Ability event history

# Astral 0.6.0.3 — Combat Library

This milestone creates the reusable combat vocabulary used by future enemy,
elite, and boss definitions.

## Relationship model

```text
Enemy Definition (0.6.1)
  -> AI Ability Usage IDs
    -> Ability Definition IDs
      -> Projectile / Status / Telegraph / Damage Profile IDs
```

Enemy records will reference combat-library definitions instead of copying
power, speed, range, cast time, cooldown, or telegraph values.

## Definition kinds

```text
ability
projectile
status-effect
telegraph
damage-profile
combat-tag
ai-ability-usage
```

All kinds are registered through the existing `DefinitionRegistry` and are
read-only after registration.

## Ability catalog

The catalog now contains the four implemented player abilities plus reusable
enemy-ready abilities covering:

- Melee strike, cleave, heavy slam, and spin attack
- Arrow, fire, frost, homing, piercing, and spread projectiles
- Ground fire, frost nova, shock burst, and poison cloud
- Dash, charge, retreat, leap, and blink movement patterns
- Barrier, heal, regeneration, and Astral Shield defense patterns

Catalog-only abilities are data definitions. They do not execute until their
focused executor is added during enemy-archetype work.

## Shared power and speed language

```text
power
  Base damage, healing, shielding, or effect strength.

speed
  Projectile travel speed or movement propagation speed.
```

Values that do not apply remain undefined and display as an em dash in the
catalog.

## AI usage records

AI usage definitions reference abilities and add actor-specific selection
rules:

```text
weight
minimum / maximum / preferred range
health window
initial delay
cooldown multiplier
power multiplier
line-of-sight requirement
commitment threshold
```

This supports multiple enemies using the same ability with different tactical
weights and scaling, without duplicating the ability itself.

The initial AI usage set prepares:

- Grunt strike and cleave
- Brute slam and charge
- Archer arrow, piercing shot, and retreat
- Fire mage bolt and ground fire
- Frost mage bolt and frost nova

Standard enemy commitment values are intentionally earlier than the player's
95% threshold, supporting the combat principle documented in `GameDesign.md`:
enemies should commit to readable attacks rather than repeatedly canceling
when the player moves.

## Searchable developer catalog

The Developer HUD now contains a **Combat Library** page.

It supports:

- Text search
- Definition-kind filtering
- Combat-tag filtering
- Sortable, compact power/speed/range/cast/cooldown presentation
- Detailed reference inspection
- Ability-to-AI-usage reverse lookup
- Runtime-ready versus catalog-only visibility

Click a row to inspect its complete definition and references.

## Cross-reference validation

Startup validation checks:

- Ability projectile IDs
- Ability status-effect IDs
- Ability telegraph IDs
- Ability damage-profile IDs
- Ability combat tags
- AI usage ability IDs

Missing references stop startup. Catalog-only abilities are reported as
warnings rather than errors because they intentionally await executors.

## Existing gameplay

The four current player abilities remain assigned and executable:

```text
Fireball
Blink
Astral Shield
Ice Spear
```

No player movement, cast commitment, queueing, cooldown, or combat values were
changed by this milestone.

# Astral 0.6.1 — Enemy Archetypes

This milestone turns the Combat Library into definition-driven enemies.

## Validation passes

### Pass 1 — Combat roles

- Grunt
- Brute
- Archer
- Fire Mage
- Frost Caster
- Assassin

Each role owns stats, preferred range, recovery timing, and references to shared AI ability-usage definitions.

### Pass 2 — Reusable variants

- Goblin
- Skeleton
- Bandit
- Astral

Variants apply HP, movement-speed, and damage multipliers without duplicating AI or abilities.

### Pass 3 — Elite modifiers

- Frozen
- Burning
- Fast
- Heavy
- Arcane
- Shielded

Elite modifiers layer additional multipliers and presentation changes over any role and variant.

## Enemy decision flow

```text
Evaluate
  → select a valid weighted ability
  → Reposition when no ability is valid
  → Casting
  → Recover
  → Evaluate
```

Enemy blackboards track:

- target
- target distance
- last seen position
- desired range
- selected ability and usage record
- commitment
- home position
- decision count

## Ability selection

Enemy definitions reference `ai-ability-usage` records. The AI filters by:

- range
- health percentage
- cooldown
- line-of-sight-ready metadata

It then applies role-aware weighting:

- primary abilities receive a modest preference
- escape abilities become strongly preferred when the target is too close
- defensive abilities become preferred at low health

The shared ability definition remains the source of power, range, cast timing, cooldown, projectile, telegraph, status, and tags.

## Anti-bait behavior

Once an enemy begins a telegraphed cast, normal range changes do not reset it. Standard and elite enemies finish the selected action, supporting the combat rule documented in `GameDesign.md`:

> Players should beat mechanics, not AI indecision.

Ranged enemy usage records extend slightly beyond comparable player ranges, reducing repeated edge-of-range cast baiting.

## Developer HUD

The AI page now shows:

- live counts by archetype
- elite, variant, and modifier totals
- live inspection of an active enemy
- role and behavior policy
- current state
- health
- current and desired range
- selected ability
- commitment state
- decision count

## Files added

```text
src/game/definitions/EnemyDefinitions.ts
```

## Files modified

```text
src/game/definitions/index.ts
src/main.ts
README.md
CHANGELOG.md
FILES_CHANGED.md
MIGRATION.md
```
# Astral 0.6.1.1 — Tactical Positioning

This patch corrects the tactical layer found during the first Enemy Archetype validation.

## Ability-first decisions

Enemies now select a ready combat ability before deciding whether movement is necessary.

```text
Evaluate
  -> Select ability
  -> Already in its range band?
      Yes: Cast
      No: Position for that ability
```

Movement no longer occurs without a selected tactical purpose.

## Range-band behavior

Each selected AI usage supplies:

- Minimum range
- Preferred range
- Maximum range

The movement policy is:

```text
Distance > maximum  -> advance
Inside range band   -> hold and cast
Distance < minimum  -> retreat
```

Ranged enemies therefore stop moving as soon as Arrow Shot, Fire Bolt, Ice Bolt, or another selected attack becomes valid.

## Visible ranged attacks

Enemy abilities that reference a projectile definition now spawn a visible hostile projectile using the Combat Library's projectile speed, radius, lifetime, and pierce values.

Player and enemy projectiles share one runtime collection but have explicit ownership:

```text
player projectile -> checks enemy collision
enemy projectile  -> checks player collision
```

## Blackboard additions

Enemy machines now track:

```text
minimumRange
maximumRange
canCast
castReason
positioningIntent
```

The selected ability and AI usage remain locked while the enemy positions for the cast.

## AI inspector

The live inspector now displays:

```text
Distance
Range band
Preferred range
Selected ability
Can cast
Positioning intent
Reason
Committed state
```

Typical output:

```text
Ability      ability.fire-bolt
Band         5.0 - 24.0
Can Cast     yes
Position     hold
Reason       in selected ability range
```
# Astral 0.6.1.2 — Enemy Combat Polish & Starter World Enemy Set

This mini-update closes the first enemy-archetype validation gaps and prepares the initial world enemy roster.

## Engagement fixes

Archer and assassin decisions now use explicit role priorities before weighted fallback.

### Archer

- Uses the primary ranged attack whenever it is available.
- Uses retreat when the player enters its close-pressure range.
- Advances only until its selected projectile is valid.
- Stops moving while a valid shot is available.

### Assassin

- Uses Dash as the preferred gap closer outside melee range.
- Uses Melee Strike after closing.
- Uses Retreat as a fallback disengage action.
- Dash, Charge, and Leap now share the supported enemy movement-executor path.

## Hover enemy targeting

Moving the mouse over an enemy now:

- Makes it the inspected enemy.
- Adds a visible outline.
- Updates the top enemy health display with the correct name and health.
- Updates the Developer HUD AI inspector to the hovered enemy.

When no enemy is hovered, the display falls back to the active elite or boss.

## Enemy families

New reusable family definitions:

```text
enemy-family.humanoid
enemy-family.crab
enemy-family.wolf
enemy-family.boss
```

Families provide shared tags and an alert radius. The wolf family uses that alert radius for basic pack aggro.

## Starter world enemies

### Crab

- Slow, durable close-range enemy.
- Pinch and Heavy Slam usage records.

### Wolf

- Fast skirmisher.
- Bite and Lunge usage records.
- Alerts nearby wolf-family enemies when damaged.

### Mother Wolf

- Leader-class wolf variant.
- Bite, Lunge, and Howl.
- Howl restores some health and alerts nearby wolves.
- Appears every third wave during validation.

### Boss

- Boss-policy validation enemy.
- Heavy Slam, Leap, Magic Missile, and Roar.
- Boss casts remain committed once chosen.
- Appears every fifth wave during validation.

## Spawn classes

Enemy definitions now declare:

```text
common
leader
boss
```

Random wave spawning draws only from `common`. Leaders and bosses are inserted intentionally.

## Developer AI inspector

The inspector now includes:

- Display name
- Role
- Family
- Hover state
- Pack-alert state
- Current state and ability
- Range band
- Cast validity and positioning reason
- Commitment and decision count

# Astral 0.6.1c - Enemy Archetype Audit

This mini-update performs a complete behavior audit across every current enemy archetype. The primary correction is that an enemy no longer loses all movement intent merely because its preferred attacks are on cooldown.

## Core correction

The previous decision flow selected only abilities that were ready. When every ability was cooling down, the enemy entered recovery without retaining an ability or positioning objective. This was most visible on melee classes, which could remain stationary outside attack range.

The audited flow is now:

```text
Evaluate
  -> select a ready ability when available
  -> otherwise retain a fallback combat ability
  -> position for that ability while its cooldown recovers
  -> cast as soon as it is both ready and in range
```

## Explicit movement styles

Every enemy definition now declares one movement policy:

```text
pressure
hold-range
skirmish
hit-and-run
tank
leader
boss
```

Current assignments:

| Archetype | Movement style | Expected behavior |
|---|---|---|
| Grunt | pressure | Advance into melee range, attack, and maintain pressure. |
| Brute | tank | Advance deliberately, hold close range, and use heavy attacks. |
| Archer | hold-range | Advance into firing range, hold while firing, retreat when too close. |
| Fire Mage | hold-range | Maintain spell range and retreat from close pressure. |
| Frost Caster | hold-range | Maintain spell range, use nova or retreat when pressured. |
| Assassin | hit-and-run | Dash or advance, strike, orbit or disengage during downtime. |
| Crab | tank | Slow advance, hold ground, and use pinch or slam. |
| Wolf | skirmish | Lunge or advance, bite, then orbit during cooldown. |
| Mother Wolf | leader | Advance with the pack, attack, and use howl support. |
| Boss | boss | Position for selected mechanics and complete committed attacks. |

## Cooldown-aware positioning

Enemies now keep a fallback selected ability even when it is cooling down.

- Too far: advance toward the selected ability's maximum range.
- Too close: ranged and hit-and-run roles retreat.
- In range and ready: cast immediately.
- In range and cooling:
  - pressure, tank, leader, boss, and hold-range roles hold their useful band;
  - skirmish and hit-and-run roles orbit the player.

This ensures melee actors continue closing distance instead of idling while attacks recover.

## Casting safety

The casting state now verifies the selected ability cooldown again before beginning its telegraph. If the ability is still cooling down, the enemy returns to tactical positioning instead of entering a broken cast state.

## AI inspector additions

The live AI inspector now reports:

```text
Movement style
Selected ability ready
Cooldown remaining
Positioning intent
Movement reason
Cast reason
```

These values make it possible to distinguish an intentional hold from a missing movement state.

## Validation checklist

### Melee pressure

1. Grunt spawns outside melee range and advances.
2. Grunt attacks when inside its selected ability band.
3. Grunt does not stop outside melee range while attacks cool down.
4. Brute advances and alternates between Heavy Slam and Charge when available.
5. Crab advances slowly and attacks at close range.

### Ranged

1. Archer advances until Arrow Shot or Piercing Shot is valid.
2. Archer stops and fires while in range.
3. Archer retreats when inside its minimum range.
4. Fire Mage and Frost Caster maintain range and display projectiles.

### Mobile melee

1. Assassin uses Dash or advances toward the target.
2. Assassin attacks at melee range.
3. Assassin circles or disengages during cooldown instead of freezing.
4. Wolf advances or lunges, bites, and circles during cooldown.

### Leader and boss

1. Mother Wolf advances, attacks, and uses Howl.
2. Boss positions for melee, leap, projectile, and defensive mechanics.
3. Boss casts remain committed once started.

# Astral 0.6.1d - Enemy Runtime Refactor

This milestone replaces the monolithic enemy decision path with three focused
runtime controllers.

```text
Enemy Definition
      |
      v
Tactical Controller
      |
      +--> Ability Controller
      |
      +--> Movement Controller
      |
      v
Enemy State Machine
```

## Why this refactor was required

Variant-specific failures were appearing across unrelated combinations such as
Skeleton melee, Bandit Fire Mage, and Astral Assassin. Because variants only
change stat multipliers, those failures pointed to the shared interpreter rather
than the individual definitions.

The previous state machine selected abilities, evaluated cooldowns, inferred
role behavior, calculated movement, and executed state transitions in one
large block. The new runtime gives each concern one owner.

## New runtime modules

```text
src/game/enemies/runtime/
  EnemyAbilityController.ts
  EnemyMovementController.ts
  EnemyTacticalController.ts
  EnemyRuntimeTypes.ts
  index.ts
```

### Tactical Controller

Creates one complete combat plan:

- Select an ability.
- Determine whether it can cast now.
- Request advance, retreat, circle, or hold.

### Ability Controller

Owns:

- Ability-usage lookup.
- Health requirements.
- Cooldown readiness.
- Ability-role preference.
- Range validity.
- Stable scoring across movement styles.

No logic depends on enemy variant. Skeleton, Bandit, Goblin, and Astral variants
therefore run through the same path for a given archetype.

### Movement Controller

Owns:

- Advance.
- Retreat.
- Circle.
- Hold.
- Actual position updates.

It never selects abilities or starts casts.

## Shared state flow

Every current archetype now uses:

```text
evaluate
  -> tactical plan
  -> reposition when required
  -> cast when ready and in range
  -> recover
  -> evaluate
```

The selected ability remains stable while repositioning. A tactical re-plan
occurs every 0.45 seconds so an enemy cannot remain attached indefinitely to an
obsolete choice.

## Expected archetype behavior

| Archetype | Expected runtime behavior |
|---|---|
| Grunt | Advance, strike, maintain pressure |
| Brute | Advance, slam or charge, hold ground |
| Archer | Advance into range, shoot, retreat when crowded |
| Fire Mage | Advance into range, cast, hold range |
| Frost Caster | Advance into range, cast, retreat when crowded |
| Assassin | Dash or advance, strike, circle or retreat during downtime |
| Crab | Slow advance, pinch or slam, hold pressure |
| Wolf | Lunge or advance, bite, circle during downtime |
| Mother Wolf | Pack-leader pressure plus howl |
| Boss | Position for a selected mechanic and commit to execution |

## Developer diagnostics

The AI inspector now explicitly identifies the ownership chain:

```text
Runtime tactical > movement > ability
```

It continues to show:

- Selected ability
- Readiness and cooldown
- Current range band
- Cast validity
- Positioning intent
- Movement reason
- Cast reason
- Commitment state

# Changelog — 0.6.1e

## Added

- `EnemyRuntimeWatchdog`
- Casting, movement, evaluate, and recovery watchdog rules
- Automatic force-execute recovery for stalled casts
- Automatic lateral nudge and replan for stalled movement
- Runtime recovery counters and diagnostics

## Changed

- Enemy cast execution now uses a single idempotent resolver
- Stale enemy telegraphs are cleared before new casts
- Failed telegraph starts return enemies to evaluation
- AI inspector now exposes watchdog and execution state

## Fixed

- Enemies remaining indefinitely in `casting`
- Enemies becoming stuck after initially approaching
- Stale telegraphs preventing later attacks
- Movement states holding without displacement
- Potential duplicate attacks during forced cast recovery

# Changelog — 0.6.1f

- Added configurable enemy target radius and height.
- Added invisible combat target volumes for hover selection.
- Aimed player abilities and ranged basic attacks at hovered target centers.
- Updated projectile collision to use enemy target volumes.
- Added `return-home` enemy state and leash enforcement.
- Added territory and target-volume diagnostics.

# Changelog — 0.6.1f2

## Added

- Central combat balance configuration
- Central combat presentation configuration
- Combat debug-visual configuration
- Export surface from `src/game/config/index.ts`

## Changed

- Enemy target volumes scaled to 50%
- Hover volumes scaled to 50%
- Player and enemy projectile visuals scaled to 50%
- Player and enemy projectile collision radii scaled to 50%
- Damage-number presentation scaled to 75%
- Enemy health, damage, and movement now pass through centralized tuning multipliers

## Unchanged

- Detection ranges
- Preferred ranges
- Leash and territory values
- Enemy tactical behavior
- Ability selection
- State-machine behavior

# Changelog — 0.6.1g

## Added

- Enemy spawn validation and expanding-ring candidate search
- Enemy navigation capabilities by archetype role
- Local world-aware navigation resolver
- Segment collision testing
- Ground/support sampling
- Step, jump, drop, platform, and lift navigation modes
- Traversal links generated from world traversal surfaces
- Dynamic enemy and moving-collider avoidance
- Local left/right route correction
- Navigation debug overlay
- AI HUD navigation controls and diagnostics
- Navigation watchdog recovery reasons
- Future traversal types for climbing and flying actors

## Changed

- Reposition movement now passes through enemy navigation
- Return-home movement now respects world geometry
- Retreat, charge, dash, and leap movement now respects world geometry
- Invalid enemy spawns are rejected rather than forced

## Preserved

- Tactical ability selection
- Ability state machine
- Territory/leash authority
- Enemy combat definitions
- Combat presentation tuning

# Changelog — 0.6.1g1

## Added

- `NavigationSurfaceManager`
- Navigation support classification
- Final ground/support projection
- Surface-aware spawn elevation
- Path validity and path-age diagnostics
- Categorized navigation rejection diagnostics
- Grouped navigation debug controls

## Fixed

- Water volumes blocking valid bridge routes
- Enemies losing or retaining incorrect vertical elevation
- Dynamic supports being treated as obstacles while an enemy stood on them
- Spawned enemies ignoring elevated support height

## Unchanged

- Enemy tactical ability selection
- Detection and preferred ranges
- Leash behavior
- Combat values
- Targeting and projectile tuning

# Changelog — 0.6.1g2

## Added
- Full-body swept collision
- Obstacle sliding
- Multi-point footprint support
- Ledge rejection and recovery
- Stale-path invalidation
- Lateral escape candidates
- Navigation path generations
- Expanded navigation inspector values

## Fixed
- Enemies partially entering rocks and props
- Enemies hanging on unsupported platform edges
- Paths remaining valid for excessive periods
- Replans not resetting after goal or support-surface changes

# Changelog — 0.6.1g3

## Added

- Shared grounded movement runtime for player-style enemy world resolution
- Per-enemy collision and traversal-support ownership
- Goal-progress watchdog metrics
- Return-home validated-position failsafe
- Movement result diagnostics

## Changed

- Enemy navigation results are now movement requests, not direct mesh positions
- Enemy lateral recovery uses collision-resolved movement
- Grounded, support-height and vertical-velocity state now come from the shared movement runtime
- Watchdog recovery uses distance-to-goal improvement
- `return-home` is monitored for meaningful progress

## Preserved

- Tactical ability selection
- Preferred combat ranges
- Territory and leash logic
- Spawn validation
- Traversal-link planning
- Navigation debug routes

# Changelog — 0.6.1g4

## Fixed

- Enemy meshes snapping one shape-height below their intended elevation
- Capsules and spherical enemies appearing partially submerged
- Landing and ground-snap logic treating mesh centers as foot positions
- Repeated local nudges causing very high recovery counts
- Stale support percentage and support-surface diagnostics

## Added

- Explicit actor ground offset in the shared movement runtime
- Foot-space collision and support resolution
- Ring-based validated escape-waypoint search
- Escalating validated local reset after extended route failure
- Support diagnostic refresh after resolved movement

# Changelog — 0.6.1g5

## Fixed

- Enemies jumping vertically without forward travel
- Traversal collider front faces blocking valid jump landings
- Jump attempts against surfaces above the enemy's supported jump height
- Airborne horizontal intent being lost after takeoff

## Added

- Ballistic horizontal jump planning
- Landing-surface preselection
- Horizontal jump-speed cap
- Jump landing diagnostics in shared movement results

# Changelog — 0.6.1g6

## Added

- Planner-owned traversal phases
- Landing connectivity validation
- Post-landing waypoint storage
- Landing-surface reservation
- Traversal attempt limits and cooldowns
- Landing settle period
- Traversal diagnostics

## Fixed

- Repeated jumps onto the same platform
- Enemies becoming trapped after landing
- Supporting surfaces reporting body overlap
- Watchdog and navigation independently requesting jumps
- Multiple enemies choosing the same small landing position

# Changelog — 0.6.1g7

## Fixed

- Bidirectional links now reverse correctly when approached from their exit endpoint.
- Elevated enemies can descend from free traversal surfaces.
- Drop movement now preserves forward horizontal velocity.
- Direction-specific jump/drop capability checks now occur after link orientation.
- Ground is no longer treated as a single reservable landing surface.

## Added

- Explicit `traversalMovementMode` state for atomic jump and drop execution.
- Shared movement runtime support for `none`, `jump`, and `drop` traversal requests.

# Changelog — 0.6.2

## Added

- Combat Sandbox developer HUD page
- Live engagement-zone tuning store
- Engagement, balance, and presentation sliders
- Tiny Arena, Dungeon, Open World, Boss Fight, Stress Test, and Reset presets
- JSON export of current tuning values
- Live active-enemy reevaluation after tuning changes

## Changed

- Enemy ability ranges now use live preferred and attack-range scaling
- Enemy detection and leash zones now use live multipliers
- Pack alert radius now uses live tuning
- Tactical replan interval is configurable
- Enemy HP, damage, speed, and cooldowns are configurable
- Target volumes and new projectile sizing use live presentation values

## Preserved

- 0.6.1g7a bidirectional traversal behavior
- Shared enemy movement runtime
- Navigation surface, bridge, platform, jump, and drop handling

# Changelog - 0.6.2a

## Added

- `CombatSandboxDefaults.json` containing the Prototype Combat profile.
- `EnemyRangePositioning.ts` with role defaults and individual override support.
- Three-layer range-positioning resolution: global, role, and enemy override.

## Changed

- Combat Sandbox default values now match the user-tested baseline.
- Ability preferred range now includes the enemy role multiplier.
- Ranged enemies close to preferred range before holding to cast.
- Advance and retreat buffers now include role-level multipliers.

## Preserved

- Ability maximum attack range remains controlled by `attackRangeScale`.
- Detection, leash, pack alert, HP, damage, speed, and presentation remain live-tunable.
- Existing enemy navigation, traversal, and territory behavior are unchanged.

# Changelog — 0.6.3

## Added

- `StatusRuntime`
- `StatusComponent`
- `StatusInstance`
- Runtime status events
- Immunity and resistance data
- Cleanse support
- Status definition map
- Status developer panel
- Chill, Freeze, Vulnerable, Haste, and Shielded definitions

## Changed

- Enemy movement consumes status-derived movement multipliers
- Elemental player damage applies reusable runtime statuses
- Timed status damage and healing update actor health
- Entity component keys include `gameplay.statuses`
- Status HUD page now supports runtime controls

## Compatibility

Legacy enemy elemental timers are retained temporarily for existing Shatter and Lightning-chain behavior while those reactions are migrated to gameplay tags and status events.

### Validate
```bash
npm run build
npm run dev
```