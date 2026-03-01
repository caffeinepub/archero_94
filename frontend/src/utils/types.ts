export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  size: { width: number; height: number };
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface PlayerState extends Entity {
  velocity: Vector2;
  speed: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  damageReduction: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  coins: number;
  skills: ActiveSkill[];
  isMoving: boolean;
  attackCooldown: number;
  invincibilityFrames: number;
  facingDirection: Vector2;
  abilityCooldowns: Record<string, number>;
  shieldActive: boolean;
  shieldCooldown: number;
  // Base stats (hero + permanent upgrades, before in-run skills)
  baseMaxHp: number;
  baseAttackDamage: number;
  baseAttackSpeed: number;
  baseCritChance: number;
  baseDamageReduction: number;
}

export type EnemyType =
  | "melee_basic"
  | "melee_fast"
  | "ranged_basic"
  | "ranged_spread"
  | "boss_golem"
  | "boss_dragon"
  | "boss_wizard";

export type EnemyBehavior = "chase" | "kite" | "circle" | "boss_pattern";

export interface StatusEffect {
  type: ProjectileEffect;
  duration: number;
  tickTimer: number;
}

export interface EnemyState extends Entity {
  type: EnemyType;
  behavior: EnemyBehavior;
  speed: number;
  baseSpeed: number;
  damage: number;
  attackCooldown: number;
  attackRange: number;
  xpValue: number;
  coinValue: number;
  projectileSpeed?: number;
  spawnTimer: number;
  deathTimer: number;
  attackWindup: number;
  statusEffects: StatusEffect[];
  // Boss-specific fields
  bossPhase?: number;
  bossPatternTimer?: number;
  bossDashActive?: boolean;
  bossDashTarget?: Vector2;
  bossInvulnerable?: boolean;
}

export type ProjectileEffect = "poison" | "freeze" | "burn";

export interface Projectile {
  id: string;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  owner: "player" | "enemy";
  piercing: boolean;
  bounces: number;
  effects: ProjectileEffect[];
  alive: boolean;
  hitEntities: Set<string>;
  homing: boolean;
}

export interface Drop {
  id: string;
  position: Vector2;
  type: "xp" | "coin" | "hp";
  value: number;
  magnetRange: number;
  alive: boolean;
}

export type ObstacleType = "rock" | "water" | "bush";

export interface Obstacle {
  position: Vector2;
  width: number;
  height: number;
  type: ObstacleType;
}

export interface WaveConfig {
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number;
}

export type RoomModifier =
  | { type: "swarm"; enemyHpMultiplier: number; enemyCountMultiplier: number }
  | {
      type: "elite";
      enemyHpMultiplier: number;
      enemyDamageMultiplier: number;
      enemyCountMultiplier: number;
    }
  | { type: "fast"; enemySpeedMultiplier: number }
  | null;

export interface RoomConfig {
  id: number;
  waves: WaveConfig[];
  isBoss: boolean;
  modifier?: RoomModifier;
}

export interface ChapterConfig {
  id: number;
  name: string;
  rooms: RoomConfig[];
  backgroundColor: string;
  difficulty: number;
}

export type SkillId =
  | "multishot"
  | "diagonal_arrows"
  | "rear_arrow"
  | "piercing"
  | "bounce"
  | "ricochet"
  | "homing"
  | "poison"
  | "freeze"
  | "burn"
  | "attack_speed_up"
  | "damage_up"
  | "crit_chance_up"
  | "hp_up"
  | "shield"
  | "circle_damage"
  | "meteor"
  | "sword_spin"
  | "hp_regen"
  | "dodge_chance"
  | "damage_reduction";

export interface ActiveSkill {
  id: SkillId;
  level: number;
  name: string;
  description: string;
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  maxLevel: number;
  icon: string;
  category: "attack" | "projectile" | "stat" | "ability" | "passive";
  apply: (player: PlayerState, level: number) => void;
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
  gravity: number;
  sizeDecay: number;
  alive: boolean;
}

export interface DamageNumber {
  id: string;
  position: Vector2;
  value: number;
  isCrit: boolean;
  lifetime: number;
  maxLifetime: number;
  alive: boolean;
}

export interface AbilityEffect {
  type: "circle" | "meteor" | "sword_spin" | "shield_break";
  position: Vector2;
  radius: number;
  timer: number;
}

export interface ScreenShakeEvent {
  intensity: number;
  duration: number;
}

export interface GameState {
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: Projectile[];
  drops: Drop[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
  currentRoom: number;
  currentWave: number;
  totalRooms: number;
  roomCleared: boolean;
  chapterId: number;
  chapterName: string;
  isPaused: boolean;
  isSkillSelection: boolean;
  gameOver: boolean;
  victory: boolean;
  abilityEffects: AbilityEffect[];
  frameCount: number;
  camera: Vector2;
  killCount: number;
  spawnQueue: SpawnEntry[];
  roomTransitionTimer: number;
  doorActive: boolean;
  doorPosition: Vector2;
  roomModifier: RoomModifier;
  runTimer: number;
  obstacles: Obstacle[];
  screenShakeEvents: ScreenShakeEvent[];
  audioEvents: string[];
}

export interface PermanentBonuses {
  maxHpBonus: number;
  attackDamagePercent: number;
  attackSpeedPercent: number;
  critChanceBonus: number;
  damageReductionBonus: number;
}

export interface SpawnEntry {
  type: EnemyType;
  position: Vector2;
  delay: number;
}

export interface InputState {
  joystickActive: boolean;
  joystickDirection: Vector2;
  joystickMagnitude: number;
}

export interface PlayerProgress {
  coins: number;
  highestChapter: number;
  totalRuns: number;
  totalKills: number;
  permanentUpgrades: PermanentUpgrade[];
  unlockedHeroes: string[];
  selectedHero: string;
}

export interface PermanentUpgrade {
  id: string;
  level: number;
  maxLevel: number;
  costPerLevel: number;
  statBoost: { stat: string; valuePerLevel: number };
}
