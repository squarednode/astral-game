import './style.css';
import './devtools/DeveloperConsole.css';
import './ui/party/PartyManagementScreen.css';
import './ui/UIManager.css';
import './ui/developer/DeveloperHud.css';
import './ui/gameplay/GameplayHud.css';
import './ui/menus/SettingsMenu.css';
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
import { SettingsManager } from './engine/settings';
import { EventBus } from './engine/events';
import { StateMachine } from './engine/state';
import { AssetRegistry } from './engine/assets';
import { DefinitionRegistry } from './engine/definitions';
import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  characterDefinitions,
  validateCharacterDefinition,
  ABILITY_DEFINITION_SCHEMA_VERSION,
  abilityDefinitions,
  validateAbilityDefinition,
  COMBAT_LIBRARY_SCHEMA_VERSION,
  projectileDefinitions,
  statusEffectDefinitions,
  telegraphDefinitions,
  damageProfileDefinitions,
  combatTagDefinitions,
  aiAbilityUsageDefinitions,
  validateProjectileDefinition,
  validateStatusEffectDefinition,
  validateTelegraphDefinition,
  validateDamageProfileDefinition,
  validateCombatTagDefinition,
  validateAiAbilityUsageDefinition,
  validateCombatLibraryReferences,
  ENEMY_DEFINITION_SCHEMA_VERSION,
  enemyDefinitions,
  enemyFamilyDefinitions,
  enemyVariantDefinitions,
  eliteModifierDefinitions,
  validateEnemyDefinition,
  validateEnemyFamilyDefinition,
  validateEnemyVariantDefinition,
  validateEliteModifierDefinition,
} from './game/definitions';
import type {
  CharacterDefinition,
  CharacterElement,
  AbilityDefinition,
  ProjectileDefinition,
  StatusEffectDefinition,
  TelegraphDefinition,
  DamageProfileDefinition,
  CombatTagDefinition,
  AiAbilityUsageDefinition,
  EnemyDefinition,
  EnemyFamilyDefinition,
  EnemyVariantDefinition,
  EliteModifierDefinition,
  EnemyCombatRole,
  EnemyMovementStyle,
  EnemyVariantId,
  EliteModifierId,
} from './game/definitions';
import { AbilityComponent, AbilityRuntime } from './game/abilities';
import { EnemyRuntimeWatchdog, EnemyTacticalController } from './game/enemies/runtime';
import type { EnemyRuntimeActor } from './game/enemies/runtime';
import type { AbilityExecutionContext, AbilityRuntimeSnapshot } from './game/abilities';
import { PlayerMovementController } from './game/movement/PlayerMovementController';
import { PlayerCameraController } from './game/camera/PlayerCameraController';
import { MovementDebugOverlay } from './ui/debug/MovementDebugOverlay';
import { UIManager } from './ui/core/UIManager';
import { DeveloperHud } from './ui/developer/DeveloperHud';
import { AbilityDeveloperPanel } from './ui/developer/AbilityDeveloperPanel';
import { CombatLibraryPanel } from './ui/developer/CombatLibraryPanel';
import { GameplayHud } from './ui/gameplay';
import { SettingsMenu } from './ui/menus';
import type { GameplayHudSnapshot } from './ui/gameplay';
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
import {
  EntityComponentKeys,
  EntityRegistry,
} from './engine/entity';
import type {
  EnemyComponent,
  HealthComponent,
  MetadataComponent,
  TransformComponent,
} from './engine/entity';
import type {
  GearFamily,
  GearSlot,
  PartyManagementModel,
} from './ui/party/PartyManagementTypes';

type Element = CharacterElement;
type Rarity = 'common' | 'magic' | 'rare' | 'legendary';
type ItemFamily = GearFamily;
type ItemSlot = GearSlot;
type SkillKey = 'Q' | 'E';
type AbilitySlot = 1 | 2 | 3 | 4;

type CharacterDef = CharacterDefinition;

interface CharacterState extends CharacterDef {
  hp: number;
  cooldowns: Record<SkillKey | 'attack' | 'dodge' | 'swap', number>;
  equipment: Partial<Record<ItemSlot, LootItem>>;
  skillSlots: Partial<Record<AbilitySlot, SkillKey>>;
  shieldRemaining: number;
}

type EnemyStateId =
  | 'evaluate'
  | 'reposition'
  | 'casting'
  | 'recover'
  | 'dead';

interface EnemyBlackboard {
  targetId: string;
  distanceToTarget: number;
  lastSeenPosition: Vector3;
  desiredRange: number;
  minimumRange: number;
  maximumRange: number;
  currentAbilityId: string | null;
  currentUsageId: string | null;
  committed: boolean;
  canCast: boolean;
  castReason: string;
  positioningIntent: 'advance' | 'hold' | 'retreat' | 'circle' | 'none';
  movementStyle: EnemyMovementStyle;
  movementReason: string;
  selectedAbilityReady: boolean;
  cooldownRemaining: number;
  homePosition: Vector3;
  decisionCount: number;
  familyId: string;
  packAlerted: boolean;
  castResolved: boolean;
  recoveryCount: number;
  lastRecoveryReason: string;
  watchdogStatus: string;
  stationaryTime: number;
}

interface EnemyStateContext {
  enemy: Enemy;
}

interface Enemy {
  entityId: string;
  definition: Readonly<EnemyDefinition>;
  family: Readonly<EnemyFamilyDefinition>;
  displayName: string;
  variant: Readonly<EnemyVariantDefinition>;
  modifier: Readonly<EliteModifierDefinition>;
  healthComponent: HealthComponent;
  mesh: Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  elite: boolean;
  attackCd: number;
  abilityCooldowns: Map<string, number>;
  statuses: Partial<Record<Element, number>>;
  knockbackVelocity: Vector3;
  stateMachine: StateMachine<EnemyStateContext, EnemyStateId, EnemyBlackboard>;
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

const assets = new AssetRegistry();
const definitions = new DefinitionRegistry();

definitions.registerKind<CharacterDefinition>(
  'character',
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  validateCharacterDefinition,
);
definitions.registerMany(characterDefinitions);
definitions.registerKind<ProjectileDefinition>(
  'projectile',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateProjectileDefinition,
);
definitions.registerKind<StatusEffectDefinition>(
  'status-effect',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateStatusEffectDefinition,
);
definitions.registerKind<TelegraphDefinition>(
  'telegraph',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateTelegraphDefinition,
);
definitions.registerKind<DamageProfileDefinition>(
  'damage-profile',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateDamageProfileDefinition,
);
definitions.registerKind<CombatTagDefinition>(
  'combat-tag',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateCombatTagDefinition,
);
definitions.registerKind<AiAbilityUsageDefinition>(
  'ai-ability-usage',
  COMBAT_LIBRARY_SCHEMA_VERSION,
  validateAiAbilityUsageDefinition,
);
definitions.registerMany(projectileDefinitions);
definitions.registerMany(statusEffectDefinitions);
definitions.registerMany(telegraphDefinitions);
definitions.registerMany(damageProfileDefinitions);
definitions.registerMany(combatTagDefinitions);

definitions.registerKind<AbilityDefinition>(
  'ability',
  ABILITY_DEFINITION_SCHEMA_VERSION,
  validateAbilityDefinition,
);
definitions.registerMany(abilityDefinitions);
definitions.registerMany(aiAbilityUsageDefinitions);
definitions.registerKind<EnemyFamilyDefinition>(
  'enemy-family',
  ENEMY_DEFINITION_SCHEMA_VERSION,
  validateEnemyFamilyDefinition,
);
definitions.registerMany(enemyFamilyDefinitions);
definitions.registerKind<EnemyDefinition>(
  'enemy',
  ENEMY_DEFINITION_SCHEMA_VERSION,
  validateEnemyDefinition,
);
definitions.registerKind<EnemyVariantDefinition>(
  'enemy-variant',
  ENEMY_DEFINITION_SCHEMA_VERSION,
  validateEnemyVariantDefinition,
);
definitions.registerKind<EliteModifierDefinition>(
  'elite-modifier',
  ENEMY_DEFINITION_SCHEMA_VERSION,
  validateEliteModifierDefinition,
);
definitions.registerMany(enemyDefinitions);
definitions.registerMany(enemyVariantDefinitions);
definitions.registerMany(eliteModifierDefinitions);

const combatLibraryValidation = validateCombatLibraryReferences(definitions);
if (combatLibraryValidation.errors.length > 0) {
  throw new Error(
    `Combat library validation failed:\n- ${combatLibraryValidation.errors.join('\n- ')}`,
  );
}

const enemyTactics = new EnemyTacticalController(definitions);
const enemyRuntimeWatchdog = new EnemyRuntimeWatchdog();

function mat(
  name: string,
  color: Color3,
  emissive = 0,
): StandardMaterial {
  const key = `${name}-${color.toHexString()}-${emissive}`;
  const assetId = `material:${key}`;
  const existing = assets.get<StandardMaterial>(assetId);
  if (existing) return existing;

  const material = new StandardMaterial(key, scene);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(emissive);
  material.specularColor = new Color3(0.15, 0.15, 0.18);

  assets.register(
    {
      id: assetId,
      kind: 'material',
      tags: ['runtime', 'shared'],
      persistent: true,
    },
    material,
    value => value.dispose(),
  );

  return material;
}

const events = new EventBus();

const outdoorZone = buildOutdoorZone({
  scene,
  shadows,
  material: mat,
  onElevatorStateEntered: (state, from) => {
    events.emit('state.entered', {
      machineId: 'course-elevator',
      state,
      from,
    });
  },
  onElevatorStateExited: (state, to) => {
    events.emit('state.exited', {
      machineId: 'course-elevator',
      state,
      to,
    });
  },
  onElevatorStateChanged: (from, to, reason) => {
    events.emit('state.changed', {
      machineId: 'course-elevator',
      from,
      to,
      reason,
    });
  },
  onElevatorTransitionRejected: (from, to, rejectedBy) => {
    events.emit('state.transitionRejected', {
      machineId: 'course-elevator',
      from,
      to,
      rejectedBy,
    });
  },
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

let validationEventValue = 0;
const unsubscribeValidation = events.subscribe(
  'framework.validation',
  event => {
    validationEventValue = event.payload.value;
  },
);
events.emit('framework.validation', { value: 42 });
events.flush();
unsubscribeValidation();
if (validationEventValue !== 42) {
  throw new Error('Event bus foundation validation failed.');
}
events.resetDiagnostics();

assets.register(
  {
    id: 'data:asset-registry-validation',
    kind: 'data',
    tags: ['developer', 'validation'],
    persistent: true,
  },
  {
    value: 42,
    description: 'Asset registry startup validation.',
  },
);

const assetValidation =
  assets.require<{ value: number }>(
    'data:asset-registry-validation',
  );

if (
  assetValidation.value !== 42 ||
  assets.validate().length > 0
) {
  throw new Error('Asset registry foundation validation failed.');
}

type ValidationStateId = 'waiting' | 'pulse';
interface ValidationStateContext {
  mesh: Mesh;
  waitingDuration: number;
  pulseDuration: number;
}

interface ValidationStateBlackboard {
  cycles: number;
  lastInteraction: string | null;
}

const stateValidationMesh = MeshBuilder.CreateBox(
  'state-validation-cube',
  { size: 1.1 },
  scene,
);
stateValidationMesh.position.set(-6.5, 0.55, -21.5);
stateValidationMesh.material = mat(
  'state-validation-waiting',
  new Color3(0.22, 0.56, 0.78),
  0.12,
);
shadows.addShadowCaster(stateValidationMesh);

const stateValidationContext: ValidationStateContext = {
  mesh: stateValidationMesh,
  waitingDuration: 1.6,
  pulseDuration: 0.7,
};

const validationStateMachine = new StateMachine<
  ValidationStateContext,
  ValidationStateId,
  ValidationStateBlackboard
>(
  'framework-validation',
  stateValidationContext,
  {
    onEntered: (state, from) => {
      events.emit('state.entered', {
        machineId: 'framework-validation',
        state,
        from,
      });
    },
    onExited: (state, to) => {
      events.emit('state.exited', {
        machineId: 'framework-validation',
        state,
        to,
      });
    },
    onChanged: (from, to, reason) => {
      events.emit('state.changed', {
        machineId: 'framework-validation',
        from,
        to,
        reason,
      });
    },
    onRejected: result => {
      events.emit('state.transitionRejected', {
        machineId: 'framework-validation',
        from: result.from,
        to: result.to,
        rejectedBy: result.rejectedBy ?? 'unknown',
      });
    },
    onTimerCompleted: state => {
      events.emit('state.timerCompleted', {
        machineId: 'framework-validation',
        state,
      });
    },
    onInteraction: (state, interaction, handled) => {
      events.emit('state.interaction', {
        machineId: 'framework-validation',
        state,
        interaction: interaction.type,
        handled,
      });
    },
  },
  {
    cycles: 0,
    lastInteraction: null,
  },
)
  .addState({
    id: 'waiting',
    duration: context => context.waitingDuration,
    timeout: {
      to: 'pulse',
      reason: 'waiting-complete',
    },
    interactions: [
      {
        type: 'pulse-now',
        to: 'pulse',
        reason: 'interaction:pulse-now',
        handle: (_context, machine, interaction) => {
          machine.blackboard.set('lastInteraction', interaction.type);
        },
      },
    ],
    enter: context => {
      context.mesh.scaling.setAll(1);
      context.mesh.material = mat(
        'state-validation-waiting',
        new Color3(0.22, 0.56, 0.78),
        0.12,
      );
    },
  })
  .addState({
    id: 'pulse',
    duration: context => context.pulseDuration,
    timeout: {
      to: 'waiting',
      reason: 'pulse-complete',
    },
    enter: context => {
      context.mesh.material = mat(
        'state-validation-pulse',
        new Color3(0.82, 0.38, 0.72),
        0.3,
      );
    },
    update: (context, machine) => {
      const progress = machine.getStateTimer().progress ?? 0;
      const scale = 1 + Math.sin(progress * Math.PI) * 0.45;
      context.mesh.scaling.setAll(scale);
      context.mesh.rotation.y += 0.035;
    },
    timerCompleted: (_context, machine) => {
      machine.blackboard.set(
        'cycles',
        machine.blackboard.get('cycles') + 1,
      );
    },
    exit: context => {
      context.mesh.scaling.setAll(1);
    },
  });

validationStateMachine.start('waiting', 'validation-start');
const validationInteraction = validationStateMachine.interact(
  'pulse-now',
  { source: 'startup-validation' },
);
if (!validationInteraction.handled) {
  throw new Error('State interaction validation failed.');
}

const entities = new EntityRegistry();

let entityCreatedCount = 0;
let entityDestroyedCount = 0;
entities.onCreated(entity => {
  entityCreatedCount += 1;
  events.emit('entity.created', {
    entityId: entity.id,
    name: entity.name,
    tags: entity.getTags(),
  });
});
entities.onDestroyed(entity => {
  entityDestroyedCount += 1;
  events.emit('entity.destroyed', {
    entityId: entity.id,
    name: entity.name,
    tags: entity.getTags(),
  });

  if (!entity.hasTag('entity-owned-transform')) return;
  const transform = entity.getComponent<TransformComponent>(
    EntityComponentKeys.transform,
  );
  transform?.node.dispose();
});

const defs = definitions.all<CharacterDefinition>('character');

if (defs.length !== characterDefinitions.length) {
  throw new Error('Character definition bridge validation failed.');
}
const party: CharacterState[] = defs.map(d => ({
  ...d,
  hp: d.maxHp,
  cooldowns: { Q: 0, E: 0, attack: 0, dodge: 0, swap: 0 },
  equipment: {},
  skillSlots: { 1: 'Q', 2: 'E' },
  shieldRemaining: 0,
}));
let activeIndex = 0;
let active = party[0];
const abilityComponents = new Map<string, AbilityComponent>();
const abilityEventLog: string[] = [];
let freezeAbilityCastTimers = false;
function logAbilityEvent(message: string): void {
  abilityEventLog.unshift(`${new Date().toLocaleTimeString()}  ${message}`);
  abilityEventLog.splice(24);
}

const playerRoot = new TransformNode('playerRoot', scene);
playerRoot.position.set(0, 0, -22);
const playerBody = MeshBuilder.CreateCapsule('player', { height: 2.0, radius: 0.55 }, scene);
playerBody.parent = playerRoot;
playerBody.position.y = 1;
playerBody.material = mat('player', active.color, 0.08);
shadows.addShadowCaster(playerBody);

const playerEntity = entities
  .create({
    id: 'player',
    name: 'Player',
    tags: ['actor', 'player', 'controllable'],
  })
  .setComponent<TransformComponent>(
    EntityComponentKeys.transform,
    { node: playerRoot },
  )
  .setComponent<MetadataComponent>(
    EntityComponentKeys.metadata,
    {
      archetype: 'player-party-controller',
      persistent: true,
    },
  );

const entityValidationProbe = entities
  .create({
    id: 'entity-validation-probe',
    name: 'Entity Validation Probe',
    tags: ['developer', 'validation'],
    enabled: false,
  })
  .setComponent<MetadataComponent>(
    EntityComponentKeys.metadata,
    {
      archetype: 'framework-probe',
      persistent: false,
    },
  );

if (
  entities.query(
    ['player'],
    [EntityComponentKeys.transform],
  )[0] !== playerEntity ||
  entityValidationProbe.state !== 'disabled'
) {
  throw new Error('Entity foundation validation failed.');
}
const facingMarker = MeshBuilder.CreateBox('facing', { width: 0.16, height: 0.16, depth: 1.0 }, scene);
facingMarker.parent = playerRoot;
facingMarker.position.set(0, 0.45, 0.75);
facingMarker.material = mat('facing', Color3.White(), 0.35);

const settings = new SettingsManager();
const input = new InputManager(window);
input.applySettings(settings.get().input);
let pointerWorld = new Vector3(0, 0, 4);
let swapInputCooldown = 0;
let inventoryOpen = false;
let gameOver = false;
let wave = 1;
let kills = 0;
let lootId = 1;
let enemies: Enemy[] = [];
let hoveredEnemy: Enemy | null = null;
let loot: LootItem[] = [];
let effects: { mesh: Mesh; ttl: number; tick: number; type: Element; radius: number; damage: number }[] = [];
let scheduledWave: number | null = null;
let projectiles: {
  mesh: Mesh;
  vel: Vector3;
  ttl: number;
  damage: number;
  element: Element;
  pierce: number;
  owner: 'player' | 'enemy';
}[] = [];

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

const ui = new UIManager();
const developerHud = new DeveloperHud(
  ui.getLayer('developer'),
);
const gameplayHud = new GameplayHud(
  ui.getLayer('gameplay'),
  ui.getLayer('notifications'),
);
let movement: PlayerMovementController;

const settingsMenu = new SettingsMenu(
  ui.getLayer('menus'),
  settings,
  input,
  {
    onVisibilityChanged: open => {
      input.setContext(open ? 'settings' : 'gameplay');
      movement?.endPointerMovement();
    },
  },
);
const unsubscribeSettings = settings.subscribe(current => {
  input.applySettings(current.input);
  ui.getRoot().style.setProperty(
    '--ui-scale',
    String(current.accessibility.uiScale),
  );
});

movement = new PlayerMovementController(input, playerRoot, {
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
  onLanded: (impactSpeed: number) => {
    events.emit('movement.playerLanded', {
      impactSpeed,
      supportHeight: movement.getSupportHeight(),
    });
  },
});

const playerCamera = new PlayerCameraController(
  camera,
  playerRoot,
  () => movement.getVelocity(),
);
const movementDebug = new MovementDebugOverlay(
  developerHud.getPageContent('movement'),
);
const combatLibraryPanel = new CombatLibraryPanel(
  developerHud.getPageContent('combat'),
  definitions,
);
const damageNumbers = new DamageNumberManager(scene, camera, engine);
const hitFeedback = new HitFeedbackController(scene);
const enemyTelegraphs = new EnemyTelegraphController(scene);
const combat = new CombatSystem(damageNumbers, hitFeedback, playerCamera);

const partyManagement = new PartyManagementScreen(inventoryEl, {
  close: () => {
    closeInventory();
    input.setContext('gameplay');
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

function gameplayHudSnapshot(): GameplayHudSnapshot {
  const activeAbilities = abilityComponents.get(active.id);
  const abilityView = (slot: AbilitySlot) => {
    const runtime = activeAbilities?.get(slot);
    const snapshot = runtime?.snapshot();
    return {
      name: snapshot?.name ?? 'Unassigned',
      cooldown: snapshot?.cooldownRemaining ?? 0,
      maximum: snapshot?.cooldownMaximum ?? 0,
      assigned: Boolean(runtime),
      state: snapshot?.state,
      castProgress: snapshot?.castProgress ?? 0,
      castElapsed: snapshot?.castElapsed ?? 0,
      castRemaining: snapshot?.castRemaining ?? 0,
      castMaximum: snapshot?.castMaximum ?? 0,
      tags: snapshot?.tags ?? [],
    };
  };

  const elite = enemies.find(enemy => enemy.elite);

  return {
    party: party.map((character, index) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      hp: character.hp,
      maxHp: hpMax(character),
      active: index === activeIndex,
      color: character.color.toHexString(),
    })),
    abilities: [
      {
        id: 'basic',
        binding: input.getBindingLabel('primaryAttack'),
        name: 'Basic',
        cooldown: active.cooldowns.attack,
        cooldownMaximum: active.attackCooldown,
        assigned: true,
      },
      ...([1, 2, 3, 4] as AbilitySlot[]).map(slot => {
        const view = abilityView(slot);
        return {
          id: `ability-${slot}`,
          binding: input.getBindingLabel(`ability${slot}` as 'ability1' | 'ability2' | 'ability3' | 'ability4'),
          name: view.name,
          cooldown: view.cooldown,
          cooldownMaximum: view.maximum,
          assigned: view.assigned,
          state: view.state,
          castProgress: view.castProgress,
          castElapsed: view.castElapsed,
          castRemaining: view.castRemaining,
          castMaximum: view.castMaximum,
          tags: view.tags,
        };
      }),
      {
        id: 'dodge',
        binding: input.getBindingLabel('dodge'),
        name: 'Dodge',
        cooldown: active.cooldowns.dodge,
        cooldownMaximum: GameBalance.movement.dodgeCooldown,
        assigned: true,
      },
      {
        id: 'jump',
        binding: input.getBindingLabel('jump'),
        name: 'Jump',
        cooldown: 0,
        cooldownMaximum: 0,
        assigned: true,
      },
    ],
    wave,
    kills,
    power: powerFor(),
    activeCast: (() => {
      const casting = activeAbilities?.all()
        .map(runtime => runtime.snapshot())
        .find(snapshot => snapshot.state === 'casting');
      return casting
        ? {
            name: casting.name,
            elapsed: casting.castElapsed,
            remaining: casting.castRemaining,
            maximum: casting.castMaximum,
            progress: casting.castProgress,
          }
        : undefined;
    })(),
    boss: hoveredEnemy && enemies.includes(hoveredEnemy)
      ? { name: hoveredEnemy.displayName, hp: hoveredEnemy.hp, maxHp: hoveredEnemy.maxHp }
      : elite
        ? { name: elite.displayName, hp: elite.hp, maxHp: elite.maxHp }
        : undefined,
  };
}

function refreshHud(): void {
  gameplayHud.render(gameplayHudSnapshot());
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
        {
          id: 'Q',
          name: abilityComponents.get(character.id)?.get(1)?.definition.name ?? character.qName,
        },
        {
          id: 'E',
          name: abilityComponents.get(character.id)?.get(2)?.definition.name ?? character.eName,
        },
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
function feed(
  text: string,
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'loot' = 'neutral',
): void {
  events.emit('ui.notification', { text, tone });
}

const eventUnsubscribers = [
  events.subscribe('movement.playerLanded', () => {
    vfxRing(
      playerRoot.position,
      new Color3(0.72, 0.78, 0.86),
      2.2,
      0.22,
    );
  }),
  events.subscribe('world.triggerActivated', event => {
    feed(`Trigger volume: ${event.payload.triggerId}.`);
  }),
  events.subscribe('ui.notification', event => {
    gameplayHud.notify(
      event.payload.text,
      event.payload.tone ?? 'neutral',
    );
  }),
];

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

function executeEnemyAbility(enemy: Enemy, usage: AiAbilityUsageDefinition): void {
  const ability = definitions.require<AbilityDefinition>(usage.abilityId);
  const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
  const power = (ability.power ?? ability.damage ?? enemy.damage) * usage.powerMultiplier;

  if (ability.projectileId) {
    const projectileDefinition = definitions.get<ProjectileDefinition>(
      ability.projectileId,
    );
    const direction = playerRoot.position.subtract(enemy.mesh.position);
    direction.y = 0;
    if (direction.lengthSquared() > 0.001) direction.normalize();
    const projectile = MeshBuilder.CreateSphere(
      `enemy-projectile-${ability.id}`,
      { diameter: Math.max(0.24, (projectileDefinition?.radius ?? 0.16) * 2) },
      scene,
    );
    projectile.position = enemy.mesh.position
      .add(new Vector3(0, 0.75, 0))
      .add(direction.scale(0.8));
    projectile.material = mat(
      `enemy-projectile-${ability.element}`,
      ability.element === 'fire'
        ? new Color3(1, 0.28, 0.08)
        : ability.element === 'frost'
          ? new Color3(0.45, 0.85, 1)
          : new Color3(0.85, 0.85, 0.95),
      0.75,
    );
    const speed = projectileDefinition?.speed ?? ability.speed ?? 15;
    projectiles.push({
      mesh: projectile,
      vel: direction.scale(speed),
      ttl: projectileDefinition?.lifetime ?? Math.max(0.5, ability.range / speed),
      damage: Math.max(enemy.damage, power),
      element: ability.element,
      pierce: projectileDefinition?.pierce ?? 0,
      owner: 'enemy',
    });
  } else if (ability.id === 'ability.retreat') {
    const away = enemy.mesh.position.subtract(playerRoot.position); away.y = 0;
    if (away.lengthSquared() > 0.001) enemy.mesh.position.addInPlace(away.normalize().scale(ability.range));
  } else if (ability.id === 'ability.charge' || ability.id === 'ability.dash' || ability.id === 'ability.leap') {
    const toward = playerRoot.position.subtract(enemy.mesh.position); toward.y = 0;
    if (toward.lengthSquared() > 0.001) enemy.mesh.position.addInPlace(toward.normalize().scale(Math.min(ability.range, Math.max(0, distance - 1.35))));
  }

  if (ability.abilityTags.includes('defensive')) {
    const restore = Math.max(8, power * 0.5);
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + restore);
    enemy.healthComponent.current = enemy.hp;

    if (enemy.definition.role === 'mother-wolf') {
      for (const ally of enemies) {
        if (ally === enemy || ally.definition.familyId !== 'wolf') continue;
        if (Vector3.Distance(ally.mesh.position, enemy.mesh.position) > enemy.family.alertRadius) continue;
        ally.attackCd = 0;
        ally.stateMachine.blackboard.set('packAlerted', true);
        ally.stateMachine.request('evaluate', 'mother-wolf-howl');
      }
    }
  }

  const resolvedDistance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
  const hitRange = Math.max(ability.range, usage.maximumRange) + 0.75;
  if (
    !ability.projectileId &&
    resolvedDistance <= hitRange &&
    !ability.abilityTags.includes('defensive')
  ) {
    hurtActive(Math.max(enemy.damage, power));
  }

  const color = ability.element === 'fire'
    ? new Color3(1, 0.28, 0.08)
    : ability.element === 'frost'
      ? new Color3(0.45, 0.85, 1)
      : ability.element === 'lightning'
        ? new Color3(0.75, 0.65, 1)
        : new Color3(1, 0.55, 0.2);
  vfxRing(enemy.mesh.position, color, Math.max(1.5, ability.radius ?? 2.2), 0.28);
  enemy.abilityCooldowns.set(ability.id, ability.cooldown * usage.cooldownMultiplier);
  enemy.attackCd = 0.2;
}

function toEnemyRuntimeActor(enemy: Enemy): EnemyRuntimeActor {
  return {
    definition: enemy.definition,
    position: enemy.mesh.position,
    speed: enemy.speed,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    abilityCooldowns: enemy.abilityCooldowns,
  };
}

function applyEnemyPlanToBlackboard(
  enemy: Enemy,
  activeMachine: StateMachine<EnemyStateContext, EnemyStateId, EnemyBlackboard>,
  distance: number,
  usage: Readonly<AiAbilityUsageDefinition>,
  ready: boolean,
  cooldownRemaining: number,
  canCast: boolean,
  castReason: string,
  positioningIntent: EnemyBlackboard['positioningIntent'],
  movementReason: string,
): void {
  const blackboard = activeMachine.blackboard;
  blackboard.set('distanceToTarget', distance);
  blackboard.set('lastSeenPosition', playerRoot.position.clone());
  blackboard.set('currentAbilityId', usage.abilityId);
  blackboard.set('currentUsageId', usage.id);
  blackboard.set('desiredRange', usage.preferredRange);
  blackboard.set('minimumRange', usage.minimumRange);
  blackboard.set('maximumRange', usage.maximumRange);
  blackboard.set('selectedAbilityReady', ready);
  blackboard.set('cooldownRemaining', cooldownRemaining);
  blackboard.set('canCast', canCast);
  blackboard.set('castReason', castReason);
  blackboard.set('positioningIntent', positioningIntent);
  blackboard.set('movementReason', movementReason);
  blackboard.set('movementStyle', enemy.definition.movementStyle);
}

function resolveEnemyCast(
  enemy: Enemy,
  usage: Readonly<AiAbilityUsageDefinition>,
  reason: string,
): void {
  const machine = enemy.stateMachine;
  if (machine.blackboard.get('castResolved')) return;
  machine.blackboard.set('castResolved', true);
  machine.blackboard.set('committed', true);
  machine.blackboard.set('castReason', reason);
  executeEnemyAbility(enemy, usage);
  if (machine.getCurrentStateId() === 'casting') {
    machine.request('recover', reason);
  }
}

function createEnemyStateMachine(
  enemy: Enemy,
): StateMachine<EnemyStateContext, EnemyStateId, EnemyBlackboard> {
  const machineId = `enemy-${enemy.entityId}`;
  const machine = new StateMachine<EnemyStateContext, EnemyStateId, EnemyBlackboard>(
    machineId,
    { enemy },
    {
      onEntered: (state, from) => events.emit('state.entered', { machineId, state, from }),
      onExited: (state, to) => events.emit('state.exited', { machineId, state, to }),
      onChanged: (from, to, reason) => events.emit('state.changed', { machineId, from, to, reason }),
      onRejected: result => events.emit('state.transitionRejected', { machineId, from: result.from, to: result.to, rejectedBy: result.rejectedBy ?? 'unknown' }),
    },
    {
      targetId: 'player',
      distanceToTarget: 0,
      lastSeenPosition: playerRoot.position.clone(),
      desiredRange: enemy.definition.preferredRange,
      minimumRange: 0,
      maximumRange: enemy.definition.detectionRange,
      currentAbilityId: null,
      currentUsageId: null,
      committed: enemy.definition.policy === 'boss',
      canCast: false,
      castReason: 'no ability selected',
      positioningIntent: 'none',
      movementStyle: enemy.definition.movementStyle,
      movementReason: 'awaiting tactical controller',
      selectedAbilityReady: false,
      cooldownRemaining: 0,
      homePosition: enemy.mesh.position.clone(),
      decisionCount: 0,
      familyId: enemy.definition.familyId,
      packAlerted: false,
      castResolved: false,
      recoveryCount: 0,
      lastRecoveryReason: 'none',
      watchdogStatus: 'runtime progressing',
      stationaryTime: 0,
    },
  );

  return machine
    .addState({
      id: 'evaluate',
      enter: (_context, activeMachine) => {
        const blackboard = activeMachine.blackboard;
        blackboard.set('decisionCount', blackboard.get('decisionCount') + 1);
        const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
        const plan = enemyTactics.plan(toEnemyRuntimeActor(enemy), distance);

        applyEnemyPlanToBlackboard(
          enemy,
          activeMachine,
          distance,
          plan.ability.usage,
          plan.ability.ready,
          plan.ability.cooldownRemaining,
          plan.movement.canCast,
          plan.ability.reason,
          plan.movement.intent,
          `tactical controller: ${plan.movement.reason}`,
        );

        activeMachine.request(
          plan.movement.canCast ? 'casting' : 'reposition',
          plan.movement.canCast ? 'tactical-plan-cast' : 'tactical-plan-position',
        );
      },
    })
    .addState({
      id: 'reposition',
      update: (_context, activeMachine, dt) => {
        if (enemy.hp <= 0) {
          activeMachine.request('dead', 'health-depleted');
          return;
        }

        const blackboard = activeMachine.blackboard;
        const usageId = blackboard.get('currentUsageId');
        const usage = usageId
          ? definitions.get<AiAbilityUsageDefinition>(usageId)
          : undefined;
        if (!usage) {
          activeMachine.request('evaluate', 'missing-selected-usage');
          return;
        }

        const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
        const actor = toEnemyRuntimeActor(enemy);
        const ability = enemyTactics.abilities.inspect(actor, usage, distance);
        const movement = enemyTactics.movement.decide(actor, ability, distance);

        applyEnemyPlanToBlackboard(
          enemy,
          activeMachine,
          distance,
          usage,
          ability.ready,
          ability.cooldownRemaining,
          movement.canCast,
          ability.reason,
          movement.intent,
          `movement controller: ${movement.reason}`,
        );

        if (movement.canCast) {
          activeMachine.request('casting', 'movement-plan-cast-ready');
          return;
        }

        const slow = (enemy.statuses.frost ?? 0) > 0 ? 0.58 : 1;
        const orbitDirection = blackboard.get('decisionCount') % 2 === 0 ? 1 : -1;
        enemyTactics.movement.apply(
          enemy.mesh.position,
          playerRoot.position,
          movement,
          enemy.speed * slow,
          dt,
          orbitDirection,
        );

        if (activeMachine.getTimeInState() >= 0.45) {
          activeMachine.request('evaluate', 'tactical-replan');
        }
      },
    })
    .addState({
      id: 'casting',
      enter: (_context, activeMachine) => {
        const usageId = activeMachine.blackboard.get('currentUsageId');
        const usage = usageId
          ? definitions.get<AiAbilityUsageDefinition>(usageId)
          : undefined;
        const abilityId = activeMachine.blackboard.get('currentAbilityId');
        const ability = abilityId
          ? definitions.get<AbilityDefinition>(abilityId)
          : undefined;
        if (!usage || !ability) {
          activeMachine.blackboard.set('lastRecoveryReason', 'casting entered without a resolvable ability');
          activeMachine.request('evaluate', 'missing-ability');
          return;
        }

        const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
        const decision = enemyTactics.abilities.inspect(
          toEnemyRuntimeActor(enemy),
          usage,
          distance,
        );
        if (!decision.ready || !decision.inRange) {
          activeMachine.blackboard.set('selectedAbilityReady', decision.ready);
          activeMachine.blackboard.set('cooldownRemaining', decision.cooldownRemaining);
          activeMachine.blackboard.set('castReason', decision.reason);
          activeMachine.request('reposition', 'cast-precondition-changed');
          return;
        }

        activeMachine.blackboard.set('castResolved', false);
        activeMachine.blackboard.set('committed', enemy.definition.policy === 'boss');

        // A stale recovery marker must never prevent the next cast from starting.
        if (enemyTelegraphs.isBusy(enemy.mesh)) enemyTelegraphs.cancel(enemy.mesh);
        const started = enemyTelegraphs.begin(enemy.mesh, enemy.elite, () => {
          if (enemy.hp <= 0 || !enemies.includes(enemy)) return;
          resolveEnemyCast(enemy, usage, 'ability-resolved');
        });

        if (!started) {
          activeMachine.blackboard.set('lastRecoveryReason', 'telegraph refused to start');
          activeMachine.request('evaluate', 'telegraph-start-failed');
        }
      },
      update: (_context, activeMachine) => {
        if (enemy.hp <= 0) {
          activeMachine.request('dead', 'health-depleted');
          return;
        }

        // Final in-state fallback. The frame watchdog also checks this path.
        if (activeMachine.getTimeInState() > 1.75) {
          const usageId = activeMachine.blackboard.get('currentUsageId');
          const usage = usageId
            ? definitions.get<AiAbilityUsageDefinition>(usageId)
            : undefined;
          if (usage) {
            enemyTelegraphs.cancel(enemy.mesh);
            resolveEnemyCast(enemy, usage, 'casting-timeout-recovery');
          } else {
            activeMachine.request('evaluate', 'casting-timeout-missing-usage');
          }
        }
      },
      exit: (_context, _machine, to) => {
        if (to === 'dead') enemyTelegraphs.cancel(enemy.mesh);
      },
    })
    .addState({
      id: 'recover',
      duration: () => enemy.definition.recoverDuration,
      timeout: {
        to: 'evaluate',
        reason: 'recovery-complete',
        guard: () => enemy.hp > 0,
      },
      update: (_context, activeMachine) => {
        if (enemy.hp <= 0) activeMachine.request('dead', 'health-depleted');
      },
    })
    .addState({ id: 'dead', enter: () => enemyTelegraphs.cancel(enemy.mesh) });
}

function updateEnemyRuntimeWatchdog(enemy: Enemy, dt: number): void {
  const machine = enemy.stateMachine;
  const result = enemyRuntimeWatchdog.update(
    {
      entityId: enemy.entityId,
      state: machine.getCurrentStateId(),
      timeInState: machine.getTimeInState(),
      position: enemy.mesh.position,
      movementIntent: machine.blackboard.get('positioningIntent'),
      recoverDuration: enemy.definition.recoverDuration,
      hasSelectedAbility: Boolean(machine.blackboard.get('currentUsageId')),
      telegraphBusy: enemyTelegraphs.isBusy(enemy.mesh),
    },
    dt,
  );

  machine.blackboard.set('watchdogStatus', result.reason);
  machine.blackboard.set('stationaryTime', result.stationaryTime);
  if (result.action === 'none') return;

  machine.blackboard.set(
    'recoveryCount',
    machine.blackboard.get('recoveryCount') + 1,
  );
  machine.blackboard.set('lastRecoveryReason', result.reason);

  if (result.action === 'force-execute') {
    const usageId = machine.blackboard.get('currentUsageId');
    const usage = usageId
      ? definitions.get<AiAbilityUsageDefinition>(usageId)
      : undefined;
    enemyTelegraphs.cancel(enemy.mesh);
    if (usage) resolveEnemyCast(enemy, usage, 'watchdog-force-execute');
    else machine.request('evaluate', 'watchdog-missing-usage');
    return;
  }

  if (result.action === 'replan-nudge') {
    const toPlayer = playerRoot.position.subtract(enemy.mesh.position);
    toPlayer.y = 0;
    if (toPlayer.lengthSquared() > 0.001) {
      toPlayer.normalize();
      const tangent = new Vector3(-toPlayer.z, 0, toPlayer.x);
      const direction = machine.blackboard.get('decisionCount') % 2 === 0 ? 1 : -1;
      enemy.mesh.position.addInPlace(tangent.scale(0.35 * direction));
    }
    machine.request('evaluate', 'watchdog-replan-nudge');
    return;
  }

  machine.request('evaluate', 'watchdog-force-evaluate');
}

function spawnEnemy(
  elite = false,
  spawnPosition?: Vector3,
  definitionId?: string,
  variantId?: EnemyVariantId,
  modifierId?: EliteModifierId,
): void {
  const archetypes = definitions.all<EnemyDefinition>('enemy');
  const commonArchetypes = archetypes.filter(candidate => candidate.spawnClass === 'common');
  const definition = definitionId
    ? definitions.require<EnemyDefinition>(definitionId)
    : commonArchetypes[Math.floor(Math.random() * commonArchetypes.length)];
  const variants = definitions.all<EnemyVariantDefinition>('enemy-variant');
  const variant = variantId
    ? definitions.require<EnemyVariantDefinition>(`enemy-variant.${variantId}`)
    : variants[Math.floor(Math.random() * variants.length)];
  const resolvedModifierId = modifierId ?? (elite ? ['frozen', 'burning', 'fast', 'heavy', 'arcane', 'shielded'][Math.floor(Math.random() * 6)] as EliteModifierId : 'none');
  const modifier = definitions.require<EliteModifierDefinition>(`elite-modifier.${resolvedModifierId}`);

  const family = definitions.require<EnemyFamilyDefinition>(`enemy-family.${definition.familyId}`);
  const displayName = `${elite && modifier.modifierId !== 'none' ? modifier.name + ' ' : ''}${definition.familyId === 'humanoid' ? variant.name + ' ' : ''}${definition.name}`;

  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 4;
  const mesh = definition.role === 'brute' || definition.role === 'boss'
    ? MeshBuilder.CreateIcoSphere(`enemy-${definition.role}`, { radius: definition.role === 'boss' ? 1.45 : elite ? 1.1 : 0.9, subdivisions: 2 }, scene)
    : definition.role === 'crab'
      ? MeshBuilder.CreateBox('enemy-crab', { width: 1.5, height: 0.55, depth: 1.05 }, scene)
      : MeshBuilder.CreateCapsule(`enemy-${definition.role}`, { height: definition.role.includes('mage') || definition.role === 'frost-caster' || definition.role === 'mother-wolf' ? 1.8 : 1.5, radius: definition.role === 'wolf' ? 0.40 : elite ? 0.56 : 0.46 }, scene);
  const y = definition.role === 'boss' ? 1.45 : definition.role === 'brute' ? (elite ? 1.1 : 0.9) : definition.role === 'crab' ? 0.3 : 0.75;
  mesh.position.set(spawnPosition?.x ?? Math.cos(angle) * radius, y, spawnPosition?.z ?? Math.sin(angle) * radius);
  const [r, g, b] = definition.color;
  const [mr, mg, mb] = modifier.colorShift;
  mesh.material = mat(`enemy-${definition.role}-${variant.variantId}-${modifier.modifierId}`, new Color3(Math.min(1, r + mr), Math.min(1, g + mg), Math.min(1, b + mb)), elite ? 0.2 : 0.04);
  shadows.addShadowCaster(mesh);

  const waveScale = 1 + (wave - 1) * 0.18;
  const hp = definition.maxHp * variant.hpMultiplier * modifier.hpMultiplier * waveScale;
  const healthComponent: HealthComponent = { current: hp, maximum: hp };
  const enemyEntity = entities.create({
    name: displayName,
    tags: ['actor', 'enemy', elite ? 'elite' : 'standard', `role:${definition.role}`, `variant:${variant.variantId}`, 'entity-owned-transform'],
  })
    .setComponent<TransformComponent>(EntityComponentKeys.transform, { node: mesh })
    .setComponent<MetadataComponent>(EntityComponentKeys.metadata, { archetype: definition.id, persistent: false })
    .setComponent<HealthComponent>(EntityComponentKeys.health, healthComponent)
    .setComponent<EnemyComponent>(EntityComponentKeys.enemy, { elite, spawnWave: wave });
  mesh.metadata = { enemyEntityId: enemyEntity.id };

  const enemy = {} as Enemy;
  Object.assign(enemy, {
    entityId: enemyEntity.id,
    definition,
    family,
    displayName,
    variant,
    modifier,
    healthComponent,
    mesh,
    hp,
    maxHp: hp,
    speed: definition.movementSpeed * variant.speedMultiplier * modifier.speedMultiplier,
    damage: definition.baseDamage * variant.damageMultiplier * modifier.damageMultiplier * (1 + wave * 0.08),
    elite,
    attackCd: Math.random(),
    abilityCooldowns: new Map<string, number>(),
    statuses: {},
    knockbackVelocity: Vector3.Zero(),
  });
  enemy.stateMachine = createEnemyStateMachine(enemy);
  enemy.stateMachine.start('evaluate', 'enemy-spawned');
  enemies.push(enemy);
}

function startWave(): void {
  if (!developerState.wavesEnabled) return;
  const count = Math.min(6 + wave * 2, 24);
  for (let i = 0; i < count; i++) setTimeout(() => spawnEnemy(false), i * 170);
  if (wave % 3 === 0) setTimeout(() => spawnEnemy(true, undefined, 'enemy.mother-wolf', 'astral', 'none'), 550);
  else if (wave % 2 === 0) setTimeout(() => spawnEnemy(true), 500);
  if (wave % 5 === 0) setTimeout(() => spawnEnemy(true, undefined, 'enemy.world-boss', 'astral', 'none'), 900);
  feed(`Wave ${wave}: ${count}${wave % 3 === 0 ? ' plus a Mother Wolf' : wave % 2 === 0 ? ' plus an elite' : ''}${wave % 5 === 0 ? ' and a boss' : ''}.`);
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
      e.healthComponent.current = e.hp;
      combat.applyEnemyHit({ target: e, damage: chainDamage, element: 'lightning', worldPosition: e.mesh.position, sourcePosition: enemy.mesh.position, weight: 'light' });
      vfxRing(e.mesh.position, active.color, 1.1, 0.2);
    });
  }

  if (enemy.definition.familyId === 'wolf') {
    for (const ally of enemies) {
      if (ally === enemy || ally.definition.familyId !== 'wolf') continue;
      if (Vector3.Distance(ally.mesh.position, enemy.mesh.position) > enemy.family.alertRadius) continue;
      ally.stateMachine.blackboard.set('packAlerted', true);
      ally.stateMachine.request('evaluate', 'pack-alert');
    }
  }

  enemy.hp -= final;
  enemy.healthComponent.current = enemy.hp;
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
    projectiles.push({ mesh: orb, vel: dir.scale(15), ttl: 1.0, damage: attackFor(), element: active.element, pierce: 0, owner: 'player' });
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

function executeAbility(context: AbilityExecutionContext): void {
  const { definition, request } = context;
  const direction = request.aimDirection.clone();
  direction.y = 0;
  if (direction.lengthSquared() > 0.0001) direction.normalize();

  if (definition.executorId === 'fireball') {
    const orb = MeshBuilder.CreateSphere('ability-fireball', { diameter: 0.52 }, scene);
    orb.position = request.casterPosition.add(new Vector3(0, 0.85, 0)).add(direction.scale(0.9));
    orb.material = mat('ability-fireball', new Color3(1, 0.32, 0.08), 0.85);
    projectiles.push({
      mesh: orb,
      vel: direction.scale(14),
      ttl: definition.range / 14,
      damage: definition.damage ?? 0,
      element: 'fire',
      pierce: 0,
      owner: 'player',
    });
    vfxRing(request.casterPosition, new Color3(1, 0.35, 0.08), 1.8, 0.18);
    return;
  }

  if (definition.executorId === 'ice-spear') {
    const spear = MeshBuilder.CreateCylinder(
      'ability-ice-spear',
      { diameter: 0.28, height: 1.4, tessellation: 8 },
      scene,
    );
    spear.rotation.x = Math.PI / 2;
    spear.rotation.y = Math.atan2(direction.x, direction.z);
    spear.position = request.casterPosition.add(new Vector3(0, 0.8, 0)).add(direction.scale(0.9));
    spear.material = mat('ability-ice-spear', new Color3(0.35, 0.82, 1), 0.75);
    projectiles.push({
      mesh: spear,
      vel: direction.scale(17),
      ttl: definition.range / 17,
      damage: definition.damage ?? 0,
      element: 'frost',
      pierce: 1,
      owner: 'player',
    });
    return;
  }

  if (definition.executorId === 'blink') {
    performBlink(request.aimPosition, definition.range);
    return;
  }

  if (definition.executorId === 'shield') {
    active.shieldRemaining = Math.max(active.shieldRemaining, definition.duration ?? 4);
    active.hp = Math.min(hpMax(active), active.hp + 24);
    vfxRing(playerRoot.position, new Color3(0.55, 0.75, 1), 4.2, 0.5);
    feed('Astral Shield active.');
  }
}

function createAbilityRuntime(
  character: CharacterState,
  slot: AbilitySlot,
  definitionId: string,
): AbilityRuntime {
  const definition = definitions.require<AbilityDefinition>(definitionId);
  return new AbilityRuntime(
    `${character.id}-slot-${slot}`,
    definition,
    executeAbility,
    {
      onCastStarted: (ability, request) => {
        logAbilityEvent(`${character.name}: ${ability.name} cast started`);
        events.emit('ability.castStarted', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
          casterId: request.casterId,
        });
      },
      onExecuted: (ability, request) => {
        logAbilityEvent(`${character.name}: ${ability.name} executed`);
        events.emit('ability.executed', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
          casterId: request.casterId,
        });
      },
      onCooldownStarted: ability => {
        logAbilityEvent(`${character.name}: ${ability.name} cooldown ${ability.cooldown.toFixed(1)}s`);
        events.emit('ability.cooldownStarted', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
          duration: ability.cooldown,
        });
      },
      onReady: ability => {
        logAbilityEvent(`${character.name}: ${ability.name} ready`);
        events.emit('ability.ready', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
        });
      },
      onCommitReached: ability => {
        logAbilityEvent(`${character.name}: ${ability.name} committed`);
        events.emit('ability.commitReached', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
          progress: ability.commitThreshold,
        });
      },
      onInterrupted: (ability, reason) => {
        logAbilityEvent(`${character.name}: ${ability.name} interrupted (${reason})`);
        events.emit('ability.interrupted', {
          runtimeId: `${character.id}-slot-${slot}`,
          abilityId: ability.id,
          reason,
        });
      },
      onStateEntered: (state, from) => {
        events.emit('state.entered', {
          machineId: `ability-${character.id}-slot-${slot}`,
          state,
          from,
        });
      },
      onStateExited: (state, to) => {
        events.emit('state.exited', {
          machineId: `ability-${character.id}-slot-${slot}`,
          state,
          to,
        });
      },
      onStateChanged: (from, to, reason) => {
        events.emit('state.changed', {
          machineId: `ability-${character.id}-slot-${slot}`,
          from,
          to,
          reason,
        });
      },
    },
  );
}

const validationAbilityLoadouts: Record<string, readonly string[]> = {
  vanguard: ['ability.fireball', 'ability.blink', 'ability.shield', 'ability.ice-spear'],
  warden: ['ability.ice-spear', 'ability.shield', 'ability.blink', 'ability.fireball'],
  tempest: ['ability.blink', 'ability.fireball', 'ability.ice-spear', 'ability.shield'],
};

for (const character of party) {
  const component = new AbilityComponent({
    onQueueConsumed: action => {
      logAbilityEvent(`${character.name}: queued ${action.id} consumed`);
      events.emit('ability.queueConsumed', {
        characterId: character.id,
        actionId: action.id,
        actionType: action.type,
      });
    },
  });
  const loadout = validationAbilityLoadouts[character.id] ?? validationAbilityLoadouts.vanguard;
  ([1, 2, 3, 4] as AbilitySlot[]).forEach((slot, index) => {
    component.assign(slot, createAbilityRuntime(character, slot, loadout[index]));
  });
  abilityComponents.set(character.id, component);
}

const abilityDeveloperPanel = new AbilityDeveloperPanel(
  developerHud.getPageContent('abilities'),
  {
    resetCooldowns: () => {
      for (const component of abilityComponents.values()) component.finishCooldowns();
      logAbilityEvent('Developer: cooldowns reset');
      refreshHud();
    },
    interruptCast: () => {
      const interrupted = abilityComponents.get(active.id)?.interruptActive();
      feed(interrupted ? 'Developer: cast interrupted.' : 'Developer: no active cast.');
    },
    finishCast: () => {
      const finished = abilityComponents.get(active.id)?.finishActiveCast();
      feed(finished ? 'Developer: cast completed.' : 'Developer: no cast to complete.');
    },
    resetAbilities: () => {
      for (const component of abilityComponents.values()) component.reset();
      logAbilityEvent('Developer: ability states reset');
      refreshHud();
    },
    toggleCastTimerFreeze: () => {
      freezeAbilityCastTimers = !freezeAbilityCastTimers;
      logAbilityEvent(`Developer: cast timer freeze ${freezeAbilityCastTimers ? 'enabled' : 'disabled'}`);
      feed(`Developer: cast timer freeze ${freezeAbilityCastTimers ? 'enabled' : 'disabled'}.`);
    },
    toggleNoCooldowns: () => {
      developerState.noCooldowns = !developerState.noCooldowns;
      logAbilityEvent(`Developer: no cooldowns ${developerState.noCooldowns ? 'enabled' : 'disabled'}`);
      feed(`Developer: no cooldowns ${developerState.noCooldowns ? 'enabled' : 'disabled'}.`);
    },
    applyStatus: status => {
      const target = enemies
        .filter(enemy => enemy.hp > 0)
        .sort((a, b) => Vector3.Distance(a.mesh.position, playerRoot.position) - Vector3.Distance(b.mesh.position, playerRoot.position))[0];
      if (!target) {
        feed('Developer: no enemy available for status testing.');
        return;
      }
      if (status === 'clear') {
        target.statuses = {};
      } else {
        const element: Element = status === 'burn' ? 'fire' : status === 'shock' ? 'lightning' : 'frost';
        target.statuses[element] = 5;
      }
      logAbilityEvent(`Developer: ${status} status applied to nearest enemy`);
      feed(`Developer: ${status} status ${status === 'clear' ? 'cleared' : 'applied'}.`);
    },
  },
);

function activeAbilitySnapshots(): readonly AbilityRuntimeSnapshot[] {
  return abilityComponents.get(active.id)?.all().map(runtime => runtime.snapshot()) ?? [];
}

function castSkill(key: SkillKey): void {
  castAbilitySlot(key === 'Q' ? 1 : 2);
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
  if (inventoryOpen || gameOver) return;
  const component = abilityComponents.get(active.id);
  const runtime = component?.get(slot);
  if (!component || !runtime) {
    feed(`Ability slot ${slot} is not assigned yet.`);
    return;
  }

  const aimDirection = pointerWorld.subtract(playerRoot.position);
  aimDirection.y = 0;
  if (aimDirection.lengthSquared() < 0.0001) aimDirection.z = 1;
  aimDirection.normalize();

  const result = component.requestCast(slot, {
    casterId: active.id,
    casterPosition: playerRoot.position.clone(),
    aimPosition: pointerWorld.clone(),
    aimDirection,
  });
  if (result === 'queued') {
    feed(`${runtime.definition.name} queued.`);
    logAbilityEvent(`${active.name}: ${runtime.definition.name} queued`);
    events.emit('ability.queued', {
      characterId: active.id,
      actionId: runtime.definition.id,
      actionType: 'ability',
    });
  } else if (result === 'interrupted') {
    logAbilityEvent(`${active.name}: prior cast interrupted by ${runtime.definition.name}`);
  } else if (result === 'rejected') {
    feed(`${runtime.definition.name} is not ready.`);
  }
  refreshHud();
}

function cycleControl(direction: 1 | -1): void {
  if (party.length <= 1 || swapInputCooldown > 0 || inventoryOpen || gameOver) return;
  for (let step = 1; step <= party.length; step++) {
    const candidate = (activeIndex + direction * step + party.length) % party.length;
    if (party[candidate].hp <= 0) continue;

    const component = abilityComponents.get(active.id);
    const result = component?.requestExternalAction(
      'swap',
      `swap:${party[candidate].id}`,
      () => swapTo(candidate),
    ) ?? 'executed';

    if (result === 'queued') {
      events.emit('ability.queued', {
        characterId: active.id,
        actionId: `swap:${party[candidate].id}`,
        actionType: 'swap',
      });
    }

    swapInputCooldown = 0.15;
    return;
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
  if (hoveredEnemy === enemy) hoveredEnemy = null;
  if (
    enemy.stateMachine.getCurrentStateId() !== 'dead'
  ) {
    enemy.stateMachine.request(
      'dead',
      'combat-death',
    );
  }

  enemyTelegraphs.cancel(enemy.mesh);
  kills++;
  events.emit('combat.enemyKilled', {
    entityId: enemy.entityId,
    elite: enemy.elite,
    wave,
    totalKills: kills,
  });
  generateLoot(enemy.elite);
  vfxRing(enemy.mesh.position, enemy.elite ? new Color3(1,.35,.7) : new Color3(.5,1,.5), enemy.elite ? 4 : 2, .35);
  enemies = enemies.filter(e => e !== enemy);
  enemyRuntimeWatchdog.remove(enemy.entityId);
  entities.destroy(enemy.entityId);
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
  const resolvedAmount = active.shieldRemaining > 0 ? amount * 0.5 : amount;
  active.hp -= resolvedAmount;
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
  gameplayHud.showGameOver(
    `You reached wave ${wave} with ${kills} kills and found ${loot.length} items.`,
  );
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
      abilityComponents.get(character.id)?.finishCooldowns();
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
      enemyRuntimeWatchdog.remove(enemy.entityId);
      entities.destroy(enemy.entityId);
    }
    enemies = [];
    hoveredEnemy = null;
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

function updateHoveredEnemyFromCursor(): void {
  const pick = scene.pick(
    scene.pointerX,
    scene.pointerY,
    mesh => enemies.some(enemy => enemy.mesh === mesh),
  );
  const next = pick?.hit
    ? enemies.find(enemy => enemy.mesh === pick.pickedMesh) ?? null
    : null;
  if (hoveredEnemy === next) return;
  if (hoveredEnemy) hoveredEnemy.mesh.renderOutline = false;
  hoveredEnemy = next;
  if (hoveredEnemy) {
    hoveredEnemy.mesh.renderOutline = true;
    hoveredEnemy.mesh.outlineColor = new Color3(1, 0.88, 0.35);
    hoveredEnemy.mesh.outlineWidth = 0.06;
  }
  refreshHud();
}

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
    if (input.getContext() !== 'gameplay') return;
    input.notifyPointerDown(pi.event.button);

    if (pi.event.button === 0) {
      canvas.setPointerCapture?.(pi.event.pointerId);
      if (
        !input.isClickToAttackEnabled() &&
        updatePointerWorldFromCursor()
      ) {
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
    updateHoveredEnemyFromCursor();
  }

  if (pi.type === PointerEventTypes.POINTERWHEEL) input.notifyWheel(pi.event.deltaY);
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
document.querySelector('#closeInventory')?.addEventListener('click', () => {
  closeInventory();
  input.setContext('gameplay');
});

function closeInventory(): void {
  if (!inventoryOpen) return;
  inventoryOpen = false;
  partyManagement.setOpen(false);
  movement.endPointerMovement();
}

function handleMenuToggleRequest(): void {
  if (settingsMenu.isOpen()) {
    settingsMenu.setOpen(false);
    input.setContext('gameplay');
    return;
  }

  if (developerConsole.isOpen()) {
    developerConsole.close();
    input.setContext('gameplay');
    return;
  }

  if (inventoryOpen) {
    closeInventory();
    input.setContext('gameplay');
    return;
  }

  settingsMenu.setOpen(true);
}

function flushFrameInfrastructure(): void {
  entities.flushDestroyed();
  events.flush((error, event) => {
    console.error(
      `Event handler failed for ${event.type}.`,
      error,
    );
  });
}

let last = performance.now();
let entityFrame = 0;
let entityStatusTimer = 0;

scene.onBeforeRenderObservable.add(() => {
  entities.beginFrame(entityFrame);
  events.beginFrame(entityFrame);
  entityFrame += 1;
  const now = performance.now();
  const realDt = Math.min((now - last) / 1000, 0.05);
  last = now;
  input.update();
  const dt = combat.update(realDt);
  enemyTelegraphs.update(realDt);
  validationStateMachine.update(realDt);

  if (
    input.consumeEscapePressed() ||
    input.consumePressed('toggleSettings')
  ) {
    handleMenuToggleRequest();
  }

  settingsMenu.update();

  if (input.consumePressed('toggleDeveloperHud')) {
    developerHud.toggle();
  }
  if (input.consumePressed('toggleDeveloperConsole')) {
    developerConsole.toggle();
    input.setContext(developerConsole.isOpen() ? 'developer' : 'gameplay');
  }

  if (settingsMenu.isOpen()) {
    flushFrameInfrastructure();
    input.endFrame();
    return;
  }

  if (developerConsole.isOpen()) {
    combat.hitStopEnabled = developerState.hitStopEnabled;
    combat.damageNumbersEnabled = developerState.damageNumbersEnabled;
    combat.knockbackEnabled = developerState.knockbackEnabled;
    combat.cameraShakeEnabled = developerState.cameraShakeEnabled;
    combat.playerFeedbackEnabled = developerState.playerDamageFeedbackEnabled;
    movementDebug.setVisible(developerState.movementDebugEnabled);
    flushFrameInfrastructure();
    input.endFrame();
    return;
  }

  if (gameOver) {
    flushFrameInfrastructure();
    input.endFrame();
    return;
  }

  if (input.consumePressed('toggleInventory')) {
    inventoryOpen = !inventoryOpen;
    input.setContext(inventoryOpen ? 'inventory' : 'gameplay');
    movement.endPointerMovement();
    partyManagement.setOpen(inventoryOpen);
    renderPartyManagement();
  }

  if (inventoryOpen) {
    flushFrameInfrastructure();
    input.endFrame();
    return;
  }
  const activeAbilityComponent = abilityComponents.get(active.id);
  const requestAbilityAction = (
    type: 'movement' | 'jump' | 'dodge' | 'swap',
    id: string,
    execute: () => void,
  ) => activeAbilityComponent?.requestExternalAction(type, id, execute) ?? 'executed';

  if (input.consumePressed('dodge')) {
    const result = requestAbilityAction('dodge', 'player-dodge', () => movement.requestDodge());
    if (result === 'queued') events.emit('ability.queued', { characterId: active.id, actionId: 'player-dodge', actionType: 'dodge' });
  }
  if (input.consumePressed('jump') && !worldJumpDisabled) {
    const result = requestAbilityAction('jump', 'player-jump', () => movement.requestJump());
    if (result === 'queued') events.emit('ability.queued', { characterId: active.id, actionId: 'player-jump', actionType: 'jump' });
  }
  if (input.consumePressed('ability1')) castAbilitySlot(1);
  if (input.consumePressed('ability2')) castAbilitySlot(2);
  if (input.consumePressed('ability3')) castAbilitySlot(3);
  if (input.consumePressed('ability4')) castAbilitySlot(4);
  if (input.consumePressed('partyNext')) cycleControl(1);
  if (input.consumePressed('partyPrevious')) cycleControl(-1);
  const wheelDirection = input.consumeWheelDirection();
  if (wheelDirection !== 0) cycleControl(wheelDirection);
  const leftClickAttack = input.isClickToAttackEnabled() && (
    input.consumePointerPressed('left') ||
    input.isPointerHeld('left')
  );
  if (
    input.consumePressed('primaryAttack') ||
    input.isHeld('primaryAttack') ||
    input.consumePointerPressed('right') ||
    input.isPointerHeld('right') ||
    leftClickAttack
  ) basicAttack();

  // Repick every frame while held. This keeps steering responsive even when
  // the browser coalesces pointer-move events or the cursor moves across VFX.
  if (
    input.isPointerHeld('left') &&
    !input.isClickToAttackEnabled()
  ) {
    updatePointerWorldFromCursor();
  }

  const gamepadAim = input.getAimAxes();
  if (input.hasGamepadAim()) {
    pointerWorld.copyFrom(
      playerRoot.position.add(
        new Vector3(gamepadAim.x, 0, gamepadAim.y).scale(8),
      ),
    );
    movement.setPointerWorld(pointerWorld);
  }

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
  const moveAxes = input.getMoveAxes();
  const movementRequested =
    Math.abs(moveAxes.x) + Math.abs(moveAxes.z) > 0.001 ||
    (input.isPointerHeld('left') && !input.isClickToAttackEnabled());
  let movementAllowed = true;
  if (movementRequested) {
    const movementResult = requestAbilityAction('movement', 'player-movement', () => undefined);
    movementAllowed = movementResult !== 'queued' && movementResult !== 'rejected';
    if (movementResult === 'queued') {
      events.emit('ability.queued', { characterId: active.id, actionId: 'player-movement', actionType: 'movement' });
    }
  }
  if (movementAllowed) movement.update(dt);

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
    events.emit('world.triggerActivated', {
      triggerId: eventId,
    });
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
  if (
    input.shouldFaceAimDirection() &&
    (abilityComponents.get(active.id)?.canRotateTowardAim() ?? true) &&
    face.lengthSquared() > .01
  ) playerRoot.rotation.y = Math.atan2(face.x, face.z);
  playerCamera.update(dt);
  movementDebug.update(dt, engine.getFps(), movement.getDebugState());
  swapInputCooldown = Math.max(0, swapInputCooldown - dt);

  party.forEach(c => Object.keys(c.cooldowns).forEach(k => c.cooldowns[k as keyof typeof c.cooldowns] = developerState.noCooldowns ? 0 : Math.max(0, c.cooldowns[k as keyof typeof c.cooldowns] - dt)));
  party.forEach(character => {
    abilityComponents.get(character.id)?.update(
      dt,
      developerState.noCooldowns,
      freezeAbilityCastTimers,
    );
    character.shieldRemaining = Math.max(0, character.shieldRemaining - dt);
  });

  for (const p of [...projectiles]) {
    p.mesh.position.addInPlace(p.vel.scale(dt));
    p.ttl -= dt;

    if (p.owner === 'player') {
      const hit = enemies.find(
        enemy => Vector3.Distance(enemy.mesh.position, p.mesh.position) < 0.8,
      );
      if (hit) {
        damageEnemy(
          hit,
          p.damage,
          p.element,
          hit.mesh.position,
          p.mesh.position.subtract(p.vel),
          p.damage >= 40 ? 'heavy' : 'light',
        );
        vfxRing(hit.mesh.position, active.color, 1.35, 0.16);
        p.pierce -= 1;
        if (p.pierce < 0) p.ttl = 0;
      }
    } else if (
      Vector3.Distance(playerRoot.position, p.mesh.position) < 0.85
    ) {
      hurtActive(p.damage);
      vfxRing(playerRoot.position, new Color3(1, 0.2, 0.12), 1.2, 0.15);
      p.pierce -= 1;
      if (p.pierce < 0) p.ttl = 0;
    }

    if (p.ttl <= 0) {
      p.mesh.dispose();
      projectiles.splice(projectiles.indexOf(p), 1);
    }
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
    Object.keys(e.statuses).forEach(k => {
      e.statuses[k as Element] = Math.max(
        0,
        (e.statuses[k as Element] ?? 0) - dt,
      );
    });
    e.attackCd -= dt;

    for (const [abilityId, remaining] of e.abilityCooldowns) {
      e.abilityCooldowns.set(abilityId, Math.max(0, remaining - dt));
    }
    if (!developerState.enemyAiEnabled) return;
    e.stateMachine.update(dt);
    updateEnemyRuntimeWatchdog(e, dt);
  });
  [...enemies].filter(e => e.hp <= 0).forEach(killEnemy);

  const elite = enemies.find(e => e.elite);
  if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) refreshHud();

  entityStatusTimer -= dt;
  if (entityStatusTimer <= 0) {
    entityStatusTimer = 0.5;
    const stats = entities.stats();
    const registeredEnemies = entities.withTag('enemy').length;
    const eventStats = events.stats();
    const assetStats = assets.stats();
    const assetErrors = assets.validate();
    const definitionStats = definitions.stats();
    const definitionErrors = [
      ...definitions.validate(),
      ...combatLibraryValidation.errors,
    ];
    const standardEnemyMachines = enemies
      .filter(enemy => !enemy.elite && enemy.stateMachine)
      .map(enemy => enemy.stateMachine!);
    const standardEnemyStateCounts =
      standardEnemyMachines.reduce<
        Record<EnemyStateId, number>
      >(
        (counts, machine) => {
          const state = machine.getCurrentStateId();
          if (state) counts[state] += 1;
          return counts;
        },
        {
          evaluate: 0,
          reposition: 0,
          casting: 0,
          recover: 0,
          dead: 0,
        },
      );
    const standardEnemyRejected =
      standardEnemyMachines.reduce(
        (sum, machine) =>
          sum +
          machine.snapshot().rejectedTransitionCount,
        0,
      );

    const validationSnapshot = validationStateMachine.snapshot();
    const elevatorSnapshot = outdoorZone.getElevatorStateSnapshot();
    const rejectedTransitions =
      validationSnapshot.rejectedTransitionCount +
      elevatorSnapshot.rejectedTransitionCount +
      standardEnemyRejected;

    developerHud.updateOverview({
      fps: engine.getFps(),
      entities: stats.total,
      enemies: registeredEnemies,
      eventErrors: eventStats.errors,
      assetFailures: assetStats.failed,
      definitionErrors: definitionErrors.length,
      rejectedTransitions,
    });

    developerHud.setPageText(
      'entities',
      [
        'ENTITIES',
        `Total       ${stats.total}`,
        `Active      ${stats.active}`,
        `Disabled    ${stats.disabled}`,
        `Pending     ${stats.destroyPending}`,
        `Enemies     ${registeredEnemies}`,
        `Created     ${entityCreatedCount}`,
        `Destroyed   ${entityDestroyedCount}`,
      ].join('\n'),
    );

    developerHud.setPageText(
      'events',
      [
        'EVENT BUS',
        `Queued      ${eventStats.queued}`,
        `Emitted     ${eventStats.emitted}`,
        `Dispatched  ${eventStats.dispatched}`,
        `Handled     ${eventStats.handled}`,
        `Subscribers ${eventStats.subscribers}`,
        `Errors      ${eventStats.errors}`,
        `Last        ${eventStats.lastEventType ?? 'none'}`,
      ].join('\n'),
    );

    developerHud.setPageText(
      'resources',
      [
        'ASSETS',
        `Total       ${assetStats.total}`,
        `Ready       ${assetStats.ready}`,
        `Loading     ${assetStats.loading}`,
        `Failed      ${assetStats.failed}`,
        `References  ${assetStats.references}`,
        `Materials   ${assetStats.byKind.material}`,
        `Data        ${assetStats.byKind.data}`,
        `Validation  ${assetErrors.length}`,
        '',
        'DEFINITIONS',
        `Total       ${definitionStats.total}`,
        `Kinds       ${definitionStats.kinds}`,
        `Characters  ${definitionStats.byKind.character ?? 0}`,
        `Abilities   ${definitionStats.byKind.ability ?? 0}`,
        `Projectiles ${definitionStats.byKind.projectile ?? 0}`,
        `Statuses    ${definitionStats.byKind['status-effect'] ?? 0}`,
        `Telegraphs  ${definitionStats.byKind.telegraph ?? 0}`,
        `AI usage    ${definitionStats.byKind['ai-ability-usage'] ?? 0}`,
        `Enemies     ${definitionStats.byKind.enemy ?? 0}`,
        `Variants    ${definitionStats.byKind['enemy-variant'] ?? 0}`,
        `Modifiers   ${definitionStats.byKind['elite-modifier'] ?? 0}`,
        `Deprecated  ${definitionStats.deprecated}`,
        `Validation  ${definitionErrors.length}`,
        `Warnings    ${combatLibraryValidation.warnings.length}`,
        '',
        'PLAYER INPUT',
        `Context     ${input.getDiagnostics().context}`,
        `Device      ${input.getDiagnostics().device}`,
        `Controller  ${input.getDiagnostics().gamepadConnected ? 'connected' : 'not connected'}`,
        `Movement    ${input.getDiagnostics().movementScheme}`,
        `Move axes   ${input.getDiagnostics().moveAxes.x.toFixed(2)}, ${input.getDiagnostics().moveAxes.y.toFixed(2)}`,
        `Aim axes    ${input.getDiagnostics().aimAxes.x.toFixed(2)}, ${input.getDiagnostics().aimAxes.y.toFixed(2)}`,
      ].join('\n'),
    );

    const inspectedEnemy = hoveredEnemy && enemies.includes(hoveredEnemy) ? hoveredEnemy : enemies[0];
    const enemyRoleCounts = enemyDefinitions.reduce<Record<string, number>>((counts, definition) => {
      counts[definition.role] = enemies.filter(enemy => enemy.definition.role === definition.role).length;
      return counts;
    }, {});
    developerHud.setPageText(
      'ai',
      [
        'ENEMY ARCHETYPES',
        ...enemyDefinitions.map(definition => `${definition.name.padEnd(14)} ${enemyRoleCounts[definition.role] ?? 0}`),
        '',
        `Elites       ${enemies.filter(enemy => enemy.elite).length}`,
        `Variants     ${enemyVariantDefinitions.length}`,
        `Modifiers    ${eliteModifierDefinitions.length}`,
        '',
        inspectedEnemy ? 'LIVE INSPECTOR' : 'LIVE INSPECTOR\nNo active enemy.',
        ...(inspectedEnemy ? [
          `Name         ${inspectedEnemy.displayName}`,
          `Role         ${inspectedEnemy.definition.role}`,
          `Family       ${inspectedEnemy.family.name}`,
          `Hovered      ${hoveredEnemy === inspectedEnemy ? 'yes' : 'no'}`,
          `Pack Alert   ${inspectedEnemy.stateMachine.blackboard.get('packAlerted') ? 'yes' : 'no'}`,
          `Policy       ${inspectedEnemy.elite ? 'elite' : inspectedEnemy.definition.policy}`,
          `Move Style   ${inspectedEnemy.definition.movementStyle}`,
          'Runtime      tactical > movement > ability',
          `Modifier     ${inspectedEnemy.modifier.name}`,
          `State        ${inspectedEnemy.stateMachine.getCurrentStateId() ?? 'none'}`,
          `HP           ${Math.max(0, inspectedEnemy.hp).toFixed(0)} / ${inspectedEnemy.maxHp.toFixed(0)}`,
          `Distance     ${inspectedEnemy.stateMachine.blackboard.get('distanceToTarget')?.toFixed(1) ?? 'n/a'}`,
          `Band         ${(inspectedEnemy.stateMachine.blackboard.get('minimumRange') ?? 0).toFixed(1)} - ${(inspectedEnemy.stateMachine.blackboard.get('maximumRange') ?? 0).toFixed(1)}`,
          `Preferred    ${inspectedEnemy.stateMachine.blackboard.get('desiredRange')?.toFixed(1) ?? 'n/a'}`,
          `Ability      ${inspectedEnemy.stateMachine.blackboard.get('currentAbilityId') ?? 'none'}`,
          `Ready        ${inspectedEnemy.stateMachine.blackboard.get('selectedAbilityReady') ? 'yes' : 'no'}`,
          `Cooldown     ${(inspectedEnemy.stateMachine.blackboard.get('cooldownRemaining') ?? 0).toFixed(2)}s`,
          `Can Cast     ${inspectedEnemy.stateMachine.blackboard.get('canCast') ? 'yes' : 'no'}`,
          `Position     ${inspectedEnemy.stateMachine.blackboard.get('positioningIntent') ?? 'none'}`,
          `Move Reason  ${inspectedEnemy.stateMachine.blackboard.get('movementReason') ?? 'none'}`,
          `Cast Reason  ${inspectedEnemy.stateMachine.blackboard.get('castReason') ?? 'none'}`,
          `Committed    ${inspectedEnemy.stateMachine.blackboard.get('committed') ? 'yes' : 'no'}`,
          `State Time   ${inspectedEnemy.stateMachine.getTimeInState().toFixed(2)}s`,
          `Watchdog     ${inspectedEnemy.stateMachine.blackboard.get('watchdogStatus') ?? 'n/a'}`,
          `Stationary   ${(inspectedEnemy.stateMachine.blackboard.get('stationaryTime') ?? 0).toFixed(2)}s`,
          `Recoveries   ${inspectedEnemy.stateMachine.blackboard.get('recoveryCount') ?? 0}`,
          `Last Recover ${inspectedEnemy.stateMachine.blackboard.get('lastRecoveryReason') ?? 'none'}`,
          `Cast Resolved ${inspectedEnemy.stateMachine.blackboard.get('castResolved') ? 'yes' : 'no'}`,
          `Telegraph    ${enemyTelegraphs.isBusy(inspectedEnemy.mesh) ? 'active' : 'none'}`,
          `Decisions    ${inspectedEnemy.stateMachine.blackboard.get('decisionCount') ?? 0}`,
        ] : []),
      ].join('\n'),
    );

    developerHud.setPageText(
      'states',
      [
        'VALIDATION',
        `ID          ${validationStateMachine.id}`,
        `Current     ${validationStateMachine.getCurrentStateId() ?? 'none'}`,
        `Previous    ${validationStateMachine.getPreviousStateId() ?? 'none'}`,
        `Time        ${validationStateMachine.getTimeInState().toFixed(2)}s`,
        `Transitions ${validationSnapshot.transitionCount}`,
        `Rejected    ${validationSnapshot.rejectedTransitionCount}`,
        '',
        'ELEVATOR',
        `ID          ${elevatorSnapshot.id}`,
        `Current     ${elevatorSnapshot.currentState ?? 'none'}`,
        `Previous    ${elevatorSnapshot.previousState ?? 'none'}`,
        `Time        ${elevatorSnapshot.timeInState.toFixed(2)}s`,
        `Transitions ${elevatorSnapshot.transitionCount}`,
        `Rejected    ${elevatorSnapshot.rejectedTransitionCount}`,
        '',
        'STANDARD ENEMIES',
        `Machines    ${standardEnemyMachines.length}`,
        `Evaluate    ${standardEnemyStateCounts.evaluate}`,
        `Reposition  ${standardEnemyStateCounts.reposition}`,
        `Casting     ${standardEnemyStateCounts.casting}`,
        `Recover     ${standardEnemyStateCounts.recover}`,
        `Dead        ${standardEnemyStateCounts.dead}`,
        `Rejected    ${standardEnemyRejected}`,
        `Elites      ${enemies.filter(enemy => enemy.elite).length}`,
      ].join('\n'),
    );

    const activeAbilityComponent = abilityComponents.get(active.id);
    const queued = activeAbilityComponent?.getQueued();
    abilityDeveloperPanel.render({
      characterName: active.name,
      queuedAbility: queued?.id,
      abilities: activeAbilitySnapshots(),
      events: abilityEventLog,
      noCooldowns: developerState.noCooldowns,
      castTimersFrozen: freezeAbilityCastTimers,
    });
  }

  flushFrameInfrastructure();
  input.endFrame();
});

partyManagement.setOpen(false);
refreshHud();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
window.addEventListener('beforeunload', () => {
  unsubscribeSettings();
  input.dispose();
  movementDebug.dispose();
  damageNumbers.dispose();
  hitFeedback.dispose();
  enemyTelegraphs.dispose();
  enemyRuntimeWatchdog.clear();
  for (const unsubscribe of eventUnsubscribers) unsubscribe();
  events.clearQueue();
  events.clearSubscriptions();
  entities.clear();
  definitions.clear();
  stateValidationMesh.dispose();
  assets.clear();
  developerHud.dispose();
  settingsMenu.dispose();
  gameplayHud.dispose();
  ui.dispose();
  waterStatus.remove();
});
