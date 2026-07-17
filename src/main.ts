import './style.css';
import './devtools/DeveloperConsole.css';
import './ui/party/PartyManagementScreen.css';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { InputManager } from './engine/input/InputManager';
import { PlayerMovementController } from './game/movement/PlayerMovementController';
import { PlayerCameraController } from './game/camera/PlayerCameraController';
import { MovementDebugOverlay } from './ui/debug/MovementDebugOverlay';
import { CombatSystem } from './game/combat/CombatSystem';
import { DamageNumberManager } from './game/combat/DamageNumberManager';
import { EnemyTelegraphController } from './game/combat/EnemyTelegraphController';
import { HitFeedbackController } from './game/combat/HitFeedbackController';
import type { HitWeight } from './game/combat/CombatTypes';
import { GameBalance } from './game/config/GameBalance';
import { DeveloperConsole } from './devtools/DeveloperConsole';
import { developerState } from './devtools/DeveloperState';
import type { DeveloperActions } from './devtools/DeveloperActions';
import { PartyManagementScreen } from './ui/party/PartyManagementScreen';
import { buildOutdoorZone } from './game/world/OutdoorZoneBuilder';
import { WorldCollisionSystem } from './game/world/WorldCollisionSystem';
import { DynamicCollisionSystem } from './game/world/DynamicCollisionSystem';
import { TraversalSurfaceSystem } from './game/world/TraversalSurfaceSystem';
import { WorldVolumeSystem } from './game/world/WorldVolumeSystem';
import type {
  GearFamily,
  GearSlot,
  PartyManagementModel,
} from './ui/party/PartyManagementTypes';

type Element = 'physical' | 'fire' | 'frost' | 'lightning' | 'arcane';
type Rarity = 'common' | 'magic' | 'rare' | 'legendary';
type ItemFamily = GearFamily;
type ItemSlot = GearSlot;
type SkillKey = 'Q' | 'E';
type AbilitySlot = 1 | 2 | 3 | 4;

interface CharacterDef {
  id: string;
  name: string;
  role: string;
  element: Element;
  color: Color3;
  maxHp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  qName: string;
  eName: string;
  preferredFamily: ItemFamily;
}

interface CharacterState extends CharacterDef {
  hp: number;
  cooldowns: Record<SkillKey | 'attack' | 'dodge' | 'swap', number>;
  equipment: Partial<Record<ItemSlot, LootItem>>;
  skillSlots: Partial<Record<AbilitySlot, SkillKey>>;
}

interface Enemy {
  mesh: Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  elite: boolean;
  attackCd: number;
  statuses: Partial<Record<Element, number>>;
  knockbackVelocity: Vector3;
}

interface LootItem {
  id: number;
  name: string;
  rarity: Rarity;
  power: number;
  attackBonus: number;
  maxHpBonus: number;
  swapBonus: number;
  family: ItemFamily;
  slot: ItemSlot;
  focus: number;
  precision: number;
  technique: number;
  favorite: boolean;
  legendaryPower?: string;
}

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.035, 0.045, 0.065, 1);
scene.collisionsEnabled = false;

const camera = new ArcRotateCamera('camera', -Math.PI / 2, 0.92, 23, Vector3.Zero(), scene);
camera.lowerRadiusLimit = 18;
camera.upperRadiusLimit = 28;
camera.inputs.clear();

new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.72;
const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.3), scene);
sun.position = new Vector3(12, 20, 10);
sun.intensity = 1.15;
const shadows = new ShadowGenerator(1024, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 18;

const mats = new Map<string, StandardMaterial>();
function mat(name: string, color: Color3, emissive = 0): StandardMaterial {
  const key = `${name}-${color.toHexString()}-${emissive}`;
  if (mats.has(key)) return mats.get(key)!;
  const m = new StandardMaterial(key, scene);
  m.diffuseColor = color;
  m.emissiveColor = color.scale(emissive);
  m.specularColor = new Color3(0.15, 0.15, 0.18);
  mats.set(key, m);
  return m;
}

const outdoorZone = buildOutdoorZone({
  scene,
  shadows,
  material: mat,
});
const ground = scene.getMeshByName(outdoorZone.groundName)!;
const worldCollision = new WorldCollisionSystem(outdoorZone.colliders);
const dynamicCollision = new DynamicCollisionSystem(outdoorZone.dynamicColliders);
const traversalSurfaces = new TraversalSurfaceSystem(
  outdoorZone.traversalSurfaces,
);
const worldVolumes = new WorldVolumeSystem(
  scene,
  outdoorZone.worldVolumes,
);

const defs: CharacterDef[] = [
  { id: 'vanguard', name: 'Vanguard', role: 'Shatter bruiser', preferredFamily: 'agile', element: 'physical', color: new Color3(0.85, 0.28, 0.22), maxHp: 170, speed: 7.0, attackDamage: 24, attackRange: 2.2, attackCooldown: 0.52, qName: 'Ground Breaker', eName: 'War Cry' },
  { id: 'warden', name: 'Warden', role: 'Frost support', preferredFamily: 'fortified', element: 'frost', color: new Color3(0.28, 0.72, 1), maxHp: 130, speed: 6.5, attackDamage: 16, attackRange: 7.0, attackCooldown: 0.72, qName: 'Frost Field', eName: 'Ice Barrier' },
  { id: 'tempest', name: 'Tempest', role: 'Lightning assassin', preferredFamily: 'focused', element: 'lightning', color: new Color3(0.72, 0.42, 1), maxHp: 115, speed: 8.2, attackDamage: 19, attackRange: 3.0, attackCooldown: 0.36, qName: 'Chain Arc', eName: 'Blink Strike' },
];
const party: CharacterState[] = defs.map(d => ({
  ...d,
  hp: d.maxHp,
  cooldowns: { Q: 0, E: 0, attack: 0, dodge: 0, swap: 0 },
  equipment: {},
  skillSlots: { 1: 'Q', 2: 'E' },
}));
let activeIndex = 0;
let active = party[0];

const playerRoot = new TransformNode('playerRoot', scene);
playerRoot.position.set(0, 0, -22);
const playerBody = MeshBuilder.CreateCapsule('player', { height: 2.0, radius: 0.55 }, scene);
playerBody.parent = playerRoot;
playerBody.position.y = 1;
playerBody.material = mat('player', active.color, 0.08);
shadows.addShadowCaster(playerBody);
const facingMarker = MeshBuilder.CreateBox('facing', { width: 0.16, height: 0.16, depth: 1.0 }, scene);
facingMarker.parent = playerRoot;
facingMarker.position.set(0, 0.45, 0.75);
facingMarker.material = mat('facing', Color3.White(), 0.35);

const input = new InputManager(window);
let pointerWorld = new Vector3(0, 0, 4);
let swapInputCooldown = 0;
let inventoryOpen = false;
let gameOver = false;
let wave = 1;
let kills = 0;
let lootId = 1;
let enemies: Enemy[] = [];
let loot: LootItem[] = [];
let effects: { mesh: Mesh; ttl: number; tick: number; type: Element; radius: number; damage: number }[] = [];
let scheduledWave: number | null = null;
let projectiles: { mesh: Mesh; vel: Vector3; ttl: number; damage: number; element: Element; pierce: number }[] = [];

const partyEl = document.querySelector<HTMLDivElement>('#party')!;
const abilitiesEl = document.querySelector<HTMLDivElement>('#abilities')!;
const lootFeed = document.querySelector<HTMLDivElement>('#lootFeed')!;
const inventoryEl = document.querySelector<HTMLDivElement>('#inventory')!;

let worldMovementMultiplier = 1;
let worldJumpDisabled = false;
let worldDodgeDisabled = false;
let wasInDeepWater = false;
let environmentalDamageAccumulator = 0;

const waterStatus = document.createElement('div');
waterStatus.id = 'water-status';
waterStatus.hidden = true;
waterStatus.style.cssText = [
  'position:fixed',
  'top:18px',
  'left:50%',
  'transform:translateX(-50%)',
  'z-index:40',
  'padding:10px 16px',
  'border:1px solid rgba(255,255,255,.35)',
  'border-radius:8px',
  'background:rgba(10,20,34,.86)',
  'color:white',
  'font:600 14px system-ui,sans-serif',
  'pointer-events:none',
].join(';');
document.body.appendChild(waterStatus);

const movement = new PlayerMovementController(input, playerRoot, {
  canMove: () => !inventoryOpen && !gameOver,
  getMoveSpeed: () => active.speed * worldMovementMultiplier,
  canDodge: () =>
    active.cooldowns.dodge <= 0 &&
    !inventoryOpen &&
    !gameOver &&
    !worldDodgeDisabled,
  onDodgeStarted: (cooldown: number) => {
    active.cooldowns.dodge = cooldown;
    vfxRing(playerRoot.position, active.color, 2.8, 0.24);
  },
  onDodgeEnded: () => {
    vfxRing(playerRoot.position, active.color, 1.8, 0.16);
  },
  onLanded: () => {
    vfxRing(playerRoot.position, new Color3(0.72, 0.78, 0.86), 2.2, 0.22);
  },
});

const playerCamera = new PlayerCameraController(
  camera,
  playerRoot,
  () => movement.getVelocity(),
);
const movementDebug = new MovementDebugOverlay();
const damageNumbers = new DamageNumberManager(scene, camera, engine);
const hitFeedback = new HitFeedbackController(scene);
const enemyTelegraphs = new EnemyTelegraphController(scene);
const combat = new CombatSystem(damageNumbers, hitFeedback, playerCamera);

const partyManagement = new PartyManagementScreen(inventoryEl, {
  close: () => {
    inventoryOpen = false;
    partyManagement.setOpen(false);
  },
  equip: equipItemToCharacter,
  destroyItems: destroyLootItems,
  toggleFavorite: toggleFavoriteLoot,
  assignSkill: assignSkillSlot,
});

function equippedItems(c: CharacterState): LootItem[] {
  return Object.values(c.equipment).filter(
    (item): item is LootItem => Boolean(item),
  );
}

function powerFor(c = active): number {
  return 100 + equippedItems(c).reduce((sum, item) => sum + item.power, 0);
}

function attackFor(c = active): number {
  return Math.max(
    1,
    c.attackDamage +
      equippedItems(c).reduce((sum, item) => sum + item.attackBonus, 0),
  );
}

function hpMax(c: CharacterState): number {
  return Math.max(
    25,
    c.maxHp +
      equippedItems(c).reduce((sum, item) => sum + item.maxHpBonus, 0),
  );
}

function swapBonusFor(c: CharacterState): number {
  return equippedItems(c).reduce((sum, item) => sum + item.swapBonus, 0);
}

function hasLegendaryPower(c: CharacterState, text: string): boolean {
  return equippedItems(c).some(item =>
    item.legendaryPower?.toLowerCase().includes(text.toLowerCase()),
  );
}

function refreshHud(): void {
  partyEl.innerHTML = party.map((c, i) => `<div class="party-card ${i === activeIndex ? 'active' : ''}">
    <div class="party-line"><div><div class="party-name">${i === activeIndex ? 'CONTROL · ' : ''}${c.name}</div><div class="party-role">${c.role}</div></div><b>${Math.ceil(c.hp)}</b></div>
    <div class="hpbar"><div class="hpfill" style="width:${Math.max(0, c.hp / hpMax(c) * 100)}%"></div></div></div>`).join('');
  const skillName = (slot: AbilitySlot): string => {
    const skill = active.skillSlots[slot];
    if (skill === 'Q') return active.qName;
    if (skill === 'E') return active.eName;
    return 'Unassigned';
  };
  const skillCooldown = (slot: AbilitySlot): number => {
    const skill = active.skillSlots[slot];
    return skill ? active.cooldowns[skill] : 0;
  };
  abilitiesEl.innerHTML = [
    ['RMB', 'Basic', active.cooldowns.attack],
    ['1', skillName(1), skillCooldown(1)],
    ['2', skillName(2), skillCooldown(2)],
    ['3', skillName(3), skillCooldown(3)],
    ['4', skillName(4), skillCooldown(4)],
    ['R', 'Dodge', active.cooldowns.dodge],
    ['Space', 'Jump', 0],
  ].map(([key, name, cd]) => `<div class="ability"><kbd>${key}</kbd>${name}${Number(cd) > 0 ? `<div class="cooldown">${Number(cd).toFixed(1)}</div>` : ''}</div>`).join('');
  document.querySelector('#wave')!.textContent = String(wave);
  document.querySelector('#kills')!.textContent = String(kills);
  document.querySelector('#power')!.textContent = String(powerFor());
  renderPartyManagement();
}

function partyManagementModel(): PartyManagementModel {
  return {
    characters: party.map(character => ({
      id: character.id,
      name: character.name,
      role: character.role,
      preferredFamily: character.preferredFamily,
      hp: character.hp,
      maxHp: hpMax(character),
      controlled: character.id === active.id,
      equipment: character.equipment,
      skills: [
        { id: 'Q', name: character.qName },
        { id: 'E', name: character.eName },
      ],
      skillSlots: character.skillSlots,
      summary: {
        power: Math.min(100, 35 + attackFor(character) * 1.6),
        defense: Math.min(100, 25 + hpMax(character) * 0.28 + (character.preferredFamily === 'fortified' ? 22 : 0)),
        mobility: Math.min(100, character.speed * 8 + equippedItems(character).reduce((sum, item) => sum + item.technique, 0)),
        support: Math.min(100, 18 + equippedItems(character).reduce((sum, item) => sum + item.focus * 2, 0) + (character.id === 'warden' ? 35 : 0)),
      },
    })),
    items: loot,
  };
}

function renderPartyManagement(): void {
  partyManagement.render(partyManagementModel());
}

function equipItemToCharacter(itemId: number, characterId: string): void {
  const item = loot.find(candidate => candidate.id === itemId);
  const character = party.find(candidate => candidate.id === characterId);
  if (!item || !character) return;

  for (const member of party) {
    for (const slot of ['weapon', 'armor', 'relic'] as ItemSlot[]) {
      if (member.equipment[slot]?.id === item.id) delete member.equipment[slot];
    }
  }

  const priorMax = hpMax(character);
  character.equipment[item.slot] = item;
  character.hp = Math.min(hpMax(character), character.hp + Math.max(0, hpMax(character) - priorMax));
  feed(`${character.name} equipped ${item.name}.`);
  refreshHud();
}

function destroyLootItems(itemIds: number[]): void {
  const equippedIds = new Set(
    party.flatMap(character =>
      equippedItems(character).map(item => item.id),
    ),
  );
  const destroyable = new Set(
    itemIds.filter(itemId => {
      const item = loot.find(candidate => candidate.id === itemId);
      return !equippedIds.has(itemId) && !item?.favorite;
    }),
  );

  if (destroyable.size === 0) {
    feed('No selected items could be destroyed.');
    return;
  }

  loot = loot.filter(item => !destroyable.has(item.id));
  feed(`Destroyed ${destroyable.size} item${destroyable.size === 1 ? '' : 's'}.`);
  renderPartyManagement();
}

function toggleFavoriteLoot(itemId: number): void {
  const item = loot.find(candidate => candidate.id === itemId);
  if (!item) return;
  item.favorite = !item.favorite;
  feed(`${item.favorite ? 'Favorited' : 'Unfavorited'} ${item.name}.`);
  renderPartyManagement();
}

function assignSkillSlot(
  characterId: string,
  slot: AbilitySlot,
  skillId: SkillKey | null,
): void {
  const character = party.find(candidate => candidate.id === characterId);
  if (!character) return;

  if (skillId === null) {
    delete character.skillSlots[slot];
  } else {
    for (const existingSlot of [1, 2, 3, 4] as AbilitySlot[]) {
      if (character.skillSlots[existingSlot] === skillId) {
        delete character.skillSlots[existingSlot];
      }
    }
    character.skillSlots[slot] = skillId;
  }

  feed(`${character.name} skill slot ${slot} updated.`);
  refreshHud();
}
function feed(text: string): void {
  const line = document.createElement('div');
  line.className = 'loot-line';
  line.textContent = text;
  lootFeed.prepend(line);
  setTimeout(() => line.remove(), 4200);
}

function vfxRing(pos: Vector3, color: Color3, size = 2, ttl = 0.35): Mesh {
  const ring = MeshBuilder.CreateTorus('ring', { diameter: size, thickness: 0.09, tessellation: 32 }, scene);
  ring.position = pos.clone(); ring.position.y = 0.12; ring.rotation.x = Math.PI / 2;
  ring.material = mat('ring', color, 0.75);
  const start = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - start) / (ttl * 1000);
    ring.scaling.setAll(1 + t * 1.2);
    ring.visibility = 1 - t;
    if (t >= 1) { scene.onBeforeRenderObservable.remove(observer); ring.dispose(); }
  });
  return ring;
}

function spawnEnemy(elite = false, spawnPosition?: Vector3): void {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 4;
  const mesh = elite
    ? MeshBuilder.CreateIcoSphere('elite', { radius: 0.95, subdivisions: 2 }, scene)
    : MeshBuilder.CreateCapsule('enemy', { height: 1.5, radius: 0.46 }, scene);
  if (spawnPosition) {
    mesh.position.set(
      spawnPosition.x,
      elite ? 0.95 : 0.75,
      spawnPosition.z,
    );
  } else {
    mesh.position.set(
      Math.cos(angle) * radius,
      elite ? 0.95 : 0.75,
      Math.sin(angle) * radius,
    );
  }
  mesh.material = mat(elite ? 'elite' : 'enemy', elite ? new Color3(0.68, 0.2, 0.58) : new Color3(0.34, 0.5, 0.34), elite ? 0.2 : 0.03);
  shadows.addShadowCaster(mesh);
  const hp = (elite ? 280 : 58) * (1 + (wave - 1) * 0.18);
  enemies.push({ mesh, hp, maxHp: hp, speed: elite ? 2.1 : 2.65 + Math.random() * 0.7, damage: (elite ? 19 : 8) * (1 + wave * 0.08), elite, attackCd: Math.random(), statuses: {}, knockbackVelocity: Vector3.Zero() });
}

function startWave(): void {
  if (!developerState.wavesEnabled) return;
  const count = Math.min(6 + wave * 2, 24);
  for (let i = 0; i < count; i++) setTimeout(() => spawnEnemy(false), i * 170);
  if (wave % 2 === 0) setTimeout(() => spawnEnemy(true), 500);
  feed(`Wave ${wave}: ${count}${wave % 2 === 0 ? ' plus an elite' : ''}.`);
}
startWave();

function damageEnemy(
  enemy: Enemy,
  amount: number,
  element: Element,
  hitPos = enemy.mesh.position,
  sourcePosition = playerRoot.position,
  weight: HitWeight = 'light',
): void {
  const powerScale = powerFor() / 100;
  let final = amount * powerScale;
  let resolvedWeight = weight;

  if (element === 'physical' && (enemy.statuses.frost ?? 0) > 0) {
    final *= 1.65;
    enemy.statuses.frost = 0;
    resolvedWeight = 'reaction';
    vfxRing(hitPos, new Color3(0.65, 0.9, 1), 2.4);
    combat.showReaction(hitPos, 'SHATTER', 'frost');
    feed('SHATTER!');
  }

  if (element === 'lightning' && (enemy.statuses.frost ?? 0) > 0) {
    final *= 1.35;
    resolvedWeight = 'reaction';
    const nearby = enemies.filter(e => e !== enemy && Vector3.Distance(e.mesh.position, enemy.mesh.position) < 5).slice(0, 2);
    nearby.forEach(e => {
      const chainDamage = final * 0.45;
      e.hp -= chainDamage;
      combat.applyEnemyHit({ target: e, damage: chainDamage, element: 'lightning', worldPosition: e.mesh.position, sourcePosition: enemy.mesh.position, weight: 'light' });
      vfxRing(e.mesh.position, active.color, 1.1, 0.2);
    });
  }

  enemy.hp -= final;
  if (element !== 'physical') enemy.statuses[element] = 3.5;
  combat.applyEnemyHit({ target: enemy, damage: final, element, worldPosition: hitPos, sourcePosition, weight: resolvedWeight });
}
function basicAttack(): void {
  if (active.cooldowns.attack > 0 || inventoryOpen || gameOver) return;
  active.cooldowns.attack = active.attackCooldown;
  const dir = pointerWorld.subtract(playerRoot.position); dir.y = 0;
  if (dir.lengthSquared() < 0.01) return;
  dir.normalize();
  if (active.attackRange < 4) {
    vfxRing(playerRoot.position.add(dir.scale(1.3)), active.color, active.attackRange * 1.15, 0.23);
    enemies.filter(e => Vector3.Distance(e.mesh.position, playerRoot.position.add(dir.scale(1.1))) < active.attackRange).forEach(e => damageEnemy(e, attackFor(), active.element));
  } else {
    const orb = MeshBuilder.CreateSphere('projectile', { diameter: 0.36 }, scene);
    orb.position = playerRoot.position.add(new Vector3(0, 0.8, 0)).add(dir.scale(0.8));
    orb.material = mat('projectile', active.color, 0.8);
    projectiles.push({ mesh: orb, vel: dir.scale(15), ttl: 1.0, damage: attackFor(), element: active.element, pierce: 0 });
  }
}

function performBlink(
  requestedDestination: Vector3,
  maximumDistance = 8.5,
): Vector3 {
  const start = playerRoot.position.clone();
  start.y = 0;

  traversalSurfaces.releaseForBlink();

  const blink = worldCollision.resolveBlink(
    start,
    requestedDestination,
    maximumDistance,
  );

  playerRoot.position.copyFrom(blink.position);
  movement.resetVerticalState(blink.position.y);
  movement.setPointerWorld(blink.position);
  pointerWorld.copyFrom(blink.position);

  vfxRing(start, active.color, 1.4, 0.14);
  vfxRing(blink.position, active.color, 2.4, 0.22);

  if (blink.blockedBySolid) {
    feed('Blink stopped by solid terrain.');
  } else if (!blink.reachedRequestedDestination) {
    feed('Blink shortened to the last safe landing point.');
  }

  return blink.position;
}

function castSkill(key: SkillKey): void {
  if (active.cooldowns[key] > 0 || inventoryOpen || gameOver) return;
  const dir = pointerWorld.subtract(playerRoot.position);
  dir.y = 0;
  if (dir.lengthSquared() > 0.0001) dir.normalize();
  if (active.id === 'vanguard' && key === 'Q') {
    active.cooldowns.Q = 5;
    vfxRing(playerRoot.position, active.color, 7, 0.45);
    enemies.filter(e => Vector3.Distance(e.mesh.position, playerRoot.position) < 4).forEach(e => damageEnemy(e, 52, 'physical', e.mesh.position, playerRoot.position, 'heavy'));
  } else if (active.id === 'vanguard') {
    active.cooldowns.E = 8;
    party.forEach(c => c.cooldowns.attack = 0);
    active.hp = Math.min(hpMax(active), active.hp + 28);
    feed('War Cry refreshed attacks and restored health.');
  } else if (active.id === 'warden' && key === 'Q') {
    active.cooldowns.Q = 7;
    const field = MeshBuilder.CreateCylinder('frostField', { diameter: 6.5, height: 0.08, tessellation: 48 }, scene);
    field.position = pointerWorld.clone(); field.position.y = 0.06;
    field.material = mat('frostField', active.color, 0.32); field.visibility = 0.55;
    effects.push({ mesh: field, ttl: 6, tick: 0, type: 'frost', radius: 3.25, damage: 8 });
  } else if (active.id === 'warden') {
    active.cooldowns.E = 10;
    party.forEach(c => c.hp = Math.min(hpMax(c), c.hp + 22));
    vfxRing(playerRoot.position, active.color, 4.5, 0.55);
  } else if (active.id === 'tempest' && key === 'Q') {
    active.cooldowns.Q = 5.5;
    const targets = [...enemies].sort((a,b) => Vector3.Distance(a.mesh.position, playerRoot.position) - Vector3.Distance(b.mesh.position, playerRoot.position)).slice(0,4);
    targets.forEach((e, i) => setTimeout(() => damageEnemy(e, 34, 'lightning'), i * 90));
    vfxRing(playerRoot.position, active.color, 5, 0.3);
  } else if (active.id === 'tempest') {
    active.cooldowns.E = 6;

    const target = [...enemies]
      .filter(
        enemy =>
          Vector3.Distance(
            enemy.mesh.position,
            playerRoot.position,
          ) < 10,
      )
      .sort(
        (a, b) =>
          Vector3.Distance(a.mesh.position, pointerWorld) -
          Vector3.Distance(b.mesh.position, pointerWorld),
      )[0];

    const requestedDestination = target
      ? target.mesh.position.add(dir.scale(-1.1))
      : pointerWorld.clone();
    requestedDestination.y = 0;

    const blinkDestination = performBlink(
      requestedDestination,
      8.5,
    );

    if (
      target &&
      Vector3.Distance(
        target.mesh.position,
        blinkDestination,
      ) <= 2.4
    ) {
      damageEnemy(
        target,
        48,
        'lightning',
        target.mesh.position,
        blinkDestination,
        'heavy',
      );
      vfxRing(
        target.mesh.position,
        active.color,
        2.8,
        0.25,
      );
    }
  }
  refreshHud();
}

function swapTo(index: number): void {
  if (index === activeIndex || index < 0 || index >= party.length || inventoryOpen || gameOver) return;
  if (party[index].hp <= 0 || active.cooldowns.swap > 0) return;
  const prior = active;
  activeIndex = index; active = party[index];
  active.cooldowns.swap = 0.42;
  playerBody.material = mat('player', active.color, 0.08);
  vfxRing(playerRoot.position, active.color, 3.5, 0.35);
  const swapMult = 1 + swapBonusFor(active) / 100;
  enemies.filter(e => Vector3.Distance(e.mesh.position, playerRoot.position) < 2.7).forEach(e => damageEnemy(e, 22 * swapMult, active.element, e.mesh.position, playerRoot.position, 'heavy'));
  if (hasLegendaryPower(prior, 'frost trail')) {
    const field = MeshBuilder.CreateCylinder('trail', { diameter: 4.5, height: 0.05 }, scene);
    field.position = playerRoot.position.clone(); field.position.y = 0.04; field.material = mat('trail', new Color3(0.3,0.8,1),0.3); field.visibility = 0.45;
    effects.push({ mesh: field, ttl: 3.5, tick: 0, type: 'frost', radius: 2.25, damage: 5 });
  }
  feed(`${active.name} swapped in.`);
  refreshHud();
}

function castAbilitySlot(slot: AbilitySlot): void {
  const skill = active.skillSlots[slot];
  if (skill) castSkill(skill);
  else feed(`Ability slot ${slot} is not assigned yet.`);
}

function cycleControl(direction: 1 | -1): void {
  if (party.length <= 1 || swapInputCooldown > 0 || inventoryOpen || gameOver) return;
  for (let step = 1; step <= party.length; step++) {
    const candidate = (activeIndex + direction * step + party.length) % party.length;
    if (party[candidate].hp > 0) { swapTo(candidate); swapInputCooldown = 0.15; return; }
  }
}

function generateLoot(elite: boolean, forcedRarity?: Rarity): void {
  if (!forcedRarity && !elite && Math.random() > 0.42) return;
  const roll = Math.random();
  const rarity: Rarity = forcedRarity ?? (elite && roll > 0.55 ? 'legendary' : roll > 0.72 ? 'rare' : roll > 0.35 ? 'magic' : 'common');
  const power = ({ common: 6, magic: 12, rare: 20, legendary: 30 }[rarity]) + Math.floor(Math.random() * 8) + wave * 2;
  const prefixes = ['Jagged', 'Runed', 'Stormbound', 'Glacial', 'Astral', 'Bloodforged'];
  const bases = ['Loop', 'Sigil', 'Blade', 'Charm', 'Crest', 'Relic'];
  const families: ItemFamily[] = ['fortified', 'agile', 'focused'];
  const slots: ItemSlot[] = ['weapon', 'armor', 'relic'];
  const family = families[Math.floor(Math.random() * families.length)];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const item: LootItem = {
    id: lootId++,
    name: `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${bases[Math.floor(Math.random() * bases.length)]}`,
    rarity,
    power,
    attackBonus:
      family === 'agile'
        ? Math.floor(power * 0.62)
        : family === 'focused'
          ? Math.floor(power * 0.24)
          : Math.floor(power * 0.18),
    maxHpBonus:
      family === 'fortified'
        ? Math.floor(power * 1.75)
        : family === 'agile'
          ? -Math.floor(power * 0.42)
          : -Math.floor(power * 0.2),
    swapBonus:
      rarity === 'common'
        ? 0
        : family === 'agile'
          ? Math.floor(power * 0.58)
          : Math.floor(power * 0.28),
    family,
    slot,
    focus:
      family === 'focused'
        ? Math.floor(power * 0.56)
        : family === 'fortified'
          ? Math.floor(power * 0.22)
          : -Math.floor(power * 0.08),
    precision:
      family === 'agile'
        ? Math.floor(power * 0.52)
        : family === 'focused'
          ? Math.floor(power * 0.24)
          : -Math.floor(power * 0.08),
    favorite: false,
    technique:
      family === 'focused'
        ? Math.floor(power * 0.48)
        : family === 'agile'
          ? Math.floor(power * 0.22)
          : -Math.floor(power * 0.18),
  };
  if (rarity === 'legendary') item.legendaryPower = Math.random() > .5 ? 'Swapping out leaves a frost trail.' : 'Swap attacks deal greatly increased damage.';
  loot.unshift(item);
  feed(`${rarity.toUpperCase()} DROP: ${item.name}`);
  renderPartyManagement();
}

function killEnemy(enemy: Enemy): void {
  enemyTelegraphs.cancel(enemy.mesh);
  kills++;
  generateLoot(enemy.elite);
  vfxRing(enemy.mesh.position, enemy.elite ? new Color3(1,.35,.7) : new Color3(.5,1,.5), enemy.elite ? 4 : 2, .35);
  enemy.mesh.dispose();
  enemies = enemies.filter(e => e !== enemy);
  if (enemies.length === 0) {
    wave++;
    party.forEach(c => c.hp = Math.min(hpMax(c), c.hp + hpMax(c) * .22));
    setTimeout(startWave, 1500);
  }
  refreshHud();
}

function hurtActive(
  amount: number,
  bypassHitProtection = false,
): void {
  if (developerState.godMode) return;
  if (!bypassHitProtection && movement.isInvulnerable()) return;
  if (!bypassHitProtection && !combat.registerPlayerHit()) return;
  active.hp -= amount;
  vfxRing(playerRoot.position, new Color3(1,.12,.12), 1.5, .16);
  if (active.hp <= 0) {
    active.hp = 0;
    const next = party.findIndex((c, i) => i !== activeIndex && c.hp > 0);
    if (next >= 0) swapTo(next); else endGame();
  }
  refreshHud();
}

function endGame(): void {
  gameOver = true;
  document.querySelector('#gameOver')!.classList.remove('hidden');
  document.querySelector('#finalScore')!.textContent = `You reached wave ${wave} with ${kills} kills and found ${loot.length} items.`;
}

const developerActions: DeveloperActions = {
  restorePartyHealth: () => {
    party.forEach(character => {
      character.hp = hpMax(character);
    });
    refreshHud();
    feed('Developer: party health restored.');
  },

  resetCooldowns: () => {
    party.forEach(character => {
      Object.keys(character.cooldowns).forEach(key => {
        character.cooldowns[key as keyof typeof character.cooldowns] = 0;
      });
    });
    refreshHud();
    feed('Developer: cooldowns reset.');
  },

  spawnEnemy: (elite: boolean) => {
    spawnEnemy(elite);
    feed(`Developer: spawned ${elite ? 'elite' : 'enemy'}.`);
  },

  killAllEnemies: () => {
    for (const enemy of [...enemies]) {
      enemyTelegraphs.cancel(enemy.mesh);
      enemy.mesh.dispose();
    }
    enemies = [];
    refreshHud();
    feed('Developer: all enemies removed.');
  },

  startNextWave: () => {
    if (scheduledWave !== null) {
      clearTimeout(scheduledWave);
      scheduledWave = null;
    }
    wave++;
    startWave();
    refreshHud();
  },

  spawnLoot: (rarity: Rarity) => {
    generateLoot(rarity === 'legendary', rarity);
  },

  clearInventory: () => {
    loot = [];
    renderPartyManagement();
    feed('Developer: inventory cleared.');
  },

  teleportToLandmark: (landmarkId: string) => {
    const landmark = outdoorZone.landmarks.find(
      candidate => candidate.id === landmarkId,
    );
    if (!landmark) return;

    traversalSurfaces.reset();
    worldVolumes.reset();
    playerRoot.position.copyFrom(landmark.position);
    movement.resetVerticalState(landmark.position.y);
    movement.setPointerWorld(landmark.position);
    pointerWorld.copyFrom(landmark.position);
    feed(`Developer: teleported to ${landmark.label}.`);
  },

  setWorldCollision: (enabled: boolean) => {
    worldCollision.enabled = enabled;
    feed(`Developer: world collision ${enabled ? 'enabled' : 'disabled'}.`);
  },

  setTraversalHighlightsVisible: (visible: boolean) => {
    outdoorZone.setTraversalHighlightVisible(visible);
  },

  setWorldVolumeHighlightsVisible: (visible: boolean) => {
    worldVolumes.setDebugVisible(visible);
  },

  getStatus: () => ({
    wave,
    enemies: enemies.length,
    loot: loot.length,
    activeCharacter: active.name,
  }),
};

const developerConsole = new DeveloperConsole(
  developerState,
  developerActions,
);

function updatePointerWorldFromCursor(): boolean {
  const pick = scene.pick(
    scene.pointerX,
    scene.pointerY,
    (mesh: any) => mesh === ground,
  );

  if (!pick?.hit || !pick.pickedPoint) return false;

  pointerWorld.copyFrom(pick.pickedPoint);
  movement.setPointerWorld(pick.pickedPoint);
  return true;
}

scene.onPointerObservable.add((pi: any) => {
  if (pi.type === PointerEventTypes.POINTERDOWN) {
    input.notifyPointerDown(pi.event.button);

    if (pi.event.button === 0) {
      canvas.setPointerCapture?.(pi.event.pointerId);
      if (updatePointerWorldFromCursor()) {
        movement.beginPointerMovement(pointerWorld);
      }
    }

    if (pi.event.button === 2) pi.event.preventDefault();
  }

  if (pi.type === PointerEventTypes.POINTERUP) {
    input.notifyPointerUp(pi.event.button);
    if (pi.event.button === 0) {
      movement.endPointerMovement();
      if (canvas.hasPointerCapture?.(pi.event.pointerId)) {
        canvas.releasePointerCapture(pi.event.pointerId);
      }
    }
  }

  if (pi.type === PointerEventTypes.POINTERMOVE) {
    updatePointerWorldFromCursor();
  }

  if (pi.type === PointerEventTypes.POINTERWHEEL) input.notifyWheel(pi.event.deltaY);
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && developerConsole.isOpen()) {
    event.preventDefault();
    developerConsole.close();
  }
});
document.querySelector('#closeInventory')?.addEventListener('click', () => {
  inventoryOpen = false;
  partyManagement.setOpen(false);
});
document.querySelector('#restart')!.addEventListener('click', () => location.reload());

let last = performance.now();
scene.onBeforeRenderObservable.add(() => {
  const now = performance.now();
  const realDt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const dt = combat.update(realDt);
  enemyTelegraphs.update(realDt);
  if (input.consumePressed('toggleDeveloperConsole')) {
    developerConsole.toggle();
  }

  if (developerConsole.isOpen()) {
    combat.hitStopEnabled = developerState.hitStopEnabled;
    combat.damageNumbersEnabled = developerState.damageNumbersEnabled;
    combat.knockbackEnabled = developerState.knockbackEnabled;
    combat.cameraShakeEnabled = developerState.cameraShakeEnabled;
    combat.playerFeedbackEnabled = developerState.playerDamageFeedbackEnabled;
    movementDebug.setVisible(developerState.movementDebugEnabled);
    input.endFrame();
    return;
  }

  if (inventoryOpen || gameOver) { input.endFrame(); return; }

  if (input.consumePressed('toggleInventory')) {
    inventoryOpen = !inventoryOpen;
    partyManagement.setOpen(inventoryOpen);
    renderPartyManagement();
  }
  if (input.consumePressed('dodge')) movement.requestDodge();
  if (input.consumePressed('jump') && !worldJumpDisabled) {
    movement.requestJump();
  }
  if (input.consumePressed('ability1')) castAbilitySlot(1);
  if (input.consumePressed('ability2')) castAbilitySlot(2);
  if (input.consumePressed('ability3')) castAbilitySlot(3);
  if (input.consumePressed('ability4')) castAbilitySlot(4);
  if (input.consumePressed('partyNext')) cycleControl(1);
  if (input.consumePressed('partyPrevious')) cycleControl(-1);
  const wheelDirection = input.consumeWheelDirection();
  if (wheelDirection !== 0) cycleControl(wheelDirection);
  if (input.consumePointerPressed('right') || input.isPointerHeld('right')) basicAttack();

  // Repick every frame while held. This keeps steering responsive even when
  // the browser coalesces pointer-move events or the cursor moves across VFX.
  if (input.isPointerHeld('left')) updatePointerWorldFromCursor();

  outdoorZone.update(dt);

  // A moving support contributes its own frame motion before player input.
  // Collision resolves that inherited motion; support never corrects X/Z.
  const inheritedSurfaceDelta =
    traversalSurfaces.getCurrentSupportDelta();
  if (
    Math.abs(inheritedSurfaceDelta.x) > 0.000001 ||
    Math.abs(inheritedSurfaceDelta.z) > 0.000001
  ) {
    const inheritedTarget = playerRoot.position.add(
      new Vector3(
        inheritedSurfaceDelta.x,
        0,
        inheritedSurfaceDelta.z,
      ),
    );
    const inheritedResolved =
      worldCollision.resolvePosition(
        playerRoot.position,
        inheritedTarget,
      );
    playerRoot.position.x = inheritedResolved.x;
    playerRoot.position.z = inheritedResolved.z;
  }

  const dynamicResolution = dynamicCollision.resolve(
    playerRoot.position,
    movement.getSupportHeight(),
  );
  playerRoot.position.copyFrom(dynamicResolution.position);
  if (
    dynamicResolution.pushedVertically &&
    dynamicResolution.supportHeight !== null
  ) {
    movement.resetVerticalState(dynamicResolution.supportHeight);
  }

  const positionBeforeMovement = playerRoot.position.clone();
  movement.update(dt);

  const movementPosition = playerRoot.position.clone();

  // Step-up is resolved before horizontal collision rejects a legal low
  // obstacle. This represents the walkable top separately from its side faces.
  const stepUpCandidate =
    traversalSurfaces.queryStepUp(
      positionBeforeMovement,
      movementPosition,
      movement.isGrounded(),
      movement.getSupportHeight(),
    );

  const preliminarySupport =
    traversalSurfaces.querySupport(
      positionBeforeMovement,
      movementPosition,
      movement.isGrounded(),
      movement.getVerticalVelocity(),
      movement.getSupportHeight(),
    );

  const horizontalIgnoredLabels = new Set(
    preliminarySupport.ignoredColliderLabels,
  );
  if (stepUpCandidate) {
    horizontalIgnoredLabels.add(
      stepUpCandidate.colliderLabel,
    );
  }

  const resolvedPosition = worldCollision.resolvePosition(
    positionBeforeMovement,
    movementPosition,
    horizontalIgnoredLabels,
  );

  playerRoot.position.x = resolvedPosition.x;
  playerRoot.position.z = resolvedPosition.z;
  playerRoot.position.y = movementPosition.y;

  // Final support is sampled from the collision-resolved X/Z. It can only
  // provide Y support and cannot move the character horizontally.
  const traversalResolution =
    traversalSurfaces.querySupport(
      positionBeforeMovement,
      playerRoot.position,
      movement.isGrounded(),
      movement.getVerticalVelocity(),
      movement.getSupportHeight(),
    );

  const resolvedSupportHeight =
    traversalResolution.surfaceId !== null
      ? traversalResolution.supportHeight
      : stepUpCandidate?.supportHeight ??
        traversalResolution.supportHeight;

  movement.setSupportHeight(
    resolvedSupportHeight,
    Math.abs(traversalResolution.surfaceDelta.y) > 0.00001,
    dt,
  );
  movement.reconcileSupportHeight();

  const volumeResult = worldVolumes.update(
    positionBeforeMovement,
    playerRoot.position,
    movement.getSupportHeight(),
    dt,
  );

  playerRoot.position.x = volumeResult.position.x;
  playerRoot.position.z = volumeResult.position.z;
  worldMovementMultiplier = volumeResult.speedMultiplier;
  worldJumpDisabled = volumeResult.disableJump;
  worldDodgeDisabled = volumeResult.disableDodge;

  environmentalDamageAccumulator += volumeResult.damageAmount;
  if (environmentalDamageAccumulator >= 1) {
    const environmentalDamage = Math.floor(
      environmentalDamageAccumulator,
    );
    environmentalDamageAccumulator -= environmentalDamage;
    hurtActive(environmentalDamage, true);
  }

  for (const eventId of volumeResult.triggerEvents) {
    feed(`Trigger volume: ${eventId}.`);
  }

  for (const request of volumeResult.spawnRequests) {
    for (let index = 0; index < request.count; index++) {
      const offset = new Vector3(
        (index - (request.count - 1) / 2) * 1.6,
        0,
        2.5,
      );
      spawnEnemy(
        request.spawnType === 'elite',
        request.position.add(offset),
      );
    }
    feed(`Spawn volume: ${request.spawnId}.`);
  }

  for (const message of volumeResult.constraintMessages) {
    feed(message);
  }

  if (volumeResult.inDeepWater) {
    waterStatus.hidden = false;
    waterStatus.textContent =
      `Deep water — return to the entry bank · ${Math.max(
        0,
        volumeResult.drownRemaining ?? 0,
      ).toFixed(1)}s`;

    if (!wasInDeepWater) {
      feed('Deep water: return to the bank before you drown.');
    }
  } else {
    waterStatus.hidden = true;
  }

  if (volumeResult.drowned) {
    playerRoot.position.copyFrom(volumeResult.position);
    movement.resetVerticalState(0);
    feed('You drowned and were returned to the entry bank.');
    hurtActive(hpMax(active) + 999);
    worldVolumes.reset();
  }

  wasInDeepWater = volumeResult.inDeepWater;

  const face = pointerWorld.subtract(playerRoot.position); face.y = 0;
  if (face.lengthSquared() > .01) playerRoot.rotation.y = Math.atan2(face.x, face.z);
  playerCamera.update(dt);
  movementDebug.update(dt, engine.getFps(), movement.getDebugState());
  swapInputCooldown = Math.max(0, swapInputCooldown - dt);

  party.forEach(c => Object.keys(c.cooldowns).forEach(k => c.cooldowns[k as keyof typeof c.cooldowns] = developerState.noCooldowns ? 0 : Math.max(0, c.cooldowns[k as keyof typeof c.cooldowns] - dt)));

  for (const p of [...projectiles]) {
    p.mesh.position.addInPlace(p.vel.scale(dt)); p.ttl -= dt;
    const hit = enemies.find(e => Vector3.Distance(e.mesh.position, p.mesh.position) < 0.8);
    if (hit) { damageEnemy(hit, p.damage, p.element, hit.mesh.position, p.mesh.position.subtract(p.vel), p.damage >= 40 ? 'heavy' : 'light'); vfxRing(hit.mesh.position, active.color, 1.35, 0.16); p.pierce--; if (p.pierce < 0) p.ttl = 0; }
    if (p.ttl <= 0) { p.mesh.dispose(); projectiles.splice(projectiles.indexOf(p), 1); }
  }

  for (const fx of [...effects]) {
    fx.ttl -= dt; fx.tick -= dt;
    if (fx.tick <= 0) {
      fx.tick = .5;
      enemies.filter(e => Vector3.Distance(e.mesh.position, fx.mesh.position) < fx.radius).forEach(e => {
        damageEnemy(e, fx.damage, fx.type);
        if (fx.type === 'arcane') {
          const pull = fx.mesh.position.subtract(e.mesh.position); pull.y = 0; if (pull.lengthSquared() > 0.0001) pull.normalize(); e.mesh.position.addInPlace(pull.scale(.32));
        }
      });
    }
    fx.mesh.rotation.y += dt;
    if (fx.ttl <= 0) { fx.mesh.dispose(); effects.splice(effects.indexOf(fx), 1); }
  }

  combat.hitStopEnabled = developerState.hitStopEnabled;
  combat.damageNumbersEnabled = developerState.damageNumbersEnabled;
  combat.knockbackEnabled = developerState.knockbackEnabled;
  combat.cameraShakeEnabled = developerState.cameraShakeEnabled;
  combat.playerFeedbackEnabled = developerState.playerDamageFeedbackEnabled;
  movementDebug.setVisible(developerState.movementDebugEnabled);
  worldCollision.enabled = developerState.worldCollisionEnabled;
  outdoorZone.setTraversalHighlightVisible(
    developerState.traversalHighlightsVisible,
  );
  worldVolumes.setDebugVisible(
    developerState.worldVolumeHighlightsVisible,
  );

  enemies.forEach(e => {
    combat.updateKnockback(e, dt);
    Object.keys(e.statuses).forEach(k => e.statuses[k as Element] = Math.max(0, (e.statuses[k as Element] ?? 0) - dt));
    const toPlayer = playerRoot.position.subtract(e.mesh.position); toPlayer.y = 0;
    const dist = toPlayer.length();
    e.attackCd -= dt;
    if (!developerState.enemyAiEnabled) return;

    if (dist > GameBalance.combat.enemyAttackRange) {
      if (!enemyTelegraphs.isBusy(e.mesh)) e.mesh.position.addInPlace(toPlayer.normalize().scale(e.speed * dt * ((e.statuses.frost ?? 0) > 0 ? .58 : 1)));
    } else if (e.attackCd <= 0 && !enemyTelegraphs.isBusy(e.mesh)) {
      enemyTelegraphs.begin(e.mesh, e.elite, () => {
        const strikeDistance = Vector3.Distance(e.mesh.position, playerRoot.position);
        if (strikeDistance <= GameBalance.combat.enemyAttackRange + (e.elite ? 0.8 : 0.35)) hurtActive(e.damage);
        e.attackCd = e.elite ? 1.15 : 1.55;
      });
    }
  });
  [...enemies].filter(e => e.hp <= 0).forEach(killEnemy);

  const elite = enemies.find(e => e.elite);
  const bossWrap = document.querySelector('#bossBar')!;
  bossWrap.classList.toggle('hidden', !elite);
  if (elite) (document.querySelector('#bossFill') as HTMLElement).style.width = `${Math.max(0, elite.hp / elite.maxHp * 100)}%`;

  if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) refreshHud();
  input.endFrame();
});

partyManagement.setOpen(false);
refreshHud();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
window.addEventListener('beforeunload', () => {
  input.dispose();
  movementDebug.dispose();
  damageNumbers.dispose();
  hitFeedback.dispose();
  enemyTelegraphs.dispose();
  waterStatus.remove();
});
