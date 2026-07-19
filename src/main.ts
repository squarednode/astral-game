import './style.css';
import './devtools/DeveloperConsole.css';
import './ui/party/PartyManagementScreen.css';
import './ui/actors/DialogueOverlay.css';
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
import {
  EnemyNavigationDebugOverlay,
  EnemyNavigationSystem,
  NavigationSurfaceManager,
  EnemySpawnResolver,
  buildEnemyTraversalLinks,
  capabilitiesForEnemy,
} from './game/enemies/navigation';
import type {
  EnemyNavigationAgentState,
  EnemyNavigationCapabilities,
} from './game/enemies/navigation';
import type {
  AbilityExecutionContext,
  AbilityRuntimeSnapshot,
  AbilityStateId,
} from './game/abilities';
import { PlayerMovementController } from './game/movement/PlayerMovementController';
import { SharedGroundMovementRuntime } from './game/movement/SharedGroundMovementRuntime';
import type { SharedMovementResult } from './game/movement/SharedGroundMovementRuntime';
import { PlayerCameraController } from './game/camera/PlayerCameraController';
import { MovementDebugOverlay } from './ui/debug/MovementDebugOverlay';
import { UIManager } from './ui/core/UIManager';
import { DeveloperHud } from './ui/developer/DeveloperHud';
import { AbilityDeveloperPanel } from './ui/developer/AbilityDeveloperPanel';
import { CombatLibraryPanel } from './ui/developer/CombatLibraryPanel';
import { NavigationDeveloperPanel } from './ui/developer/NavigationDeveloperPanel';
import { CombatSandboxPanel } from './ui/developer/CombatSandboxPanel';
import { StatusDeveloperPanel } from './ui/developer/StatusDeveloperPanel';
import { LootDeveloperPanel } from './ui/developer/LootDeveloperPanel';
import {
  aggregateEquipmentStats,
  GroundLootRuntime,
  InventoryRuntime,
  LootInteractionRuntime,
  LootGenerator,
  describeEquipmentEffect,
  groundLootVisualProfile,
  resolveEquipmentEffects,
  LootRegistry,
} from './game/loot';
import type {
  GeneratedItemInstance,
  GroundLootRecord,
  ItemRarity,
} from './game/loot';
import {
  itemDefinitions,
  itemAffixDefinitions,
  legendaryPowerDefinitions,
  lootTableDefinitions,
} from './game/definitions/loot';
import { StatusRuntime, createStatusDefinitionMap } from './game/status';
import type { StatusComponent } from './game/status';
import { GameplayHud } from './ui/gameplay';
import { SettingsMenu } from './ui/menus';
import type { GameplayHudSnapshot } from './ui/gameplay';
import { CombatSystem } from './game/combat/CombatSystem';
import { DamageNumberManager } from './game/combat/DamageNumberManager';
import { EnemyTelegraphController } from './game/combat/EnemyTelegraphController';
import { HitFeedbackController } from './game/combat/HitFeedbackController';
import type { HitWeight } from './game/combat/CombatTypes';
import { GameBalance } from './game/config/GameBalance';
import { CombatTuning } from './game/config/CombatTuning';
import { combatSandboxTuning } from './game/config/CombatSandboxTuning';
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
import {
  ActionExecutor,
  ActorRegistry,
  ActorRuntime,
  ConditionEvaluator,
  DialogueRuntime,
  WorldInteractionRuntime,
  WorldStateRuntime,
} from './game/actors';
import type {
  ActorStateId,
  ActorVisualProfile,
} from './game/actors';
import {
  actorDefinitions,
  actorDialogueDefinitions,
  actorVisualProfiles,
  interactionProfiles,
} from './game/definitions/actors';
import { DialogueOverlay } from './ui/actors/DialogueOverlay';
import { ActorDeveloperPanel } from './ui/developer/ActorDeveloperPanel';
import type {
  GearFamily,
  GearSlot,
  PartyManagementModel,
} from './ui/party/PartyManagementTypes';

type Element = CharacterElement;
type Rarity = ItemRarity;
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
  | 'return-home'
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
  distanceFromHome: number;
  territoryStatus: 'inside' | 'returning' | 'home';
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
  targetMesh: Mesh;
  targetRadius: number;
  targetHeight: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  elite: boolean;
  attackCd: number;
  abilityCooldowns: Map<string, number>;
  statusComponent: StatusComponent;
  knockbackVelocity: Vector3;
  navigationCapabilities: EnemyNavigationCapabilities;
  navigationState: EnemyNavigationAgentState;
  movementRuntime: SharedGroundMovementRuntime;
  lastMovementResult: SharedMovementResult | null;
  stateMachine: StateMachine<EnemyStateContext, EnemyStateId, EnemyBlackboard>;
}

type LootItem = GeneratedItemInstance;

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

const lootRegistry = new LootRegistry();
for (const definition of itemDefinitions) lootRegistry.registerItem(definition);
for (const definition of itemAffixDefinitions) lootRegistry.registerAffix(definition);
for (const definition of legendaryPowerDefinitions) {
  lootRegistry.registerLegendaryPower(definition);
}
for (const definition of lootTableDefinitions) {
  lootRegistry.registerLootTable(definition);
}
const lootGenerator = new LootGenerator(lootRegistry);
const inventoryRuntime = new InventoryRuntime();
const groundLootRuntime = new GroundLootRuntime();

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
const statusRuntime = new StatusRuntime();
const statusDefinitionMap = createStatusDefinitionMap(statusEffectDefinitions);
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
const enemyTraversalLinks = buildEnemyTraversalLinks(
  outdoorZone.traversalSurfaces,
);
const enemyNavigationSurfaces = new NavigationSurfaceManager(
  outdoorZone.colliders,
  outdoorZone.traversalSurfaces,
  outdoorZone.dynamicColliders,
  outdoorZone.worldVolumes,
);
const enemySpawnResolver = new EnemySpawnResolver(enemyNavigationSurfaces);
const enemyNavigation = new EnemyNavigationSystem(
  enemyNavigationSurfaces,
  enemyTraversalLinks,
);
const enemyNavigationDebug = new EnemyNavigationDebugOverlay(
  scene,
  enemyTraversalLinks,
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
const playerStatusComponent = statusRuntime.createComponent();
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
let enemies: Enemy[] = [];
let hoveredEnemy: Enemy | null = null;
let hoveredGroundLoot: GroundLootRecord | null = null;
let loot: LootItem[] = [];
const groundLootMeshes = new Map<number, Mesh>();
const groundLootBeams = new Map<number, Mesh>();
const groundLootVisualState = new Map<
  number,
  { baseY: number; spinSpeed: number; bobHeight: number; bobSpeed: number }
>();
let lootInteractionRuntime: LootInteractionRuntime;
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
  collisionRadius: number;
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

const walletStatus = document.createElement('div');
walletStatus.id = 'wallet-status';
walletStatus.style.cssText = [
  'position:fixed',
  'top:18px',
  'right:18px',
  'z-index:35',
  'padding:8px 12px',
  'border:1px solid rgba(255,255,255,.22)',
  'border-radius:8px',
  'background:rgba(7,14,24,.82)',
  'color:white',
  'font:700 13px system-ui,sans-serif',
  'pointer-events:none',
].join(';');
document.body.appendChild(walletStatus);

const groundLootHoverLabel = document.createElement('div');
groundLootHoverLabel.id = 'ground-loot-hover-label';
groundLootHoverLabel.hidden = true;
groundLootHoverLabel.style.cssText = [
  'position:fixed',
  'z-index:55',
  'padding:6px 9px',
  'border:1px solid rgba(255,255,255,.3)',
  'border-radius:6px',
  'background:rgba(5,10,18,.94)',
  'color:white',
  'font:700 13px system-ui,sans-serif',
  'pointer-events:none',
  'transform:translate(12px,12px)',
  'white-space:nowrap',
].join(';');
document.body.appendChild(groundLootHoverLabel);

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
  getMoveSpeed: () =>
    active.speed *
    (1 + equipmentStatsFor(active).movementSpeedPercent) *
    worldMovementMultiplier,
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
const navigationDeveloperPanel = new NavigationDeveloperPanel(
  developerHud.getPageContent('ai'),
  developerState,
);
const combatSandboxPanel = new CombatSandboxPanel(
  developerHud.getPageContent('sandbox'),
);
const statusDeveloperPanel = new StatusDeveloperPanel(
  developerHud.getPageContent('status'),
  statusRuntime,
  statusEffectDefinitions,
  () => [
    { entityId: active.id, displayName: `Player: ${active.name}`, component: playerStatusComponent },
    ...enemies.map(enemy => ({ entityId: enemy.entityId, displayName: enemy.displayName, component: enemy.statusComponent })),
  ],
);
function refreshWalletStatus(): void {
  const snapshot = inventoryRuntime.snapshot(bagItems());
  walletStatus.textContent = `Copper ${snapshot.copper}  |  Inventory ${snapshot.used}/${snapshot.capacity}`;
}

function bestCharacterForItem(item: LootItem): { name: string; upgrade: boolean } {
  let bestName = party[0]?.name ?? 'Party';
  let bestGain = Number.NEGATIVE_INFINITY;

  for (const character of party) {
    const current = character.equipment[item.slot];
    const currentPower = current?.power ?? 0;
    const gain = item.power - currentPower;
    if (gain > bestGain) {
      bestGain = gain;
      bestName = character.name;
    }
  }

  return { name: bestName, upgrade: bestGain > 0 };
}

function rarityColor(rarity: Rarity): Color3 {
  switch (rarity) {
    case 'magic':
      return new Color3(0.25, 0.55, 1);
    case 'rare':
      return new Color3(1, 0.82, 0.2);
    case 'legendary':
      return new Color3(1, 0.35, 0.06);
    default:
      return new Color3(0.82, 0.82, 0.82);
  }
}

function createGroundLootMesh(record: GroundLootRecord): void {
  let mesh: Mesh;

  if (record.payload.kind === 'equipment') {
    const item = record.payload.item;
    const profile = groundLootVisualProfile(
      item.slot,
      item.rarity,
      item.visualProfileId,
    );

    switch (profile.primitive) {
      case 'blade':
        mesh = MeshBuilder.CreateBox(
          `ground-loot-${record.id}`,
          { width: 0.12, height: 0.5, depth: 0.07 },
          scene,
        );
        mesh.rotation.z = Math.PI / 4;
        break;
      case 'bow':
        mesh = MeshBuilder.CreateTorus(
          `ground-loot-${record.id}`,
          { diameter: 0.42, thickness: 0.055, tessellation: 20 },
          scene,
        );
        mesh.rotation.x = Math.PI / 2;
        break;
      case 'armor-bundle':
        mesh = MeshBuilder.CreateCylinder(
          `ground-loot-${record.id}`,
          { diameterTop: 0.28, diameterBottom: 0.38, height: 0.34, tessellation: 8 },
          scene,
        );
        break;
      case 'crystal':
        mesh = MeshBuilder.CreatePolyhedron(
          `ground-loot-${record.id}`,
          { type: 1, size: 0.28 },
          scene,
        );
        break;
      default:
        mesh = MeshBuilder.CreateBox(
          `ground-loot-${record.id}`,
          { size: item.rarity === 'legendary' ? 0.42 : 0.3 },
          scene,
        );
        break;
    }

    mesh.scaling.setAll(profile.scale);
    mesh.material = mat(
      `ground-loot-${record.rarity ?? 'common'}`,
      rarityColor(record.rarity ?? 'common'),
      record.rarity === 'legendary' ? 0.65 : 0.35,
    );

    groundLootVisualState.set(record.id, {
      baseY: record.position.y + 0.26,
      spinSpeed: profile.spinSpeed,
      bobHeight: profile.bobHeight,
      bobSpeed: profile.bobSpeed,
    });

    if (profile.beamHeight > 0) {
      const beam = MeshBuilder.CreateCylinder(
        `ground-loot-beam-${record.id}`,
        {
          diameter: profile.beamWidth,
          height: profile.beamHeight,
          tessellation: 12,
        },
        scene,
      );
      beam.position.set(
        record.position.x,
        record.position.y + profile.beamHeight / 2,
        record.position.z,
      );
      beam.material = mat(
        `ground-loot-beam-${record.rarity ?? 'common'}`,
        rarityColor(record.rarity ?? 'common'),
        record.rarity === 'legendary' ? 0.78 : 0.48,
      );
      beam.isPickable = false;
      groundLootBeams.set(record.id, beam);
    }
  } else {
    mesh = MeshBuilder.CreateCylinder(
      `ground-loot-${record.id}`,
      { diameter: 0.24, height: 0.08, tessellation: 16 },
      scene,
    );
    mesh.material = mat(
      `ground-loot-${record.payload.kind}`,
      record.payload.kind === 'currency'
        ? new Color3(0.92, 0.58, 0.12)
        : new Color3(0.35, 0.9, 0.55),
      0.45,
    );
  }

  mesh.position.set(
    record.position.x,
    record.position.y + 0.2,
    record.position.z,
  );
  mesh.isPickable = record.payload.kind === 'equipment';
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    groundLootId: record.id,
  };
  groundLootMeshes.set(record.id, mesh);
}

function updateGroundLootVisuals(nowSeconds: number): void {
  for (const [id, state] of groundLootVisualState) {
    const mesh = groundLootMeshes.get(id);
    if (!mesh || mesh.isDisposed()) continue;
    mesh.rotation.y += state.spinSpeed / 60;
    mesh.position.y =
      state.baseY +
      Math.sin(nowSeconds * state.bobSpeed + id * 0.37) *
        state.bobHeight;
  }
}

function removeGroundLootVisual(id: number): void {
  groundLootMeshes.get(id)?.dispose();
  groundLootMeshes.delete(id);
  groundLootBeams.get(id)?.dispose();
  groundLootBeams.delete(id);
  groundLootVisualState.delete(id);
  if (hoveredGroundLoot?.id === id) {
    hoveredGroundLoot = null;
    groundLootHoverLabel.hidden = true;
    lootInteractionRuntime?.clear();
  }
}

function collectGroundLoot(record: GroundLootRecord): boolean {
  switch (record.payload.kind) {
    case 'currency':
      inventoryRuntime.addCopper(record.payload.amount);
      feed(`Collected ${record.payload.amount} copper.`, 'loot');
      break;
    case 'material':
      inventoryRuntime.addMaterial(
        record.payload.materialId,
        record.payload.amount,
      );
      feed(
        `Collected ${record.payload.amount} ${record.payload.materialId}.`,
        'loot',
      );
      break;
    case 'quest':
      inventoryRuntime.addMaterial(
        `quest:${record.payload.questItemId}`,
        record.payload.amount,
      );
      feed(`Collected quest item: ${record.label}.`, 'loot');
      break;
    case 'equipment': {
      if (!inventoryRuntime.canStore(bagItems())) {
        record.expiresAt = Math.max(
          record.expiresAt,
          performance.now() +
            (record.payload.item.rarity === 'legendary' ? 300_000 : 60_000),
        );
        feed('Inventory full. Equipment remains on the ground.', 'warning');
        return false;
      }

      loot.unshift(record.payload.item);
      const recommendation = bestCharacterForItem(record.payload.item);
      feed(
        `${record.payload.item.rarity.toUpperCase()} PICKUP: ${record.payload.item.name} — best for ${recommendation.name}${recommendation.upgrade ? ' (upgrade)' : ''}`,
        'loot',
      );
      renderPartyManagement();
      break;
    }
  }

  groundLootRuntime.remove(record.id);
  removeGroundLootVisual(record.id);
  refreshWalletStatus();
  lootDeveloperPanel.render();
  if (inventoryOpen) renderPartyManagement();
  return true;
}

lootInteractionRuntime = new LootInteractionRuntime(
  id => groundLootRuntime.get(id),
  record => collectGroundLoot(record),
);

function nearestEquipmentDrop(maximumDistance = 1.45): GroundLootRecord | null {
  let nearest: GroundLootRecord | null = null;
  let nearestDistance = maximumDistance;

  for (const record of groundLootRuntime.all()) {
    if (record.payload.kind !== 'equipment') continue;
    const distance = Vector3.Distance(
      playerRoot.position,
      new Vector3(record.position.x, record.position.y, record.position.z),
    );
    if (distance <= nearestDistance) {
      nearest = record;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function updateGroundLoot(dt: number): void {
  updateGroundLootVisuals(performance.now() / 1000);
  for (const expiredId of groundLootRuntime.update()) {
    removeGroundLootVisual(expiredId);
  }

  for (const record of groundLootRuntime.all()) {
    const distance = Vector3.Distance(
      playerRoot.position,
      new Vector3(record.position.x, record.position.y, record.position.z),
    );

    if (record.payload.kind !== 'equipment') {
      if (distance <= record.pickupRadius) collectGroundLoot(record);
      continue;
    }

    if (
      inventoryRuntime.shouldAutoPickup(record.payload.item) &&
      distance <= 1.8
    ) {
      collectGroundLoot(record);
    }
  }

  const target = hoveredGroundLoot ?? nearestEquipmentDrop();
  if (target) {
    lootInteractionRuntime.target(target.id);
  } else {
    lootInteractionRuntime.clear();
  }

  if (target && input.consumePressed('interact')) {
    lootInteractionRuntime.collect();
  }

  lootInteractionRuntime.update(dt);
}

function spawnEquipmentDrop(item: LootItem, position: Vector3): void {
  const recommendation = bestCharacterForItem(item);
  const visible = inventoryRuntime.shouldShow(item, recommendation.upgrade);
  if (!visible) return;

  const record = groundLootRuntime.spawnEquipment(
    item,
    { x: position.x, y: position.y, z: position.z },
    visible,
  );
  createGroundLootMesh(record);
  feed(
    `${item.rarity.toUpperCase()} DROP: ${item.name}${recommendation.upgrade ? ` — upgrade for ${recommendation.name}` : ''}`,
    'loot',
  );
}

function spawnEnemyCurrency(enemy: Enemy): void {
  const base =
    enemy.definition.role === 'boss'
      ? 12
      : enemy.elite
        ? 5
        : 1 + Math.floor(Math.random() * 3);
  const record = groundLootRuntime.spawnCurrency(base, {
    x: enemy.mesh.position.x + 0.25,
    y: enemy.mesh.position.y,
    z: enemy.mesh.position.z,
  });
  createGroundLootMesh(record);

  const role = enemy.definition.role.toLowerCase();
  const family = enemy.family.familyId.toLowerCase();
  if (role.includes('wolf') || family.includes('wolf')) {
    const material = groundLootRuntime.spawnMaterial(
      'wolf-pelt',
      1,
      {
        x: enemy.mesh.position.x - 0.25,
        y: enemy.mesh.position.y,
        z: enemy.mesh.position.z,
      },
    );
    createGroundLootMesh(material);
  } else if (role.includes('crab') || family.includes('crab')) {
    const material = groundLootRuntime.spawnMaterial(
      'crab-shell',
      1,
      {
        x: enemy.mesh.position.x - 0.25,
        y: enemy.mesh.position.y,
        z: enemy.mesh.position.z,
      },
    );
    createGroundLootMesh(material);
  }
}

const lootDeveloperPanel = new LootDeveloperPanel(
  developerHud.getPageContent('loot'),
  lootRegistry,
  {
    inventory: () => loot,
    snapshot: () => inventoryRuntime.snapshot(bagItems()),
    groundLootCount: () => groundLootRuntime.all().length,
    generate: (tableId, rarity) => {
      const generated = lootGenerator.generateFromTable(tableId, {
        itemLevel: Math.max(1, wave),
        forcedRarity: rarity,
      });
      generated.forEach((item, index) =>
        spawnEquipmentDrop(
          item,
          playerRoot.position.add(new Vector3(index * 0.5 - 0.25, 0, 1.2)),
        ),
      );
      refreshWalletStatus();
    },
    clearUnequipped: () => {
      const equippedIds = new Set(
        party.flatMap(character =>
          equippedItems(character).map(item => item.id),
        ),
      );
      loot = loot.filter(item => equippedIds.has(item.id) || item.favorite);
      renderPartyManagement();
      refreshWalletStatus();
    },
    setMinimumVisibleRarity: rarity => {
      inventoryRuntime.updateFilters({ minimumVisibleRarity: rarity });
    },
    setAutoPickupMaximum: rarity => {
      inventoryRuntime.updateFilters({ autoPickupMaximumRarity: rarity });
    },
    upgradeCapacity: () => {
      const capacity = inventoryRuntime.upgradeCapacity();
      feed(`Inventory capacity increased to ${capacity}.`, 'success');
      refreshWalletStatus();
    },
  },
);
refreshWalletStatus();

const actorRegistry = new ActorRegistry();
actorVisualProfiles.forEach(profile => actorRegistry.registerVisual(profile));
interactionProfiles.forEach(profile => actorRegistry.registerInteraction(profile));
actorDefinitions.forEach(definition => actorRegistry.registerActor(definition));
actorDialogueDefinitions.forEach(definition =>
  actorRegistry.registerDialogue(definition),
);

const worldStateRuntime = new WorldStateRuntime();
const actorRuntimes = new Map<string, ActorRuntime>();
const actorMeshes = new Map<string, Mesh>();
const actorInteractionRuntime = new WorldInteractionRuntime();
let hoveredActorId: string | null = null;
let dialogueActorId: string | null = null;

const actorPrompt = document.createElement('div');
actorPrompt.id = 'actor-interaction-prompt';
actorPrompt.hidden = true;
actorPrompt.style.cssText = [
  'position:fixed',
  'left:50%',
  'bottom:112px',
  'transform:translateX(-50%)',
  'z-index:80',
  'padding:8px 12px',
  'border:1px solid rgba(125,174,242,.38)',
  'border-radius:7px',
  'background:rgba(7,13,23,.91)',
  'color:white',
  'font:700 13px system-ui,sans-serif',
  'pointer-events:none',
].join(';');
document.body.appendChild(actorPrompt);

let dialogueRuntime: DialogueRuntime;
const actorConditionEvaluator = new ConditionEvaluator({
  getWorldFlag: id => worldStateRuntime.getFlag(id),
  getWorldCounter: id => worldStateRuntime.getCounter(id),
  getCurrency: () => inventoryRuntime.getCopper(),
  getMaterial: id => inventoryRuntime.getMaterial(id),
  hasInventorySpace: amount =>
    inventoryRuntime.canStore(bagItems(), amount),
  getActorState: id =>
    actorRuntimes.get(id)?.machine.getCurrentStateId() ?? undefined,
});

const actorActionExecutor = new ActionExecutor({
  notify: (text, tone) =>
    feed(
      text,
      tone === 'success'
        ? 'success'
        : tone === 'warning'
          ? 'warning'
          : 'neutral',
    ),
  setWorldFlag: (id, value) => {
    worldStateRuntime.setFlag(id, value);
  },
  incrementWorldCounter: (id, amount) => {
    worldStateRuntime.incrementCounter(id, amount);
  },
  giveCurrency: (_id, amount) => {
    inventoryRuntime.addCopper(amount);
    refreshWalletStatus();
    if (inventoryOpen) renderPartyManagement();
  },
  removeCurrency: (_id, amount) => {
    const removed = inventoryRuntime.spendCopper(amount);
    if (removed) {
      refreshWalletStatus();
      if (inventoryOpen) renderPartyManagement();
    }
    return removed;
  },
  giveMaterial: (id, amount) => {
    inventoryRuntime.addMaterial(id, amount);
    if (inventoryOpen) renderPartyManagement();
  },
  removeMaterial: (id, amount) => {
    const removed = inventoryRuntime.removeMaterial(id, amount);
    if (removed && inventoryOpen) renderPartyManagement();
    return removed;
  },
  expandInventory: amount => {
    inventoryRuntime.upgradeCapacity(amount);
    refreshWalletStatus();
    if (inventoryOpen) renderPartyManagement();
  },
  startDialogue: id => {
    dialogueRuntime.start(id);
  },
  openMerchant: id => {
    feed(`Merchant framework opened: ${id}.`, 'success');
  },
  startQuest: id => {
    worldStateRuntime.setFlag(`${id}.active`, true);
    feed(`Quest accepted: ${id}.`, 'success');
  },
  advanceQuest: (id, objectiveId, amount = 1) => {
    worldStateRuntime.incrementCounter(
      `${id}.${objectiveId ?? 'progress'}`,
      amount,
    );
  },
  travel: destinationId => {
    worldStateRuntime.setValue('last-destination', destinationId);
    feed(`Travel requested: ${destinationId}.`, 'success');
  },
  setActorState: (actorId, state) => {
    actorRuntimes
      .get(actorId)
      ?.setState(state as ActorStateId);
  },
});

dialogueRuntime = new DialogueRuntime(
  actorConditionEvaluator,
  actorActionExecutor,
);
dialogueRuntime.registerMany(actorDialogueDefinitions);

const dialogueOverlay = new DialogueOverlay(
  ui.getLayer('menus'),
  dialogueRuntime,
  speakerId =>
    actorRegistry.actor(speakerId)?.displayName ?? speakerId,
  () => {
    if (dialogueActorId) {
      actorRuntimes.get(dialogueActorId)?.finishInteraction();
    }
    dialogueActorId = null;
    input.setContext('gameplay');
  },
);

function actorColor(roleTags: readonly string[]): Color3 {
  if (roleTags.includes('merchant')) return new Color3(0.85, 0.56, 0.2);
  if (roleTags.includes('transport')) return new Color3(0.2, 0.68, 0.9);
  if (roleTags.includes('quest-giver')) return new Color3(0.72, 0.4, 0.95);
  if (roleTags.includes('blacksmith')) return new Color3(0.75, 0.28, 0.18);
  return new Color3(0.38, 0.72, 0.48);
}

function createActorMesh(
  actorId: string,
  profile: ActorVisualProfile,
): Mesh {
  let mesh: Mesh;
  switch (profile.primitive) {
    case 'box':
      mesh = MeshBuilder.CreateBox(
        actorId,
        { width: 0.7, height: profile.height, depth: 0.55 },
        scene,
      );
      break;
    case 'cylinder':
      mesh = MeshBuilder.CreateCylinder(
        actorId,
        { diameter: 0.65, height: profile.height, tessellation: 12 },
        scene,
      );
      break;
    case 'sphere':
      mesh = MeshBuilder.CreateSphere(
        actorId,
        { diameter: profile.height },
        scene,
      );
      break;
    case 'capsule':
    default:
      mesh = MeshBuilder.CreateCapsule(
        actorId,
        { height: profile.height, radius: 0.34 },
        scene,
      );
      break;
  }
  return mesh;
}

for (const definition of actorRegistry.allActors()) {
  const profile = actorRegistry.visual(definition.visualProfileId);
  const interaction = definition.interactionProfileId
    ? actorRegistry.interaction(definition.interactionProfileId)
    : undefined;
  if (!profile) continue;

  const runtime = new ActorRuntime(
    definition,
    interaction,
    actorConditionEvaluator,
  );
  const mesh = createActorMesh(definition.id, profile);
  mesh.position.set(
    definition.position.x,
    definition.position.y + profile.height / 2,
    definition.position.z,
  );
  mesh.scaling.setAll(profile.scale);
  mesh.material = mat(
    `actor-${definition.id}`,
    actorColor(definition.roleTags),
    0.16,
  );
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    actorId: definition.id,
  };
  mesh.isPickable = true;

  actorRuntimes.set(definition.id, runtime);
  actorMeshes.set(definition.id, mesh);
}

function dialogueIdForActor(actorId: string): string | undefined {
  return actorRegistry
    .actor(actorId)
    ?.components.find(component => component.type === 'dialogue')
    ?.definitionId;
}

function interactWithActor(actorId: string): void {
  const runtime = actorRuntimes.get(actorId);
  const dialogueId = dialogueIdForActor(actorId);
  if (!runtime) return;

  if (dialogueId) {
    runtime.beginInteraction('talking');
    dialogueActorId = actorId;
    if (dialogueRuntime.start(dialogueId)) {
      dialogueOverlay.render();
      input.setContext('inventory');
      actorDeveloperPanel.render();
      return;
    }
  }

  runtime.beginInteraction('performing');
  feed(`Interacted with ${runtime.definition.displayName}.`);
  runtime.finishInteraction();
}

const actorDeveloperPanel = new ActorDeveloperPanel(
  developerHud.getPageContent('actors'),
  {
    actors: () => [...actorRuntimes.values()],
    dialogue: () => dialogueRuntime,
    worldState: () => worldStateRuntime,
    interact: interactWithActor,
    setState: (actorId, state) =>
      actorRuntimes
        .get(actorId)
        ?.setState(state as ActorStateId),
  },
);

function updateActorHoverFromCursor(): void {
  const pick = scene.pick(
    scene.pointerX,
    scene.pointerY,
    mesh => typeof mesh.metadata?.actorId === 'string',
  );
  hoveredActorId =
    pick?.hit && typeof pick.pickedMesh?.metadata?.actorId === 'string'
      ? pick.pickedMesh.metadata.actorId
      : null;
}

function updateActors(dt: number): void {
  const candidates = [...actorRuntimes.values()].map(runtime => {
    const mesh = actorMeshes.get(runtime.definition.id)!;
    const delta = mesh.position.subtract(playerRoot.position);
    const flat = new Vector3(delta.x, 0, delta.z);
    const forward = new Vector3(
      Math.sin(playerRoot.rotation.y),
      0,
      Math.cos(playerRoot.rotation.y),
    );
    return {
      actor: runtime,
      distance: flat.length(),
      directlyHovered: hoveredActorId === runtime.definition.id,
      inFront:
        flat.lengthSquared() <= 0.0001 ||
        Vector3.Dot(forward, flat.normalize()) > 0.2,
    };
  });

  const targeted = actorInteractionRuntime.select(candidates);
  for (const candidate of candidates) {
    candidate.actor.update(
      dt,
      candidate.distance,
      targeted === candidate.actor,
    );
    const mesh = actorMeshes.get(candidate.actor.definition.id);
    if (mesh) {
      mesh.visibility =
        candidate.actor.machine.getCurrentStateId() === 'hidden' ? 0 : 1;
      const targetedScale = targeted === candidate.actor ? 1.08 : 1;
      mesh.scaling.setAll(targetedScale);
    }
  }

  if (targeted && !dialogueRuntime.snapshot().active) {
    const profile = targeted.interaction;
    actorPrompt.textContent =
      `[E] ${profile?.promptVerb ?? 'Interact with'} ${targeted.definition.displayName}`;
    actorPrompt.hidden = false;
  } else {
    actorPrompt.hidden = true;
  }

  if (
    targeted &&
    !dialogueRuntime.snapshot().active &&
    input.consumePressed('interact')
  ) {
    interactWithActor(targeted.definition.id);
  }
}

combatSandboxTuning.subscribe(values => {
  for (const enemy of enemies) {
    const healthRatio = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 1;
    const waveScale = 1 + (wave - 1) * 0.18;
    const roleHealthScale = enemy.elite
      ? CombatTuning.elites.healthScale
      : enemy.definition.role === 'boss'
        ? CombatTuning.bosses.healthScale
        : CombatTuning.enemies.healthScale;
    enemy.maxHp =
      enemy.definition.maxHp *
      enemy.variant.hpMultiplier *
      enemy.modifier.hpMultiplier *
      roleHealthScale *
      values.enemyHealthScale *
      waveScale;
    enemy.hp = Math.min(enemy.maxHp, enemy.maxHp * healthRatio);
    enemy.healthComponent.maximum = enemy.maxHp;
    enemy.healthComponent.current = enemy.hp;

    const baseTargetScale = 0.5;
    const visualRatio = values.targetVolumeScale / baseTargetScale;
    enemy.targetMesh.scaling.setAll(visualRatio);
    enemy.targetRadius = enemy.definition.targetRadius * values.targetVolumeScale;
    enemy.stateMachine.request('evaluate', 'combat-sandbox-updated');
  }
});
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

function isAbilityActive(state: AbilityStateId): boolean {
  return state === 'casting' || state === 'executing';
}

function equippedItems(c: CharacterState): LootItem[] {
  return Object.values(c.equipment).filter(
    (item): item is LootItem => Boolean(item),
  );
}

function bagItems(): LootItem[] {
  const equippedIds = new Set(
    party.flatMap(character =>
      equippedItems(character).map(item => item.id),
    ),
  );
  return loot.filter(item => !equippedIds.has(item.id));
}

function equipmentStatsFor(c: CharacterState) {
  return aggregateEquipmentStats(equippedItems(c));
}

function equipmentEffectsFor(c: CharacterState) {
  return resolveEquipmentEffects(equippedItems(c));
}

function elementalDamageMultiplierFor(
  c: CharacterState,
  element: Element,
): number {
  const effects = equipmentEffectsFor(c);
  const elemental =
    element === 'fire' || element === 'frost' || element === 'lightning'
      ? effects.elementalDamageMultipliers[element]
      : 1;
  return effects.allDamageMultiplier * elemental;
}

function powerFor(c = active): number {
  return 100 + equipmentStatsFor(c).power;
}

function attackFor(c = active): number {
  return Math.max(1, c.attackDamage + equipmentStatsFor(c).attack);
}

function hpMax(c: CharacterState): number {
  return Math.max(25, c.maxHp + equipmentStatsFor(c).maximumHealth);
}

function swapBonusFor(c: CharacterState): number {
  return equipmentStatsFor(c).swapDamage;
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
      summary: (() => {
        const equipment = equipmentStatsFor(character);
        return {
          power: Math.min(100, 35 + attackFor(character) * 1.6),
          defense: Math.min(
            100,
            25 +
              hpMax(character) * 0.28 +
              equipment.armor * 4 +
              (character.preferredFamily === 'fortified' ? 22 : 0),
          ),
          mobility: Math.min(
            100,
            character.speed * 8 +
              equipment.technique +
              equipment.movementSpeedPercent * 100,
          ),
          support: Math.min(
            100,
            18 +
              equipment.focus * 2 +
              equipment.statusPotencyPercent * 100 +
              (character.id === 'warden' ? 35 : 0),
          ),
        };
      })(),
    })),
    items: loot,
    resources: inventoryRuntime.snapshot(bagItems()),
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
  lootDeveloperPanel.render();
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
  lootDeveloperPanel.render();
  refreshWalletStatus();
}

function toggleFavoriteLoot(itemId: number): void {
  const item = loot.find(candidate => candidate.id === itemId);
  if (!item) return;
  item.favorite = !item.favorite;
  feed(`${item.favorite ? 'Favorited' : 'Unfavorited'} ${item.name}.`);
  renderPartyManagement();
  lootDeveloperPanel.render();
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

function enemyTargetPoint(enemy: Enemy): Vector3 {
  return enemy.mesh.position.add(new Vector3(0, enemy.targetHeight * 0.12, 0));
}

function enemyTargetDistance(enemy: Enemy, point: Vector3): number {
  return Vector3.Distance(enemyTargetPoint(enemy), point);
}

function effectiveDetectionRange(enemy: Enemy): number {
  return enemy.definition.detectionRange * combatSandboxTuning.get().detectionRangeScale;
}

function effectiveLeashRange(enemy: Enemy): number {
  return enemy.definition.leashRange * combatSandboxTuning.get().leashRangeScale;
}

function effectivePackAlertRange(enemy: Enemy): number {
  return enemy.family.alertRadius * combatSandboxTuning.get().packAlertRangeScale;
}

function enemyIsOutsideTerritory(enemy: Enemy): boolean {
  const home = enemy.stateMachine.blackboard.get('homePosition');
  return Vector3.Distance(enemy.mesh.position, home) > effectiveLeashRange(enemy);
}

function executeEnemyAbility(enemy: Enemy, usage: AiAbilityUsageDefinition): void {
  const ability = definitions.require<AbilityDefinition>(usage.abilityId);
  const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
  const power = (ability.power ?? ability.damage ?? enemy.damage) * usage.powerMultiplier;

  if (ability.projectileId) {
    const projectileDefinition = definitions.get<ProjectileDefinition>(
      ability.projectileId,
    );
    const direction = playerRoot.position.add(new Vector3(0, 0.7, 0)).subtract(enemy.mesh.position);
    direction.y = 0;
    if (direction.lengthSquared() > 0.001) direction.normalize();
    const projectile = MeshBuilder.CreateSphere(
      `enemy-projectile-${ability.id}`,
      { diameter: Math.max(
        0.12,
        (projectileDefinition?.radius ?? 0.16) *
          2 *
          combatSandboxTuning.get().projectileVisualScale,
      ) },
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
      collisionRadius:
      (projectileDefinition?.radius ?? 0.16) *
      combatSandboxTuning.get().projectileCollisionScale,
    });
  } else if (ability.id === 'ability.retreat') {
    const away = enemy.mesh.position.subtract(playerRoot.position);
    away.y = 0;
    if (away.lengthSquared() > 0.001) {
      const desired = enemy.mesh.position.add(away.normalize().scale(ability.range));
      applyWorldAwareEnemyMovement(enemy, desired, 0.1);
    }
  } else if (
    ability.id === 'ability.charge' ||
    ability.id === 'ability.dash' ||
    ability.id === 'ability.leap'
  ) {
    const toward = playerRoot.position.subtract(enemy.mesh.position);
    toward.y = 0;
    if (toward.lengthSquared() > 0.001) {
      const desired = enemy.mesh.position.add(
        toward
          .normalize()
          .scale(Math.min(ability.range, Math.max(0, distance - 1.35))),
      );
      applyWorldAwareEnemyMovement(enemy, desired, 0.1);
    }
  }

  if (ability.abilityTags.includes('defensive')) {
    const restore = Math.max(8, power * 0.5);
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + restore);
    enemy.healthComponent.current = enemy.hp;

    if (enemy.definition.role === 'mother-wolf') {
      for (const ally of enemies) {
        if (ally === enemy || ally.definition.familyId !== 'wolf') continue;
        if (Vector3.Distance(ally.mesh.position, enemy.mesh.position) > effectivePackAlertRange(enemy)) continue;
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
    hurtActive(Math.max(enemy.damage * combatSandboxTuning.get().enemyDamageScale, power));
  }

  const color = ability.element === 'fire'
    ? new Color3(1, 0.28, 0.08)
    : ability.element === 'frost'
      ? new Color3(0.45, 0.85, 1)
      : ability.element === 'lightning'
        ? new Color3(0.75, 0.65, 1)
        : new Color3(1, 0.55, 0.2);
  vfxRing(enemy.mesh.position, color, Math.max(1.5, ability.radius ?? 2.2), 0.28);
  enemy.abilityCooldowns.set(
    ability.id,
    ability.cooldown * usage.cooldownMultiplier * combatSandboxTuning.get().enemyCooldownScale,
  );
  enemy.attackCd = 0.2;
}

function toEnemyRuntimeActor(enemy: Enemy): EnemyRuntimeActor {
  return {
    definition: enemy.definition,
    position: enemy.mesh.position,
    speed: enemy.speed * combatSandboxTuning.get().enemySpeedScale,
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

function applyWorldAwareEnemyMovement(
  enemy: Enemy,
  desiredPosition: Vector3,
  dt: number,
): void {
  const startPosition = enemy.mesh.position.clone();
  const homePosition = enemy.stateMachine.blackboard.get('homePosition');
  const nearbyObstaclePositions = enemies
    .filter(candidate => candidate !== enemy && candidate.hp > 0)
    .map(candidate => candidate.mesh.position);
  const resolution = enemyNavigation.resolve({
    currentPosition: enemy.mesh.position,
    desiredPosition,
    homePosition,
    leashRange: effectiveLeashRange(enemy),
    role: enemy.definition.role,
    capabilities: enemy.navigationCapabilities,
    state: enemy.navigationState,
    dt,
    nearbyObstaclePositions,
    agentId: enemy.entityId,
  });

  const movementResult = enemy.movementRuntime.resolveToward(
    resolution.position,
    desiredPosition,
    dt,
    enemy.navigationState.traversalPhase === 'takeoff'
      ? enemy.navigationState.traversalMovementMode ?? 'jump'
      : 'none',
  );
  enemy.lastMovementResult = movementResult;
  if (enemy.navigationState.traversalPhase === 'takeoff' && !movementResult.grounded) {
    enemy.navigationState.traversalPhase = 'airborne';
  } else if (enemy.navigationState.traversalPhase === 'airborne' && movementResult.grounded) {
    enemy.navigationState.traversalPhase = 'landing';
    enemy.navigationState.traversalSettleRemaining = 0.2;
  } else if (enemy.navigationState.traversalPhase === 'landing') {
    enemy.navigationState.traversalPhase = 'settle';
  }
  enemy.navigationState.grounded = movementResult.grounded;
  enemy.navigationState.verticalVelocity = enemy.movementRuntime.getVerticalVelocity();
  enemy.navigationState.supportHeight = movementResult.supportHeight;
  const resolvedSupport = enemyNavigationSurfaces.sampleSupport(
    enemy.mesh.position.x,
    enemy.mesh.position.z,
  );
  const resolvedFootprint = enemyNavigationSurfaces.sampleFootprint(
    enemy.mesh.position,
    enemy.navigationCapabilities.radius + enemy.navigationCapabilities.navigationSkin,
  );
  enemy.navigationState.supportRatio = resolvedFootprint.ratio;
  enemy.navigationState.surfaceType = resolvedSupport.type;
  enemy.navigationState.supportSurfaceId =
    movementResult.supportSurfaceId ?? resolvedSupport.surfaceId;
  enemy.navigationState.sweepResult = movementResult.blocked
    ? 'blocked'
    : movementResult.slid
      ? 'slide'
      : 'clear';
  if (movementResult.failure !== 'none') {
    enemy.navigationState.lastBlockedReason = movementResult.failure === 'no-progress'
      ? 'stale-path'
      : movementResult.failure === 'ground-lost'
        ? 'no-ground-ahead'
        : 'body-overlap';
  }

  enemyNavigationDebug.showRoute(
    enemy.entityId,
    startPosition,
    desiredPosition,
    resolution.mode === 'blocked' || movementResult.blocked,
  );

  if (resolution.failureReason !== 'none' || movementResult.failure !== 'none') {
    enemy.stateMachine.blackboard.set(
      'movementReason',
      `movement: ${movementResult.failure !== 'none' ? movementResult.failure : resolution.failureReason}`,
    );
    enemy.stateMachine.blackboard.set(
      'watchdogStatus',
      movementResult.failure !== 'none' ? movementResult.failure : resolution.failureReason,
    );
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
      maximumRange: effectiveDetectionRange(enemy),
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
      distanceFromHome: 0,
      territoryStatus: 'home',
    },
  );

  return machine
    .addState({
      id: 'evaluate',
      enter: (_context, activeMachine) => {
        const blackboard = activeMachine.blackboard;
        blackboard.set('decisionCount', blackboard.get('decisionCount') + 1);
        const homeDistance = Vector3.Distance(enemy.mesh.position, blackboard.get('homePosition'));
        blackboard.set('distanceFromHome', homeDistance);
        if (homeDistance > effectiveLeashRange(enemy)) {
          blackboard.set('territoryStatus', 'returning');
          blackboard.set('movementReason', 'outside leash radius');
          blackboard.set('positioningIntent', 'advance');
          activeMachine.request('return-home', 'territory-leash-exceeded');
          return;
        }
        blackboard.set('territoryStatus', homeDistance < 0.4 ? 'home' : 'inside');
        const distance = Vector3.Distance(enemy.mesh.position, playerRoot.position);
        if (
          distance > effectiveDetectionRange(enemy) &&
          !blackboard.get('packAlerted')
        ) {
          blackboard.set('distanceToTarget', distance);
          blackboard.set('canCast', false);
          blackboard.set('positioningIntent', 'none');
          blackboard.set('movementReason', 'player outside detection zone');
          activeMachine.request('recover', 'outside-detection-zone');
          return;
        }
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
        const homeDistance = Vector3.Distance(enemy.mesh.position, blackboard.get('homePosition'));
        blackboard.set('distanceFromHome', homeDistance);
        if (homeDistance > effectiveLeashRange(enemy)) {
          blackboard.set('territoryStatus', 'returning');
          activeMachine.request('return-home', 'territory-leash-exceeded');
          return;
        }
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

        const slow = statusRuntime.getMovementMultiplier(enemy.statusComponent, statusDefinitionMap);
        const orbitDirection = blackboard.get('decisionCount') % 2 === 0 ? 1 : -1;
        const desiredPosition = enemy.mesh.position.clone();
        enemyTactics.movement.apply(
          desiredPosition,
          playerRoot.position,
          movement,
          enemy.speed * combatSandboxTuning.get().enemySpeedScale * slow,
          dt,
          orbitDirection,
        );
        applyWorldAwareEnemyMovement(enemy, desiredPosition, dt);

        if (activeMachine.getTimeInState() >= combatSandboxTuning.get().decisionIntervalSeconds) {
          activeMachine.request('evaluate', 'tactical-replan');
        }
      },
    })
    .addState({
      id: 'casting',
      enter: (_context, activeMachine) => {
        if (enemyIsOutsideTerritory(enemy)) {
          enemyTelegraphs.cancel(enemy.mesh);
          activeMachine.blackboard.set('territoryStatus', 'returning');
          activeMachine.request('return-home', 'territory-leash-exceeded');
          return;
        }
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
    .addState({
      id: 'return-home',
      enter: (_context, activeMachine) => {
        enemyTelegraphs.cancel(enemy.mesh);
        activeMachine.blackboard.set('committed', false);
        activeMachine.blackboard.set('canCast', false);
        activeMachine.blackboard.set('castReason', 'returning to territory');
        activeMachine.blackboard.set('positioningIntent', 'advance');
        activeMachine.blackboard.set('movementReason', 'returning to home position');
        activeMachine.blackboard.set('territoryStatus', 'returning');
      },
      update: (_context, activeMachine, dt) => {
        if (enemy.hp <= 0) {
          activeMachine.request('dead', 'health-depleted');
          return;
        }
        const home = activeMachine.blackboard.get('homePosition');
        const toHome = home.subtract(enemy.mesh.position);
        toHome.y = 0;
        const distance = toHome.length();
        activeMachine.blackboard.set('distanceFromHome', distance);
        if (distance <= 0.35) {
          enemy.mesh.position.x = home.x;
          enemy.mesh.position.z = home.z;
          enemy.attackCd = 0;
          enemy.abilityCooldowns.clear();
          statusRuntime.cleanse(enemy.statusComponent, () => true);
          activeMachine.blackboard.set('packAlerted', false);
          activeMachine.blackboard.set('territoryStatus', 'home');
          activeMachine.request('evaluate', 'returned-home');
          return;
        }
        if (toHome.lengthSquared() > 0.001) {
          toHome.normalize();
          const desiredPosition = enemy.mesh.position.add(
            toHome.scale(
              enemy.speed *
              combatSandboxTuning.get().enemySpeedScale *
              enemy.definition.returnSpeedMultiplier *
              dt,
            ),
          );
          applyWorldAwareEnemyMovement(enemy, desiredPosition, dt);
        }
      },
    })
    .addState({ id: 'dead', enter: () => enemyTelegraphs.cancel(enemy.mesh) });
}

function updateEnemyRuntimeWatchdog(enemy: Enemy, dt: number): void {
  const machine = enemy.stateMachine;
  if (enemy.navigationState.mode === 'blocked') {
    enemy.navigationState.blockedTime += dt;
    machine.blackboard.set(
      'watchdogStatus',
      `navigation: ${enemy.navigationState.failureReason}`,
    );
    if (enemy.navigationState.blockedTime > 1.25) {
      machine.blackboard.set(
        'lastRecoveryReason',
        enemy.navigationState.failureReason,
      );
      machine.blackboard.set(
        'recoveryCount',
        machine.blackboard.get('recoveryCount') + 1,
      );
      enemy.navigationState.blockedTime = 0;
      enemy.navigationState.lastReplanAt = performance.now();
      machine.request(
        enemyIsOutsideTerritory(enemy) ? 'return-home' : 'evaluate',
        'navigation-watchdog-replan',
      );
      return;
    }
  } else {
    enemy.navigationState.blockedTime = 0;
  }
  const result = enemyRuntimeWatchdog.update(
    {
      entityId: enemy.entityId,
      state: machine.getCurrentStateId(),
      timeInState: machine.getTimeInState(),
      position: enemy.mesh.position,
      goalPosition:
        machine.getCurrentStateId() === 'return-home'
          ? machine.blackboard.get('homePosition')
          : machine.blackboard.get('lastSeenPosition'),
      movementIntent: machine.blackboard.get('positioningIntent'),
      recoverDuration: enemy.definition.recoverDuration,
      hasSelectedAbility: Boolean(machine.blackboard.get('currentUsageId')),
      telegraphBusy: enemyTelegraphs.isBusy(enemy.mesh),
      movementFailure: enemy.lastMovementResult?.failure ?? 'none',
    },
    dt,
  );

  machine.blackboard.set('watchdogStatus', result.reason);
  machine.blackboard.set('stationaryTime', Math.max(result.stationaryTime, result.noProgressTime));
  if (result.action === 'none') return;

  machine.blackboard.set(
    'recoveryCount',
    machine.blackboard.get('recoveryCount') + 1,
  );
  machine.blackboard.set('lastRecoveryReason', result.reason);

  if (result.action === 'return-home-failsafe') {
    const home = machine.blackboard.get('homePosition');
    const occupied = enemies
      .filter(candidate => candidate !== enemy && candidate.hp > 0)
      .map(candidate => candidate.mesh.position);
    const spawnResolution = enemySpawnResolver.resolve(
      home,
      enemy.navigationCapabilities,
      occupied,
      Math.min(6, effectiveLeashRange(enemy)),
      16,
    );
    if (!spawnResolution.position) {
      machine.request('evaluate', 'return-home-failsafe-no-valid-position');
      return;
    }
    enemy.mesh.position.copyFrom(spawnResolution.position);
    enemy.movementRuntime.reset(spawnResolution.supportHeight);
    enemy.navigationState.lastValidPosition.copyFrom(enemy.mesh.position);
    enemy.navigationState.pathAge = 0;
    enemy.navigationState.blockedTime = 0;
    machine.blackboard.set('territoryStatus', 'home');
    machine.request('evaluate', 'return-home-failsafe-reset');
    return;
  }

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
    const recoveryCount = machine.blackboard.get('recoveryCount');
    const movementGoal = machine.getCurrentStateId() === 'return-home'
      ? machine.blackboard.get('homePosition')
      : playerRoot.position;
    const actorOffset = Math.max(0, enemy.mesh.position.y - enemy.movementRuntime.getSupportHeight());
    const escape = recoveryCount >= 3
      ? enemyNavigationSurfaces.findEscapePosition(
          enemy.mesh.position,
          movementGoal,
          enemy.navigationCapabilities.radius + enemy.navigationCapabilities.navigationSkin,
          actorOffset,
          enemy.navigationCapabilities.minimumSupportRatio,
          Math.min(5.5, effectiveLeashRange(enemy) * 0.35),
        )
      : null;

    if (escape) {
      enemy.lastMovementResult = enemy.movementRuntime.resolveToward(
        escape,
        movementGoal,
        dt,
      );
      enemy.navigationState.routeGoal = escape.clone();
      enemy.navigationState.pathAge = 0;
      enemy.navigationState.pathGeneration += 1;
      enemy.navigationState.lastBlockedReason = 'none';
      machine.blackboard.set('recoveryCount', 0);
      machine.blackboard.set('movementReason', 'movement: escape waypoint');
    } else if (recoveryCount >= 12) {
      const occupied = enemies
        .filter(candidate => candidate !== enemy && candidate.hp > 0)
        .map(candidate => candidate.mesh.position);
      const safeReset = enemySpawnResolver.resolve(
        enemy.mesh.position,
        enemy.navigationCapabilities,
        occupied,
        4.5,
        20,
      );
      if (safeReset.position) {
        enemy.mesh.position.x = safeReset.position.x;
        enemy.mesh.position.z = safeReset.position.z;
        enemy.movementRuntime.reset(safeReset.supportHeight);
        enemy.navigationState.lastValidPosition.copyFrom(enemy.mesh.position);
        enemy.navigationState.pathAge = 0;
        enemy.navigationState.pathGeneration += 1;
        enemy.navigationState.lastBlockedReason = 'none';
        machine.blackboard.set('recoveryCount', 0);
        machine.blackboard.set('movementReason', 'movement: validated local reset');
      }
    } else {
      const toGoal = movementGoal.subtract(enemy.mesh.position);
      toGoal.y = 0;
      if (toGoal.lengthSquared() > 0.001) {
        toGoal.normalize();
        const tangent = new Vector3(-toGoal.z, 0, toGoal.x);
        const direction = machine.blackboard.get('decisionCount') % 2 === 0 ? 1 : -1;
        const nudgeGoal = enemy.mesh.position.add(tangent.scale(0.45 * direction));
        enemy.lastMovementResult = enemy.movementRuntime.resolveToward(
          nudgeGoal,
          movementGoal,
          dt,
        );
      }
    }
    machine.request('evaluate', escape ? 'watchdog-escape-waypoint' : 'watchdog-replan-nudge');
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
  const navigationCapabilities = capabilitiesForEnemy(definition);

  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 4;
  const requestedSpawn = spawnPosition?.clone() ?? new Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius,
  );
  const spawnResolution = enemySpawnResolver.resolve(
    requestedSpawn,
    navigationCapabilities,
    enemies.map(candidate => candidate.mesh.position),
  );
  enemyNavigationDebug.showSpawnCandidates(spawnResolution.candidates);
  if (!spawnResolution.position) {
    feed(
      `${displayName} spawn rejected: ${spawnResolution.failureReason}.`,
      'warning',
    );
    return;
  }
  const mesh = definition.role === 'brute' || definition.role === 'boss'
    ? MeshBuilder.CreateIcoSphere(`enemy-${definition.role}`, { radius: definition.role === 'boss' ? 1.45 : elite ? 1.1 : 0.9, subdivisions: 2 }, scene)
    : definition.role === 'crab'
      ? MeshBuilder.CreateBox('enemy-crab', { width: 1.5, height: 0.55, depth: 1.05 }, scene)
      : MeshBuilder.CreateCapsule(`enemy-${definition.role}`, { height: definition.role.includes('mage') || definition.role === 'frost-caster' || definition.role === 'mother-wolf' ? 1.8 : 1.5, radius: definition.role === 'wolf' ? 0.40 : elite ? 0.56 : 0.46 }, scene);
  const y = definition.role === 'boss' ? 1.45 : definition.role === 'brute' ? (elite ? 1.1 : 0.9) : definition.role === 'crab' ? 0.3 : 0.75;
  mesh.position.set(
    spawnResolution.position.x,
    spawnResolution.supportHeight + y,
    spawnResolution.position.z,
  );
  const [r, g, b] = definition.color;
  const [mr, mg, mb] = modifier.colorShift;
  mesh.material = mat(`enemy-${definition.role}-${variant.variantId}-${modifier.modifierId}`, new Color3(Math.min(1, r + mr), Math.min(1, g + mg), Math.min(1, b + mb)), elite ? 0.2 : 0.04);
  shadows.addShadowCaster(mesh);

  const waveScale = 1 + (wave - 1) * 0.18;
  const roleHealthScale = elite
    ? CombatTuning.elites.healthScale
    : definition.role === 'boss'
      ? CombatTuning.bosses.healthScale
      : CombatTuning.enemies.healthScale;
  const hp =
    definition.maxHp *
    variant.hpMultiplier *
    modifier.hpMultiplier *
    roleHealthScale *
    combatSandboxTuning.get().enemyHealthScale *
    waveScale;
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

  const targetMesh = MeshBuilder.CreateSphere(
    `enemy-target-${enemyEntity.id}`,
    {
      diameter:
        definition.targetRadius *
        2 *
        combatSandboxTuning.get().targetVolumeScale,
      segments: 12,
    },
    scene,
  );
  targetMesh.parent = mesh;
  targetMesh.position.set(0, 0, 0);
  targetMesh.visibility = 0.001;
  targetMesh.isPickable = true;
  targetMesh.metadata = {
    enemyEntityId: enemyEntity.id,
    targetVolume: true,
  };

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
    targetMesh,
    targetRadius:
      definition.targetRadius *
      combatSandboxTuning.get().targetVolumeScale,
    targetHeight: definition.targetHeight,
    hp,
    maxHp: hp,
    speed:
      definition.movementSpeed *
      variant.speedMultiplier *
      modifier.speedMultiplier *
      CombatTuning.enemies.movementSpeedScale,
    damage:
      definition.baseDamage *
      variant.damageMultiplier *
      modifier.damageMultiplier *
      CombatTuning.enemies.damageScale *
      (1 + wave * 0.08),
    elite,
    attackCd: Math.random(),
    abilityCooldowns: new Map<string, number>(),
    statusComponent: statusRuntime.createComponent(),
    knockbackVelocity: Vector3.Zero(),
    navigationCapabilities,
    navigationState: {
      mode: 'idle',
      failureReason: 'none',
      verticalVelocity: 0,
      grounded: true,
      supportHeight: spawnResolution.supportHeight,
      surfaceType: enemyNavigationSurfaces.sampleSupport(
        spawnResolution.position.x,
        spawnResolution.position.z,
      ).type,
      supportSurfaceId: enemyNavigationSurfaces.sampleSupport(
        spawnResolution.position.x,
        spawnResolution.position.z,
      ).surfaceId,
      pathValid: true,
      pathAge: 0,
      lastBlockedReason: 'none',
      supportRatio: 1,
      sweepResult: 'clear',
      pathGeneration: 1,
      lastGoalPosition: null,
      activeTraversalLinkId: null,
      routeGoal: null,
      lastValidPosition: mesh.position.clone(),
      lastReplanAt: performance.now(),
      blockedTime: 0,
      platformWaitTime: 0,
      traversalPhase: 'idle',
      traversalLandingPosition: null,
      traversalExitPosition: null,
      traversalSettleRemaining: 0,
      traversalAttemptCount: 0,
      traversalLastAttemptAt: 0,
      traversalCooldownUntil: 0,
      traversalOwner: null,
      traversalMovementMode: null,
      reservedLandingSurfaceId: null,
    },
    movementRuntime: null as unknown as SharedGroundMovementRuntime,
    lastMovementResult: null,
  });
  enemy.movementRuntime = new SharedGroundMovementRuntime(
    mesh,
    outdoorZone.colliders,
    outdoorZone.traversalSurfaces,
    navigationCapabilities.radius + navigationCapabilities.navigationSkin,
    y,
  );
  enemy.movementRuntime.reset(spawnResolution.supportHeight);
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
  let final =
    amount * powerScale * elementalDamageMultiplierFor(active, element);
  let resolvedWeight = weight;

  const hasFrostStatus =
    statusRuntime.has(enemy.statusComponent, 'status.frost') ||
    statusRuntime.has(enemy.statusComponent, 'status.chill') ||
    statusRuntime.has(enemy.statusComponent, 'status.freeze');

  if (element === 'physical' && hasFrostStatus) {
    final *= 1.65;
    statusRuntime.remove(enemy.statusComponent, 'status.frost', 'dispelled');
    statusRuntime.remove(enemy.statusComponent, 'status.chill', 'dispelled');
    statusRuntime.remove(enemy.statusComponent, 'status.freeze', 'dispelled');
    resolvedWeight = 'reaction';
    vfxRing(hitPos, new Color3(0.65, 0.9, 1), 2.4);
    combat.showReaction(hitPos, 'SHATTER', 'frost');
    feed('SHATTER!');
  }

  if (element === 'lightning' && hasFrostStatus) {
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
      if (Vector3.Distance(ally.mesh.position, enemy.mesh.position) > effectivePackAlertRange(enemy)) continue;
      ally.stateMachine.blackboard.set('packAlerted', true);
      ally.stateMachine.request('evaluate', 'pack-alert');
    }
  }

  enemy.hp -= final;
  enemy.healthComponent.current = enemy.hp;
  if (element !== 'physical') {
    const statusId = element === 'fire'
      ? 'status.burn'
      : element === 'frost'
        ? 'status.chill'
        : element === 'lightning'
          ? 'status.shock'
          : undefined;
    const definition = statusId ? statusDefinitionMap.get(statusId) : undefined;
    if (definition) {
      const equipmentEffects = equipmentEffectsFor(active);
      const durationMultiplier =
        equipmentEffects.statusDurationMultiplier *
        (equipmentEffects.statusDurationById[definition.id] ?? 1);
      statusRuntime.apply(enemy.statusComponent, {
        definition,
        ownerEntityId: enemy.entityId,
        sourceEntityId: active.id,
        durationSeconds: definition.duration * durationMultiplier,
      });
    }
  }
  combat.applyEnemyHit({ target: enemy, damage: final, element, worldPosition: hitPos, sourcePosition, weight: resolvedWeight });
}
function basicAttack(): void {
  if (active.cooldowns.attack > 0 || inventoryOpen || gameOver) return;
  active.cooldowns.attack = active.attackCooldown;
  const basicTarget = hoveredEnemy && enemies.includes(hoveredEnemy)
    ? enemyTargetPoint(hoveredEnemy)
    : pointerWorld.clone();
  const dir = basicTarget.subtract(playerRoot.position); dir.y = 0;
  if (dir.lengthSquared() < 0.01) return;
  dir.normalize();
  if (active.attackRange < 4) {
    vfxRing(playerRoot.position.add(dir.scale(1.3)), active.color, active.attackRange * 1.15, 0.23);
    enemies.filter(e => Vector3.Distance(e.mesh.position, playerRoot.position.add(dir.scale(1.1))) < active.attackRange).forEach(e => damageEnemy(e, attackFor(), active.element));
  } else {
    const orb = MeshBuilder.CreateSphere(
      'projectile',
      {
        diameter:
          0.36 *
          combatSandboxTuning.get().projectileVisualScale,
      },
      scene,
    );
    orb.position = playerRoot.position.add(new Vector3(0, 0.8, 0)).add(dir.scale(0.8));
    orb.material = mat('projectile', active.color, 0.8);
    projectiles.push({ mesh: orb, vel: dir.scale(15), ttl: 1.0, damage: attackFor(), element: active.element, pierce: 0, owner: 'player', collisionRadius:
      0.18 *
      combatSandboxTuning.get().projectileCollisionScale,
    });
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

function equipmentProjectileDirections(
  direction: Vector3,
  character: CharacterState,
): Vector3[] {
  const count = Math.max(
    1,
    1 + equipmentEffectsFor(character).projectileCountBonus,
  );
  if (count === 1) return [direction.clone()];

  const spreadRadians = Math.min(0.42, 0.11 * (count - 1));
  return Array.from({ length: count }, (_, index) => {
    const offset =
      count === 1
        ? 0
        : -spreadRadians / 2 + (spreadRadians * index) / (count - 1);
    const cosine = Math.cos(offset);
    const sine = Math.sin(offset);
    return new Vector3(
      direction.x * cosine - direction.z * sine,
      0,
      direction.x * sine + direction.z * cosine,
    ).normalize();
  });
}

function executeAbility(context: AbilityExecutionContext): void {
  const { definition, request } = context;
  const direction = request.aimDirection.clone();
  direction.y = 0;
  if (direction.lengthSquared() > 0.0001) direction.normalize();

  if (definition.executorId === 'fireball') {
    const orb = MeshBuilder.CreateSphere('ability-fireball', {
        diameter:
          0.52 *
          combatSandboxTuning.get().projectileVisualScale,
      },
      scene,
    );
    orb.dispose();
    const projectileSpeed =
      14 * equipmentEffectsFor(active).projectileSpeedMultiplier;
    for (const [index, projectileDirection] of equipmentProjectileDirections(
      direction,
      active,
    ).entries()) {
      const projectile = MeshBuilder.CreateSphere(
        `ability-fireball-${index}`,
        {
          diameter:
            0.52 *
            combatSandboxTuning.get().projectileVisualScale,
        },
        scene,
      );
      projectile.position = request.casterPosition
        .add(new Vector3(0, 0.85, 0))
        .add(projectileDirection.scale(0.9));
      projectile.material = mat(
        'ability-fireball',
        new Color3(1, 0.32, 0.08),
        0.85,
      );
      projectiles.push({
        mesh: projectile,
        vel: projectileDirection.scale(projectileSpeed),
        ttl: definition.range / projectileSpeed,
        damage: definition.damage ?? 0,
        element: 'fire',
        pierce: 0,
        owner: 'player',
        collisionRadius:
          0.26 *
          combatSandboxTuning.get().projectileCollisionScale,
      });
    }
    vfxRing(request.casterPosition, new Color3(1, 0.35, 0.08), 1.8, 0.18);
    return;
  }

  if (definition.executorId === 'ice-spear') {
    const spear = MeshBuilder.CreateCylinder(
      'ability-ice-spear',
      {
        diameter:
          0.28 *
          combatSandboxTuning.get().projectileVisualScale,
        height:
          1.4 *
          combatSandboxTuning.get().projectileVisualScale,
        tessellation: 8,
      },
      scene,
    );
    spear.dispose();
    const projectileSpeed =
      17 * equipmentEffectsFor(active).projectileSpeedMultiplier;
    for (const [index, projectileDirection] of equipmentProjectileDirections(
      direction,
      active,
    ).entries()) {
      const projectile = MeshBuilder.CreateCylinder(
        `ability-ice-spear-${index}`,
        {
          diameter:
            0.28 *
            combatSandboxTuning.get().projectileVisualScale,
          height:
            1.4 *
            combatSandboxTuning.get().projectileVisualScale,
          tessellation: 8,
        },
        scene,
      );
      projectile.rotation.x = Math.PI / 2;
      projectile.rotation.y = Math.atan2(
        projectileDirection.x,
        projectileDirection.z,
      );
      projectile.position = request.casterPosition
        .add(new Vector3(0, 0.8, 0))
        .add(projectileDirection.scale(0.9));
      projectile.material = mat(
        'ability-ice-spear',
        new Color3(0.35, 0.82, 1),
        0.75,
      );
      projectiles.push({
        mesh: projectile,
        vel: projectileDirection.scale(projectileSpeed),
        ttl: definition.range / projectileSpeed,
        damage: definition.damage ?? 0,
        element: 'frost',
        pierce: 1,
        owner: 'player',
        collisionRadius:
          0.18 *
          combatSandboxTuning.get().projectileCollisionScale,
      });
    }
    return;
  }

  if (definition.executorId === 'blink') {
    performBlink(request.aimPosition, definition.range);
    return;
  }

  if (definition.executorId === 'shield') {
    active.shieldRemaining = Math.max(
      active.shieldRemaining,
      (definition.duration ?? 4) * equipmentEffectsFor(active).shieldDurationMultiplier,
    );
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
  active.cooldowns.swap =
    0.42 / equipmentEffectsFor(active).swapCooldownRate;
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

  const resolvedAimPosition = hoveredEnemy && enemies.includes(hoveredEnemy)
    ? enemyTargetPoint(hoveredEnemy)
    : pointerWorld.clone();
  const aimDirection = resolvedAimPosition.subtract(playerRoot.position);
  aimDirection.y = 0;
  if (aimDirection.lengthSquared() < 0.0001) aimDirection.z = 1;
  aimDirection.normalize();

  const result = component.requestCast(slot, {
    casterId: active.id,
    casterPosition: playerRoot.position.clone(),
    aimPosition: resolvedAimPosition.clone(),
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

function lootTableForEnemy(enemy: Enemy): string {
  if (enemy.definition.role === 'boss') return 'loot.wolf-keeper';
  if (enemy.elite) return 'loot.elite';

  const role = enemy.definition.role.toLowerCase();
  const family = enemy.family.familyId.toLowerCase();
  if (role.includes('crab') || family.includes('crab')) return 'loot.crab';
  if (role.includes('wolf') || family.includes('wolf')) return 'loot.wolf';

  return 'loot.standard-enemy';
}

function generateLoot(enemy: Enemy, forcedRarity?: Rarity): void {
  const tableId = lootTableForEnemy(enemy);
  const generated = lootGenerator.generateFromTable(tableId, {
    itemLevel: Math.max(1, wave),
    elite: enemy.elite,
    boss: enemy.definition.role === 'boss',
    forcedRarity,
  });

  for (const [index, item] of generated.entries()) {
    spawnEquipmentDrop(
      item,
      enemy.mesh.position.add(
        new Vector3((index - (generated.length - 1) / 2) * 0.45, 0, 0.35),
      ),
    );
  }

  spawnEnemyCurrency(enemy);
  lootDeveloperPanel.render();
  refreshWalletStatus();
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
  enemy.targetMesh.dispose();
  kills++;
  events.emit('combat.enemyKilled', {
    entityId: enemy.entityId,
    elite: enemy.elite,
    wave,
    totalKills: kills,
  });
  generateLoot(enemy);
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
    const generated = lootGenerator.generateFromTable(
      rarity === 'legendary' ? 'loot.elite' : 'loot.standard-enemy',
      {
        itemLevel: Math.max(1, wave),
        forcedRarity: rarity,
      },
    );

    generated.forEach((item, index) =>
      spawnEquipmentDrop(
        item,
        playerRoot.position.add(
          new Vector3((index - (generated.length - 1) / 2) * 0.5, 0, 1.2),
        ),
      ),
    );
    lootDeveloperPanel.render();
    refreshWalletStatus();
  },

  clearInventory: () => {
    loot = [];
    renderPartyManagement();
    lootDeveloperPanel.render();
    refreshWalletStatus();
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
    mesh => Boolean(mesh.metadata?.targetVolume),
  );
  const pickedEntityId = pick?.pickedMesh?.metadata?.enemyEntityId as string | undefined;
  const next = pick?.hit && pickedEntityId
    ? enemies.find(enemy => enemy.entityId === pickedEntityId) ?? null
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

function updateHoveredGroundLootFromCursor(event?: PointerEvent): void {
  const pick = scene.pick(
    scene.pointerX,
    scene.pointerY,
    mesh => typeof mesh.metadata?.groundLootId === 'number',
  );
  const groundLootId = pick?.pickedMesh?.metadata?.groundLootId as
    | number
    | undefined;
  hoveredGroundLoot =
    pick?.hit && groundLootId !== undefined
      ? groundLootRuntime.get(groundLootId) ?? null
      : null;

  if (!hoveredGroundLoot) {
    groundLootHoverLabel.hidden = true;
    return;
  }

  const recommendation =
    hoveredGroundLoot.payload.kind === 'equipment'
      ? bestCharacterForItem(hoveredGroundLoot.payload.item)
      : null;
  const suffix = recommendation
    ? ` — ${recommendation.upgrade ? 'Upgrade for' : 'Best for'} ${recommendation.name}`
    : '';
  groundLootHoverLabel.textContent =
    `${hoveredGroundLoot.label}${suffix}  [${input.getBindingLabel('interact')}]`;
  groundLootHoverLabel.style.left =
    `${event?.clientX ?? scene.pointerX}px`;
  groundLootHoverLabel.style.top =
    `${event?.clientY ?? scene.pointerY}px`;
  groundLootHoverLabel.hidden = false;
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
      updateHoveredGroundLootFromCursor(pi.event);
      if (hoveredGroundLoot) {
        lootInteractionRuntime.target(hoveredGroundLoot.id);
        lootInteractionRuntime.collect();
        return;
      }

      updateActorHoverFromCursor();
      if (hoveredActorId) {
        const runtime = actorRuntimes.get(hoveredActorId);
        const mesh = actorMeshes.get(hoveredActorId);
        if (
          runtime &&
          mesh &&
          Vector3.Distance(mesh.position, playerRoot.position) <=
            (runtime.interaction?.range ?? 0)
        ) {
          interactWithActor(hoveredActorId);
          return;
        }
      }

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
    updateHoveredGroundLootFromCursor(pi.event);
    updateActorHoverFromCursor();
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
  updateGroundLoot(realDt);
  input.update();
  const dt = combat.update(realDt);
  updateActors(dt);
  enemyTelegraphs.update(realDt);
  validationStateMachine.update(realDt);

  if (dialogueRuntime.snapshot().active && input.consumeEscapePressed()) {
    dialogueOverlay.close();
  } else if (
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
      equipmentEffectsFor(character).abilityCooldownRate,
    );
    character.shieldRemaining = Math.max(0, character.shieldRemaining - dt);
  });

  for (const p of [...projectiles]) {
    p.mesh.position.addInPlace(p.vel.scale(dt));
    p.ttl -= dt;

    if (p.owner === 'player') {
      const hit = enemies.find(
        enemy => enemyTargetDistance(enemy, p.mesh.position) <= enemy.targetRadius + p.collisionRadius,
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
      Vector3.Distance(playerRoot.position.add(new Vector3(0, 0.7, 0)), p.mesh.position) < 0.68 + p.collisionRadius
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
  enemyNavigationDebug.setSettings({
    showSpawnCandidates: developerState.enemySpawnCandidatesVisible,
    showTraversalLinks: developerState.enemyTraversalLinksVisible,
    showPlannedMovement: developerState.enemyNavigationRoutesVisible,
    showInvalidLandingPoints: developerState.enemyInvalidLandingsVisible,
  });

  statusRuntime.update(playerStatusComponent, statusDefinitionMap, dt, {
    damage: (_ownerEntityId, amount) => {
      active.hp = Math.max(0, active.hp - amount);
    },
    heal: (_ownerEntityId, amount) => {
      active.hp = Math.min(hpMax(active), active.hp + amount);
    },
  });

  enemies.forEach(e => {
    combat.updateKnockback(e, dt);
    statusRuntime.update(e.statusComponent, statusDefinitionMap, dt, {
      damage: (_ownerEntityId, amount, definition) => {
        e.hp -= amount;
        e.healthComponent.current = e.hp;
        combat.applyEnemyHit({
          target: e,
          damage: amount,
          element: definition.tags.includes('fire') ? 'fire' : definition.tags.includes('ice') ? 'frost' : 'physical',
          worldPosition: e.mesh.position,
          sourcePosition: e.mesh.position,
          weight: 'light',
        });
      },
      heal: (_ownerEntityId, amount) => {
        e.hp = Math.min(e.maxHp, e.hp + amount);
        e.healthComponent.current = e.hp;
      },
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
  if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) { refreshHud(); statusDeveloperPanel.refresh(); }

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

    const standardEnemyStateCounts: Record<EnemyStateId, number> = {
      evaluate: 0,
      reposition: 0,
      casting: 0,
      recover: 0,
      'return-home': 0,
      dead: 0,
    };

    for (const machine of standardEnemyMachines) {
      const state = machine.getCurrentStateId();
      if (state) standardEnemyStateCounts[state] += 1;
    }
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
      activeStatuses: statusDeveloperPanel.getActiveInstanceCount(),
      activeAbilities: [...abilityComponents.values()].reduce(
        (count, component) => count + component.all().filter(runtime => isAbilityActive(runtime.snapshot().state)).length,
        0,
      ),
      aiDecisions: enemies.reduce(
        (count, enemy) => count + (enemy.stateMachine.blackboard.get('decisionCount') ?? 0),
        0,
      ),
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
          `Target Vol   r${inspectedEnemy.targetRadius.toFixed(2)} h${inspectedEnemy.targetHeight.toFixed(2)}`,
          `Territory    ${inspectedEnemy.stateMachine.blackboard.get('territoryStatus') ?? 'n/a'}`,
          `Home Dist    ${(inspectedEnemy.stateMachine.blackboard.get('distanceFromHome') ?? 0).toFixed(1)} / ${inspectedEnemy.definition.leashRange.toFixed(1)}`,
          '',
          'NAVIGATION',
          `Nav Mode     ${inspectedEnemy.navigationState.mode}`,
          `Nav Failure  ${inspectedEnemy.navigationState.failureReason}`,
          `Grounded     ${inspectedEnemy.navigationState.grounded ? 'yes' : 'no'}`,
          `Support      ${inspectedEnemy.navigationState.supportHeight.toFixed(2)}`,
          `Surface      ${inspectedEnemy.navigationState.surfaceType}`,
          `Surface ID   ${inspectedEnemy.navigationState.supportSurfaceId ?? 'ground'}`,
          `Path Valid   ${inspectedEnemy.navigationState.pathValid ? 'yes' : 'no'}`,
          `Path Age     ${inspectedEnemy.navigationState.pathAge.toFixed(2)}s`,
          `Path Gen     ${inspectedEnemy.navigationState.pathGeneration}`,
          `Nav Radius   ${inspectedEnemy.navigationCapabilities.radius.toFixed(2)} + ${inspectedEnemy.navigationCapabilities.navigationSkin.toFixed(2)}`,
          `Support %    ${(inspectedEnemy.navigationState.supportRatio * 100).toFixed(0)}%`,
          `Sweep        ${inspectedEnemy.navigationState.sweepResult}`,
          `Last Block   ${inspectedEnemy.navigationState.lastBlockedReason}`,
          `Last Replan  ${((performance.now() - inspectedEnemy.navigationState.lastReplanAt) / 1000).toFixed(2)}s`,
          `Traversal    ${inspectedEnemy.navigationState.activeTraversalLinkId ?? 'none'}`,
          `Trav Phase   ${inspectedEnemy.navigationState.traversalPhase}`,
          `Trav Attempts ${inspectedEnemy.navigationState.traversalAttemptCount}`,
          `Landing Res  ${inspectedEnemy.navigationState.reservedLandingSurfaceId ?? 'none'}`,
          `Blocked      ${inspectedEnemy.navigationState.blockedTime.toFixed(2)}s`,
          `Can Jump     ${inspectedEnemy.navigationCapabilities.canJump ? 'yes' : 'no'}`,
          `Can Drop     ${inspectedEnemy.navigationCapabilities.canDrop ? 'yes' : 'no'}`,
          `Platforms    ${inspectedEnemy.navigationCapabilities.canUsePlatforms ? 'yes' : 'no'}`,
          `Decisions    ${inspectedEnemy.stateMachine.blackboard.get('decisionCount') ?? 0}`,
        ] : []),
      ].join('\n'),
    );

    const navigationFailureCounts = enemies.reduce<Record<string, number>>(
      (counts, enemy) => {
        const reason = enemy.navigationState.lastBlockedReason;
        if (reason !== 'none') counts[reason] = (counts[reason] ?? 0) + 1;
        return counts;
      },
      {},
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
        `Return Home ${standardEnemyStateCounts['return-home']}`,
        `Dead        ${standardEnemyStateCounts.dead}`,
        `Rejected    ${standardEnemyRejected}`,
        `Elites      ${enemies.filter(enemy => enemy.elite).length}`,
        '',
        'NAVIGATION REJECTIONS',
        `Solid       ${navigationFailureCounts['blocked-by-solid'] ?? 0}`,
        `Dynamic     ${navigationFailureCounts['blocked-by-dynamic-obstacle'] ?? 0}`,
        `No Ground   ${navigationFailureCounts['no-ground-ahead'] ?? 0}`,
        `Landing     ${navigationFailureCounts['invalid-landing'] ?? 0}`,
        `Traversal   ${navigationFailureCounts['traversal-link-unavailable'] ?? 0}`,
        `Territory   ${navigationFailureCounts['outside-navigation-zone'] ?? 0}`,
        `Platform    ${navigationFailureCounts['platform-timeout'] ?? 0}`,
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
