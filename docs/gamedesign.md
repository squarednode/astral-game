# Project Astral
## Game Design Document

**Version:** 0.2  
**Status:** Active Development  
**Project Type:** Browser-first 2.5D Action RPG  
**Current Goal:** Playable vertical slice  
**Working Title:** Project Astral

---

# 1. Vision Statement

## Elevator Pitch

Project Astral is a browser-first 2.5D action RPG combining:

- Diablo-style real-time combat
- Diablo II and Grim Dawn-inspired loot
- Genshin-style party control and character switching
- Buildcraft centered on party synergy rather than only individual power
- Traversal and world design that support alternate routes, elevation, and exploration

The browser version is the reference implementation used to invent, test, and prove the game’s systems.

The long-term goal is to create a commercial-quality standalone ARPG that could later be ported to Unity, Unreal, or another engine without redesigning the core gameplay.

---

# 2. Design Pillars

## 2.1 Responsive Combat

Movement, attacks, dodges, jumps, abilities, and character switching must feel immediate.

Combat responsiveness is more important than graphical fidelity.

The player should understand why an action succeeded or failed.

---

## 2.2 Buildcraft Through Synergy

The game should reward players for creating synergies between systems rather than simply increasing numbers.

Players build around combinations of:

- Party members
- Classes
- Armor families
- Abilities
- Equipment
- Elemental reactions
- Ultimates
- Positioning
- Traversal options

---

## 2.3 Meaningful Player Choice

Choices involving party composition, equipment, abilities, routes, and combat order should have visible consequences.

The player should rarely feel that the only solution is more damage.

---

## 2.4 Systems Over Content

The engine should make it easy to add:

- Characters
- Classes
- Abilities
- Enemies
- Loot
- Reactions
- Zones
- Traversal mechanics

Game content should be data-driven wherever practical.

---

## 2.5 Playability First

Every commit must:

- Build successfully
- Launch successfully
- Remain playable
- Preserve the last stable state unless intentionally changed

---

# 3. Non-Negotiables

- The game must remain enjoyable as a solo experience.
- Combat responsiveness takes priority over visual complexity.
- Party synergy is more valuable than raw stat scaling.
- New mechanics should add meaningful choices rather than unnecessary complexity.
- Every major system should be data-driven where practical.
- Every commit must build and remain playable.
- The browser version remains the reference implementation until a deliberate port is approved.
- Porting to another engine should reproduce a proven game design rather than restart the design process.

---

# 4. Target Player Experience

The player should frequently feel:

> I always have another tactical option.

Possible responses to a challenge include:

- Switch characters
- Change positioning
- Dodge
- Jump
- Use terrain
- Trigger an elemental reaction
- Build or spend ultimate energy
- Change equipment
- Change party composition
- Take another route
- Use a different class or armor family

The player should rarely feel:

> I lost because my number was too small.

---

# 5. Core Gameplay Loop

```text
Explore a zone
    ↓
Discover enemies, routes, and objectives
    ↓
Fight
    ↓
Collect loot
    ↓
Equip and improve characters
    ↓
Adjust party composition and builds
    ↓
Unlock or discover new routes
    ↓
Fight stronger enemies and bosses
    ↓
Repeat

---

# 6. Camera and Presentation

## 6.1 Perspective

The game uses a 2.5D presentation.

The world is built in 3D, but gameplay is viewed from a fixed or semi-fixed elevated camera.

## 6.2 Camera Requirements

The camera should provide:

Clear combat readability
Minimal obstruction
Smooth character follow
Reliable mouse targeting
Readable elevation changes
Dynamic zoom later if useful
Stable orientation during combat

The camera should not create artificial difficulty.

# 7. Controls
7.1 Default Control Scheme
Left Mouse
Move / Interact

Hold Left Mouse
Continuously update movement destination toward cursor

Right Mouse
Basic attack

1–4
Character abilities

R
Dodge / Roll

Space
Jump

Tab
Take control of next party member

Shift + Tab
Take control of previous party member

Mouse Wheel
Cycle controlled party member

I
Inventory

7.2 Movement Modes

The game should support:

Hybrid Mode
WASD movement
Click-to-move
Holding left mouse continuously steers toward the current cursor position
WASD input cancels the active click destination
WASD Mode
WASD controls movement
Left click is reserved for interaction and targeting
Click-to-move is disabled
Click Mode
Left click controls movement and interaction
WASD may be disabled or retained as optional emergency movement

Hybrid mode is the default during development.

7.3 Left-Click Behavior

Left click is a smart interaction input.

Expected behavior:

Empty ground: move
Hold on ground: continuously steer
Loot: pick up
NPC: interact
Chest: open
Portal: activate
Enemy: select or move toward

Click-to-attack is disabled by default.

Players may later enable click-to-attack as an option.

This avoids the common ARPG problem where the player becomes locked in place because the game attacks when the player intended to move.

# 8. Movement and Traversal
## 8.1 Movement

Movement should feel immediate and readable.

Supported systems:

WASD movement
Click-to-move
Hold-to-steer movement
Dodge
Jump
Ground targeting
Directional facing
8.2 Dodge

Dodge direction priority:

Current WASD direction
Current click-to-move direction
Cursor direction
Character facing direction

Dodge may later change by class or equipment into:

Roll
Blink
Charge
Shield rush
Shadow step
Leap
8.3 Jump

Jump is intended for traversal and combat navigation, not precision platforming.

Possible uses:

Crossing gaps
Crossing rivers
Reaching ledges
Jumping between rooftops
Traversing mountain paths
Avoiding ground effects
Reaching hidden loot
Taking alternate routes
Entering or escaping combat spaces

Jump distances should be forgiving.

The game should not become a platformer.

8.4 Verticality

Verticality should support:

Exploration
Alternate routes
Tactical advantage
Hidden areas
Shortcuts
Environmental storytelling
Scalable world design

Examples:

Crossing broken bridges
Jumping between buildings
Climbing through ruins
Dropping into lower areas
Reaching mountain paths
Moving across terrain that cannot be passed at ground level

# 9. Combat Philosophy

Combat is real-time.

Combat should emphasize:

Positioning
Timing
Target priority
Ability sequencing
Character switching
Reaction setup
Ultimate energy management
Terrain use
Cooldown management

Difficulty should come from decision-making rather than inflated enemy health.

Enemies should test the player’s ability to:

Move
React
Prioritize targets
Break defenses
Manage space
Change controlled characters
Use the correct party tools

# 10. Party System
10.1 Party Size

The party may contain:

One character
Two characters
Three characters

The maximum active party size is three.

The player directly controls one character at a time.

10.2 Taking Control

The system is described as taking control of another party member rather than replacing or spawning a character.

Party members remain persistent.

Each party member retains:

Health
Cooldowns
Ultimate energy
Equipment
Status effects
Temporary buffs
Temporary debuffs
10.3 Story Progression

The player may begin the game with one character.

Additional party members may be unlocked through the story.

The player is not required to use all three available party slots.

10.4 Inactive Party Members

Inactive party members do not automatically fight during normal gameplay.

They may contribute through:

Persistent abilities
Swap-in effects
Swap-out effects
Summons
Legendary equipment
Ultimate abilities
Temporary echoes or manifestations
Party-wide passives

Direct combat remains focused on the currently controlled character.

10.5 Party Composition Freedom

The game does not require:

One Tank
One Healer
One Damage dealer

Valid compositions include:

Tank / Priest / Warrior
Tank / Warrior / Rogue
Mage / Hunter / Rogue
Warrior / Warrior / Warrior
Priest / Priest / Tank
Solo Hunter
Three damage classes
Two support classes and one damage class
Two of the same class
Three of the same class

All compositions should be technically viable.

Mixed parties should provide broader tools.

Focused parties should provide stronger specialization.

Duplicate-class parties should be allowed.

10.6 Duplicate Classes

Three Warriors or other duplicate compositions are allowed.

Duplicate classes should not be invalidated, but overlapping effects may have reduced stacking.

Example:
First Warrior Battle Cry:
Full effect

Second Warrior Battle Cry:
Reduced additional effect

Third Warrior Battle Cry:
Further reduced additional effect

Duplicate-class parties may specialize into different builds, such as:

Bleed Warrior
Shatter Warrior
Counterattack Warrior

10.7 Party Composition Bonuses

Party bonuses should reward composition without forcing one correct answer.

Examples:

Diverse Party Bonus

Three different gear families:

Increased ultimate generation
Increased reaction strength
Broader resistance coverage
Focused Party Bonus

Three Agile-family characters:

Increased critical reaction damage

Three Fortified-family characters:

Increased damage mitigation

Three Focused-family characters:

Increased cooldown or resource efficiency

Diversity bonuses and focused bonuses should both be viable.

# 11. Base Classes

The base game targets six classes:

Warrior
Tank
Mage
Priest
Rogue
Hunter

The first vertical slice will use three:

Tank
Rogue
Mage

These three test:

Defense
Melee burst
Ranged control
All three gear families
Party switching
Ultimate conversion
Mixed-party synergy

The remaining classes will be added after the class framework is stable.

# 12. Gear Families

The game uses three broad gear families.

12.1 Fortified Gear Family

Associated classes:

Tank
Priest

Primary themes:

Health
Defense
Sustain
Damage absorption
Healing durability
Support resilience
12.2 Agile Gear Family

Associated classes:

Warrior
Rogue

Primary themes:

Attack
Critical effects
Burst damage
Mobility
Close-range pressure
12.3 Focused Gear Family

Associated classes:

Mage
Hunter

Primary themes:

Precision
Range
Speed
Positioning
Crowd control
Long-range damage
Skill execution
12.4 Preferred Family Bonus

Each class has a preferred gear family.

Preferred gear family bonus:
+10% effectiveness from the gear family core stat
Off-family gear remains usable.

This encourages class identity without hard restrictions.

# 13. Core Stats

The broad major-stat framework uses:

Focus
Precision
Technique
Power

These names are intentionally broad so they can scale differently by class.

Possible interpretations:

Focus

May influence:

Healing
Defensive effects
Resource generation
Status strength
Ability control
Precision

May influence:

Critical chance
Critical damage
Ranged accuracy
Weak-point damage
Projectile behavior
Technique

May influence:

Cooldown efficiency
Mobility
Status application
Attack speed
Combo effects
Power

May influence:

Direct damage
Absorption
Healing output
Summon strength
Ability scaling

The exact relationship between each class and each stat remains subject to testing.

# 14. Equipment System
14.1 Equipment Ownership

Each character owns and equips their own gear.

Equipment is not automatically shared between active party members.

This supports:

Individual character progression
Class-specific builds
Gear hunting
Multiple loadouts
Long-term loot value
14.2 Inventory Philosophy

Every item occupies one inventory slot regardless of physical size.

The inventory should allow players to collect large amounts of gear without inventory management becoming the dominant gameplay challenge.

The UI should support:

Sorting
Search
Gear-family filters
Stat filters
Rarity filters
Class recommendation
Quick comparison
Favorites
Item locking
Loadouts
Sell or dismantle marking
14.3 Loot Restrictions

Loot is not class-restricted by default.

Gear may be associated with a preferred family, but classes may equip off-family gear if the system permits it.

Examples:

Defensive Rogue using Fortified gear
Critical Priest using Agile gear
High-speed Tank using Focused gear

Off-family gear should create tradeoffs rather than automatic invalidity.

14.4 Item Stat Structure

Top-level equipment contains four stat lines.

1. Core Stat

One major stat associated with the gear family.

Examples:

Fortified: Power or Focus
Agile: Power or Precision
Focused: Focus, Precision, or Technique

The core stat scales according to the class using the item.

2. Vitality Stat

Every item contains a health-related stat.

Expected trend:

Fortified: highest vitality
Agile: moderate vitality
Focused: lowest vitality
3. Family Secondary Stat

Each gear family emphasizes one secondary category.

Fortified: Defense
Agile: Critical
Focused: Speed

Speed may later include:

Movement speed
Attack speed
Cast speed
Cooldown recovery
Projectile speed
4. Flavor Stat

The fourth stat provides item identity.

Examples:

Movement speed
Ultimate generation
Resource generation
Elemental effect
Swap bonus
Traversal bonus
Status duration
Skill modification
Reaction bonus
Off-field effect
Dodge modification

Named unique items may replace the flavor stat with a special power.

# 15. Loot Philosophy

Loot should change how the player plays.

Good loot changes:

Rotations
Swaps
Reactions
Positioning
Traversal
Ultimate usage
Skill behavior
Party composition

Simple percentage bonuses may exist, but legendary and unique items should create mechanical changes.

15.1 Rarity

Current target rarity structure:

Common
Magic
Rare
Legendary
Unique
Set items later if justified

15.2 Named Unique Items

Named unique items may have:

Fixed identity
Fixed or partially fixed stats
One build-changing effect
Class or family interactions
Ultimate interactions
Traversal effects
Party effects

# 16. Ultimate System
16.1 Ultimate Energy Generation

Each class generates ultimate energy through actions related to its role.

Examples:

Tank

Builds energy through:

Taking damage
Blocking
Mitigating damage
Protecting allies
Priest

Builds energy through:

Healing
Preventing damage
Cleansing effects
Supporting allies
Warrior

Builds energy through:

Sustained melee damage
Combo completion
Breaking defenses
Staying in close combat
Rogue

Builds energy through:

Critical hits
Positional attacks
Avoidance
Burst damage
Mage

Builds energy through:

Elemental reactions
Spell damage
Crowd control
Multi-target effects
Hunter

Builds energy through:

Ranged attacks
Weak-point hits
Marks
Traps
16.2 Ultimate Conversion

Ultimate energy is generated by one character but may be activated after switching control to another character.

The final effect depends on:

The class that generated the energy
The currently controlled class
The gear families involved
The current combat situation
Equipment or legendary modifiers

Example:
Tank builds energy by taking damage.

Player switches to Rogue or Warrior.

Tank-generated ultimate converts into:
AOE blinding light
AOE damage
Temporary enemy disable

16.3 Ultimate Design Goal

The ultimate system should create decisions such as:

Which character should build energy?
Which character should spend it?
When should the player switch?
Which enemy group should receive the effect?
Should the player preserve energy for a stronger conversion?

# 17. Elemental Reactions

Elemental reactions are deterministic.

When valid conditions exist, the reaction occurs.

Random chance does not determine whether a valid reaction activates.

Reaction output may depend on:

Source element
Trigger element
Character stats
Gear
Target resistance
Ability tags
Party composition
Ultimate effects
Environmental state

# 18. World Structure

The game is not planned as one uninterrupted open world.

The preferred structure is large connected zones.

Examples:

Forest
Temple
Ruins
Caves
City
Mountain
Underground complex
Coastal region

Each zone may contain:

Main routes
Hidden routes
Shortcuts
Elite enemies
Traversal challenges
Environmental hazards
Secret loot
Optional encounters
Story areas

# 19. Progression

Progression exists at three levels.

19.1 Character Progression
Levels
Abilities
Passives
Class mechanics
Ultimate improvements
Gear loadouts
19.2 Party Progression
Party composition
Synergies
Shared bonuses
Swap interactions
Ultimate conversion
Gear-family combinations
19.3 Equipment Progression
Weapons
Armor
Relics
Named items
Legendary powers
Gear-family bonuses
Build-defining effects

# 20. Technical Philosophy
Browser first
TypeScript
Babylon.js for the current prototype
Data-driven gameplay
Modular systems
Rendering separated from gameplay logic
Input separated from gameplay execution
Systems independently testable
Portable to another engine later
Avoid premature abstraction
Refactor before duplication
Stable playable state after every commit

# 21. Coding Standards
No unnecessary magic numbers
Gameplay tuning values should move into configuration
Functions should have a clear responsibility
Prefer composition over inheritance
Avoid deeply coupled systems
Avoid visual-editor-only logic where possible
Keep data separate from execution
Build before committing
Playtest before pushing
Commit messages should describe the change clearly
# 22. Development Workflow

Each sprint follows:
Design
    ↓
Update GDD or technical documentation
    ↓
Implement focused change
    ↓
npm run build
    ↓
npm run dev
    ↓
Playtest
    ↓
Commit
    ↓
Push
    ↓
GitHub Actions deploy

# 23. Milestones
Milestone 0 — Foundation

Status: Complete

Includes:

GitHub repository
GitHub Pages
GitHub Actions
Codespaces
Node 22 environment
Vite
TypeScript
Documentation
Centralized input management
Playable prototype
Milestone 1 — Movement

Current focus:

Hybrid movement
Click-and-hold steering
Dodge tuning
Jump
Camera tuning
Traversal foundation
Movement configuration
Milestone 2 — Combat

Target systems:

Basic attacks
Ability slots
Enemy AI
Health
Damage
Death
Combat readability
Skill timing
Hit feedback
Milestone 3 — Party

Target systems:

One to three party members
Take-control switching
Persistent health
Persistent cooldowns
Swap effects
Duplicate classes
Composition bonuses
Milestone 4 — Loot

Target systems:

Item drops
Character-owned equipment
Inventory
Sorting
Affixes
Gear families
Legendary effects
Unique items
Milestone 5 — Reactions and Ultimates

Target systems:

Deterministic elemental reactions
Role-based ultimate generation
Ultimate conversion between characters
Party-synergy effects
Status effects
Milestone 6 — Vertical Slice

Target content:

Tank
Rogue
Mage
One connected dungeon or zone
Traversal routes
Elite encounters
Boss
Loot loop
Character switching
Ultimate conversion
Stable progression loop

# 24. Open Design Questions
24.1 Core Stat Relationships

How exactly should:

Focus
Precision
Technique
Power

scale for each class?

24.2 Gear Slots

How many equipment slots should each character have in the vertical slice?

24.3 Off-Family Gear

Should any class be able to equip any gear family immediately, or should this require a passive, talent, or level threshold?

24.4 Duplicate-Class Scaling

Which effects stack fully, partially, or not at all?

24.5 Party Composition Bonuses

How strong should diverse and focused party bonuses be?

24.6 Ultimate Storage

Does ultimate energy belong only to the character that generated it, or may some gear move energy between characters?

24.7 Death and Party Failure

What happens when:

One character is defeated?
Two characters are defeated?
The full party is defeated?

24.8 Jump and Traversal Requirements

Which traversal actions are universal, and which depend on:

Class
Gear
Abilities
Environmental objects
24.9 Healing Model

Should healing be:

Primarily class-based
Primarily item-based
Primarily between combat
Limited during combat
A mixture
24.10 Loot Volume

How much gear should drop before inventory management becomes annoying?

## Encounter Structure

The main game uses authored encounters rather than infinite enemy waves.

Encounters may include:

- Fixed enemy groups
- Reinforcement phases
- Elite arrivals
- Environmental hazards
- Objectives
- Rewards
- Route unlocks

The encounter ends when its defined completion conditions are met.

## Survival Mode

The existing wave system is retained as a separate mode for:

- Combat testing
- Build testing
- Performance testing
- Endless survival gameplay
- Future challenge or leaderboard modes

Survival Mode is not the default campaign structure.

# Combat Rules
Astral rewards reading and reacting to committed combat actions, not exploiting repeated AI indecision.
Players
Can interrupt casts with actions.
Have a 95% commitment window.
One queued action.
Movement interrupts early casts.
Standard Enemies
Can interrupt early.
Commit around 70%.
Slightly longer attack range.
Don't endlessly chase.
Elites
Earlier commitment.
Fewer interruptions.
Better positioning.
Bosses
Mechanics always execute once committed.
Telegraphs replace cancellation.
Dodging is the counterplay.

# 25. Future Ideas Parking Lot

These ideas are recorded but intentionally deferred.

Multiplayer
Cooperative play
PvP
Crafting
Trading
Seasons
Endless dungeon
Procedural world generation
Housing
Mounts
Companion pets
Transmog
Photo mode
Guilds
Leaderboards
Challenge modes
Hardcore mode
Mod support