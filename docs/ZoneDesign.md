1. Purpose

Why zones exist.

Example:

Outdoor zones provide exploration, combat, traversal, discovery, and storytelling while allowing replayability through modular layouts.

2. Zone Philosophy

A zone should:

Encourage exploration.
Present multiple route choices.
Reward observation.
Support replayability.
Feel handcrafted.
Never feel maze-like.
Avoid unnecessary backtracking.
3. Path Philosophy

Every major objective should have:

Primary path
Optional path
Hidden shortcut later

Primary path should always remain readable.

4. Traversal

Rules:

Jumping enhances movement.
Jumping is never pixel-perfect.
Obstacles always have an alternate solution.
Traversal should create decisions rather than frustration.

Examples:

Fallen log
Broken bridge
Small ledge
Stream crossing
Rock formation
5. Modular Construction

Every zone is built from modules.

Examples:

Entrance

Forest

Clearing

Bridge

Camp

Ruins

River

Hill

Arena

Exit

Rules:

Modules connect cleanly.
Modules may rotate.
Modules own their encounters.
Modules own traversal objects.
Modules own chest anchors.
Modules own scenery anchors.
6. Landmarks

Every zone should contain memorable landmarks.

Examples:

Giant tree
Broken tower
Ancient statue
Waterfall
Campfire
Stone bridge

The player should always have visual orientation.

7. Enemy Territories

Each territory contains:

Spawn point
Patrol radius
Aggro radius
Pursuit radius
Return behavior
Respawn behavior

Enemy identity belongs to the territory.

8. NPC Placement

NPCs should exist for a purpose.

Examples:

Story
Unlock route
Vendor later
Rest point
Warning

NPCs should not exist purely as exposition.

9. Loot Placement

Every zone should include:

Guaranteed reward
Optional reward
Hidden reward

Hidden rewards should encourage exploration rather than random searching.

10. Elite Placement

Elite encounters should:

Feel special.
Be visually distinct.
Use dedicated arenas.
Reward preparation.
11. Replayability

Randomization should affect:

Routes
Enemy territories
Loot
Chests
Side objectives

Randomization should never invalidate story progression.

12. Visual Identity

Until art is developed:

Use simple primitives.

Examples:

Cubes = ruins
Cylinders = trees
Spheres = bushes
Logs = stretched cylinders
Water = blue plane
Bridge = planks

Gameplay always takes priority over visual fidelity during prototyping.

Environment Interaction Classes

Every object in the world belongs to one of four categories.

Class 1 – Decorative

Purpose:

Visual only.

Examples:

Grass
Flowers
Pebbles
Mushrooms
Leaves
Small bushes

Player:

✅ Walk through

Enemies:

✅ Walk through

Collision:

None

Class 2 – Soft Obstacle

Purpose:

Suggest movement.

Examples:

Bushes
Tall grass
Fallen branches
Small fences

Player:

✅ Walk through

Movement slightly slows (later)

Enemies:

✅ Walk through

Collision:

None

Later we can add:

Rustling animation
Sound
Particles

That makes the world feel alive.

Class 3 – Traversable Object

Purpose:

Decision making.

Examples:

Fallen logs
Low rocks
Stream crossings
Small ledges

Player:

Cannot walk through.

Must:

Jump
Walk around

Enemies:

Depends on type.

This creates gameplay.

Class 4 – Solid World

Purpose:

World boundaries.

Examples:

Trees
Cliffs
Buildings
Ruins
Large rocks

Player:

Cannot walk through.

Enemies:

Cannot walk through.

These define navigation.


## Future Expansion

This document intentionally defines only the current implementation.

Future mechanics may extend these rules but should avoid invalidating them.