import type { EnemyState, EnemyType, RoomModifier, Vector2 } from "./types";
import { DIFFICULTY_DAMAGE_SCALING, DIFFICULTY_HP_SCALING } from "./constants";
import { getBossConfig, isBossType } from "./bosses";

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  xpValue: number;
  coinValue: number;
  size: number;
  projectileSpeed?: number;
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  melee_basic: {
    type: "melee_basic",
    hp: 30,
    speed: 60,
    damage: 10,
    attackRange: 30,
    attackCooldown: 0,
    xpValue: 10,
    coinValue: 5,
    size: 20,
  },
  melee_fast: {
    type: "melee_fast",
    hp: 18,
    speed: 110,
    damage: 7,
    attackRange: 25,
    attackCooldown: 0,
    xpValue: 12,
    coinValue: 6,
    size: 16,
  },
  ranged_basic: {
    type: "ranged_basic",
    hp: 22,
    speed: 40,
    damage: 8,
    attackRange: 250,
    attackCooldown: 2,
    xpValue: 15,
    coinValue: 8,
    size: 18,
    projectileSpeed: 220,
  },
  ranged_spread: {
    type: "ranged_spread",
    hp: 25,
    speed: 35,
    damage: 6,
    attackRange: 220,
    attackCooldown: 2.5,
    xpValue: 20,
    coinValue: 10,
    size: 20,
    projectileSpeed: 200,
  },
};

let nextEnemyId = 0;

export interface EnemyScaling {
  difficulty: number;
  modifier: RoomModifier;
}

export function createEnemy(
  type: EnemyType,
  position: Vector2,
  scaling?: EnemyScaling,
): EnemyState {
  // Handle boss types separately
  if (isBossType(type)) {
    return createBossEnemy(type, position);
  }

  const config = ENEMY_CONFIGS[type];
  if (!config) {
    throw new Error(`Unknown enemy type: ${type}`);
  }

  const behavior = type.startsWith("ranged")
    ? ("kite" as const)
    : ("chase" as const);

  let hp = config.hp;
  let damage = config.damage;
  let speed = config.speed;

  // Apply chapter difficulty scaling
  if (scaling) {
    hp = Math.round(
      hp * (1 + (scaling.difficulty - 1) * DIFFICULTY_HP_SCALING),
    );
    damage = Math.round(
      damage * (1 + (scaling.difficulty - 1) * DIFFICULTY_DAMAGE_SCALING),
    );

    // Apply room modifier
    const mod = scaling.modifier;
    if (mod) {
      if (mod.type === "swarm") {
        hp = Math.round(hp * mod.enemyHpMultiplier);
      } else if (mod.type === "elite") {
        hp = Math.round(hp * mod.enemyHpMultiplier);
        damage = Math.round(damage * mod.enemyDamageMultiplier);
      } else if (mod.type === "fast") {
        speed = Math.round(speed * mod.enemySpeedMultiplier);
      }
    }
  }

  return {
    id: `enemy_${nextEnemyId++}`,
    position: { x: position.x, y: position.y },
    size: { width: config.size, height: config.size },
    hp,
    maxHp: hp,
    alive: true,
    type: config.type,
    behavior,
    speed,
    baseSpeed: speed,
    damage,
    attackCooldown: config.attackCooldown,
    attackRange: config.attackRange,
    xpValue: config.xpValue,
    coinValue: config.coinValue,
    projectileSpeed: config.projectileSpeed,
    spawnTimer: 0.4,
    deathTimer: 0,
    attackWindup: 0,
    statusEffects: [],
    bossPhase: undefined,
    bossPatternTimer: undefined,
    bossDashActive: undefined,
    bossDashTarget: undefined,
    bossInvulnerable: undefined,
  };
}

function createBossEnemy(type: EnemyType, position: Vector2): EnemyState {
  const config = getBossConfig(type);
  if (!config) {
    throw new Error(`Unknown boss type: ${type}`);
  }

  return {
    id: `boss_${nextEnemyId++}`,
    position: { x: position.x, y: position.y },
    size: { width: config.size, height: config.size },
    hp: config.hp,
    maxHp: config.hp,
    alive: true,
    type,
    behavior: "boss_pattern",
    speed: config.speed,
    baseSpeed: config.speed,
    damage: config.damage,
    attackCooldown: 0,
    attackRange: 300,
    xpValue: config.xpValue,
    coinValue: config.coinValue,
    projectileSpeed: 250,
    spawnTimer: 0.8, // Longer spawn animation for bosses
    deathTimer: 0,
    attackWindup: 0,
    statusEffects: [],
    bossPhase: 1,
    bossPatternTimer: 2.0, // Initial delay before first attack
    bossDashActive: false,
    bossDashTarget: undefined,
    bossInvulnerable: false,
  };
}
