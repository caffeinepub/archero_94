import type {
  GameState,
  InputState,
  PlayerState,
  EnemyState,
  DamageNumber,
  Vector2,
  WaveConfig,
  RoomModifier,
  PermanentBonuses,
} from "./types";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BASE_XP_THRESHOLD,
  CAMERA_LERP_SPEED,
  DOOR_COLLISION_RANGE,
  ENEMY_DEATH_DURATION,
  HERO_CONFIGS,
  PLAYER_ATTACK_RANGE,
  PLAYER_CRIT_CHANCE,
  PLAYER_CRIT_MULTIPLIER,
  PLAYER_INVINCIBILITY_DURATION,
  PLAYER_SIZE,
  ROOM_CLEAR_PAUSE,
  DIFFICULTY_HP_SCALING,
  DIFFICULTY_DAMAGE_SCALING,
  XP_SCALING,
} from "./constants";
import { createProjectile, updateProjectiles } from "./projectiles";
import { checkProjectileHits, distanceSq } from "./collision";
import { updateEnemies } from "./enemyAI";
import { createSpawnQueue, processSpawnQueue } from "./spawner";
import { getChapter, getRoomConfig } from "./chapters";
import { createDropsFromEnemy, updateDrops } from "./drops";
import { acquireSkill, getSkillLevel, hasSkill } from "./skills";
import { updateBoss } from "./bossAI";
import { isBossType } from "./bosses";
import {
  updateParticles,
  createHitSpark,
  createDeathBurst,
  createLevelUpSparkles,
  createCoinCollectSparkle,
  createXpCollectSparkle,
  createPlayerDeathExplosion,
} from "./particles";
import {
  generateObstacles,
  resolveObstacleCollision,
  projectileHitsObstacle,
} from "./obstacles";

const DAMAGE_NUMBER_LIFETIME = 0.8;
let nextDamageNumberId = 0;

function createInitialPlayer(
  bonuses?: PermanentBonuses,
  heroId?: string,
): PlayerState {
  const hero = HERO_CONFIGS[heroId ?? "archer"] ?? HERO_CONFIGS.archer;

  const baseMaxHp = hero.hp + (bonuses?.maxHpBonus ?? 0);
  const baseAttackDamage = Math.round(
    hero.damage * (1 + (bonuses?.attackDamagePercent ?? 0)),
  );
  const baseAttackSpeed =
    hero.attackSpeed * (1 + (bonuses?.attackSpeedPercent ?? 0));
  const baseCritChance = PLAYER_CRIT_CHANCE + (bonuses?.critChanceBonus ?? 0);
  const baseDamageReduction = bonuses?.damageReductionBonus ?? 0;

  return {
    id: "player",
    position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
    size: { width: PLAYER_SIZE, height: PLAYER_SIZE },
    velocity: { x: 0, y: 0 },
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    alive: true,
    speed: hero.speed,
    attackDamage: baseAttackDamage,
    attackSpeed: baseAttackSpeed,
    attackRange: PLAYER_ATTACK_RANGE,
    critChance: baseCritChance,
    critMultiplier: PLAYER_CRIT_MULTIPLIER,
    dodgeChance: 0,
    damageReduction: baseDamageReduction,
    xp: 0,
    xpToNextLevel: 50,
    level: 1,
    coins: 0,
    skills: [],
    isMoving: false,
    attackCooldown: 0,
    invincibilityFrames: 0,
    facingDirection: { x: 0, y: -1 },
    abilityCooldowns: {},
    shieldActive: false,
    shieldCooldown: 0,
    baseMaxHp,
    baseAttackDamage,
    baseAttackSpeed,
    baseCritChance,
    baseDamageReduction,
  };
}

function applyDifficultyScaling(
  wave: WaveConfig,
  difficulty: number,
  modifier: RoomModifier,
): WaveConfig {
  const hpMult = 1 + (difficulty - 1) * DIFFICULTY_HP_SCALING;
  const dmgMult = 1 + (difficulty - 1) * DIFFICULTY_DAMAGE_SCALING;

  let countMult = 1;
  if (modifier && modifier.type === "swarm") {
    countMult = modifier.enemyCountMultiplier;
  } else if (modifier && modifier.type === "elite") {
    countMult = modifier.enemyCountMultiplier;
  }

  return {
    ...wave,
    enemies: wave.enemies.map((e) => ({
      ...e,
      count: Math.max(1, Math.round(e.count * countMult)),
    })),
    spawnDelay: wave.spawnDelay,
  };
}

function spawnCurrentWave(state: GameState): void {
  const chapter = getChapter(state.chapterId);
  const room = getRoomConfig(state.chapterId, state.currentRoom - 1);
  if (!room) return;

  const wave = room.waves[state.currentWave];
  if (!wave) return;

  // Boss rooms: check if this is a boss wave (don't scale boss hp/damage)
  const isBossWave =
    room.isBoss && wave.enemies.some((e) => isBossType(e.type));

  const scaledWave = isBossWave
    ? wave
    : applyDifficultyScaling(wave, chapter.difficulty, room.modifier ?? null);

  state.spawnQueue = createSpawnQueue(scaledWave, state.player.position);
}

export function createInitialGameState(
  chapterId = 1,
  bonuses?: PermanentBonuses,
  heroId?: string,
): GameState {
  const player = createInitialPlayer(bonuses, heroId);
  const chapter = getChapter(chapterId);

  // Apply hero starting skill
  const hero = HERO_CONFIGS[heroId ?? "archer"] ?? HERO_CONFIGS.archer;
  if (hero.startingSkill) {
    acquireSkill(player, hero.startingSkill);
  }

  const state: GameState = {
    player,
    enemies: [],
    projectiles: [],
    drops: [],
    particles: [],
    damageNumbers: [],
    abilityEffects: [],
    currentRoom: 1,
    currentWave: 0,
    totalRooms: chapter.rooms.length,
    roomCleared: false,
    chapterId,
    chapterName: chapter.name,
    isPaused: false,
    isSkillSelection: false,
    gameOver: false,
    victory: false,
    frameCount: 0,
    camera: { x: 0, y: 0 },
    killCount: 0,
    spawnQueue: [],
    roomTransitionTimer: 0,
    doorActive: false,
    doorPosition: { x: ARENA_WIDTH / 2, y: 0 },
    roomModifier: null,
    runTimer: 0,
    obstacles: generateObstacles(chapterId, 0),
    screenShakeEvents: [],
    audioEvents: [],
  };

  const firstRoom = getRoomConfig(chapterId, 0);
  state.roomModifier = firstRoom?.modifier ?? null;

  spawnCurrentWave(state);

  return state;
}

function updatePlayer(
  player: PlayerState,
  input: InputState,
  dt: number,
  obstacles: import("./types").Obstacle[],
): void {
  const isMoving = input.joystickActive && input.joystickMagnitude > 0;
  player.isMoving = isMoving;

  if (isMoving) {
    player.velocity.x =
      input.joystickDirection.x * player.speed * input.joystickMagnitude;
    player.velocity.y =
      input.joystickDirection.y * player.speed * input.joystickMagnitude;

    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    player.facingDirection.x = input.joystickDirection.x;
    player.facingDirection.y = input.joystickDirection.y;
  } else {
    player.velocity.x = 0;
    player.velocity.y = 0;
  }

  const half = PLAYER_SIZE / 2;
  player.position.x = Math.max(
    half,
    Math.min(ARENA_WIDTH - half, player.position.x),
  );
  player.position.y = Math.max(
    half,
    Math.min(ARENA_HEIGHT - half, player.position.y),
  );

  // Obstacle collision
  const push = resolveObstacleCollision(player.position, half, obstacles);
  if (push) {
    player.position.x += push.x;
    player.position.y += push.y;
  }

  if (player.invincibilityFrames > 0) {
    player.invincibilityFrames = Math.max(0, player.invincibilityFrames - dt);
  }

  if (player.attackCooldown > 0) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  }
}

function updateCamera(
  camera: Vector2,
  target: Vector2,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const targetCamX = target.x - viewportWidth / 2;
  const targetCamY = target.y - viewportHeight / 2;

  camera.x += (targetCamX - camera.x) * CAMERA_LERP_SPEED;
  camera.y += (targetCamY - camera.y) * CAMERA_LERP_SPEED;

  camera.x = Math.max(0, Math.min(ARENA_WIDTH - viewportWidth, camera.x));
  camera.y = Math.max(0, Math.min(ARENA_HEIGHT - viewportHeight, camera.y));
}

function findNearestEnemy(
  player: PlayerState,
  enemies: EnemyState[],
): EnemyState | null {
  let nearest: EnemyState | null = null;
  let nearestDistSq = Infinity;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.spawnTimer > 0) continue;
    const dSq = distanceSq(
      player.position.x,
      player.position.y,
      enemy.position.x,
      enemy.position.y,
    );
    if (dSq < nearestDistSq && dSq <= player.attackRange * player.attackRange) {
      nearestDistSq = dSq;
      nearest = enemy;
    }
  }

  return nearest;
}

function handleAutoAttack(state: GameState, dt: number): void {
  const { player } = state;
  if (!player.alive || player.isMoving) return;

  if (player.attackCooldown > 0) return;

  const target = findNearestEnemy(player, state.enemies);
  if (!target) return;

  const dx = target.position.x - player.position.x;
  const dy = target.position.y - player.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 0) return;

  const dirX = dx / dist;
  const dirY = dy / dist;
  player.facingDirection.x = dirX;
  player.facingDirection.y = dirY;

  const baseAngle = Math.atan2(dirY, dirX);

  const effects: import("./types").ProjectileEffect[] = [];
  if (hasSkill(player, "poison")) effects.push("poison");
  if (hasSkill(player, "freeze")) effects.push("freeze");
  if (hasSkill(player, "burn")) effects.push("burn");

  const isPiercing = hasSkill(player, "piercing");
  const bounceLevel = getSkillLevel(player, "bounce");
  const isHoming = hasSkill(player, "homing");

  const angles: number[] = [baseAngle];

  const multishotLevel = getSkillLevel(player, "multishot");
  if (multishotLevel > 0) {
    const spreadAngle = Math.PI / 12;
    for (let i = 1; i <= multishotLevel; i++) {
      angles.push(baseAngle + spreadAngle * i);
      angles.push(baseAngle - spreadAngle * i);
    }
  }

  if (hasSkill(player, "diagonal_arrows")) {
    angles.push(baseAngle + Math.PI / 4);
    angles.push(baseAngle - Math.PI / 4);
  }

  if (hasSkill(player, "rear_arrow")) {
    angles.push(baseAngle + Math.PI);
  }

  for (const angle of angles) {
    const targetX = player.position.x + Math.cos(angle) * 200;
    const targetY = player.position.y + Math.sin(angle) * 200;

    const proj = createProjectile(
      player.position,
      { x: targetX, y: targetY },
      player.attackDamage,
      "player",
      undefined,
      effects,
    );

    if (isPiercing) proj.piercing = true;
    if (bounceLevel > 0) proj.bounces = bounceLevel;
    if (isHoming) proj.homing = true;

    state.projectiles.push(proj);
  }

  player.attackCooldown = 1 / player.attackSpeed;
  state.audioEvents.push("shoot");
}

function spawnDamageNumber(
  state: GameState,
  position: Vector2,
  value: number,
  isCrit: boolean,
): void {
  state.damageNumbers.push({
    id: `dmg_${nextDamageNumberId++}`,
    position: {
      x: position.x + (Math.random() - 0.5) * 10,
      y: position.y - 10,
    },
    value,
    isCrit,
    lifetime: DAMAGE_NUMBER_LIFETIME,
    maxLifetime: DAMAGE_NUMBER_LIFETIME,
    alive: true,
  });
}

function handleProjectileHits(state: GameState): void {
  const { player, enemies, projectiles } = state;

  const playerProjectiles = projectiles.filter((p) => p.owner === "player");
  const enemyHits = checkProjectileHits(playerProjectiles, enemies);

  for (const { projectile, entity } of enemyHits) {
    const enemy = entity as EnemyState;
    if (enemy.spawnTimer > 0) continue;
    if (enemy.bossInvulnerable) continue;

    let damage = projectile.damage;
    const isCrit = Math.random() < player.critChance;
    if (isCrit) {
      damage = Math.round(damage * player.critMultiplier);
    }

    enemy.hp -= damage;
    spawnDamageNumber(state, enemy.position, damage, isCrit);

    // Hit spark particles
    state.particles.push(...createHitSpark(projectile.position, false));

    // Screen shake on hit
    state.screenShakeEvents.push({ intensity: 2, duration: 0.1 });
    state.audioEvents.push("hit");

    for (const effect of projectile.effects) {
      applyStatusEffect(enemy, effect);
    }

    if (hasSkill(player, "ricochet") && projectile.owner === "player") {
      spawnRicochet(state, projectile, enemy);
    }

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.alive = false;
    }
  }

  const enemyProjectiles = projectiles.filter((p) => p.owner === "enemy");
  const playerHits = checkProjectileHits(enemyProjectiles, [player]);

  for (const { projectile } of playerHits) {
    if (player.invincibilityFrames > 0) continue;

    if (player.shieldActive) {
      player.shieldActive = false;
      state.abilityEffects.push({
        type: "shield_break",
        position: { x: player.position.x, y: player.position.y },
        radius: PLAYER_SIZE,
        timer: 0.3,
      });
      continue;
    }

    if (player.dodgeChance > 0 && Math.random() < player.dodgeChance) {
      spawnDamageNumber(state, player.position, 0, false);
      continue;
    }

    let damage = projectile.damage;
    if (player.damageReduction > 0) {
      damage = Math.max(1, damage - player.damageReduction);
    }

    player.hp -= damage;
    spawnDamageNumber(state, player.position, damage, false);
    player.invincibilityFrames = PLAYER_INVINCIBILITY_DURATION;

    state.particles.push(...createHitSpark(player.position, true));
    state.screenShakeEvents.push({ intensity: 6, duration: 0.2 });
    state.audioEvents.push("player_hit");

    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      state.gameOver = true;
      state.particles.push(...createPlayerDeathExplosion(player.position));
      state.screenShakeEvents.push({ intensity: 20, duration: 0.5 });
    }
  }
}

function handleMeleeContactDamage(state: GameState): void {
  const { player, enemies } = state;
  if (!player.alive || player.invincibilityFrames > 0) return;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.behavior !== "chase" || enemy.spawnTimer > 0)
      continue;

    const dx = player.position.x - enemy.position.x;
    const dy = player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const contactDist =
      (PLAYER_SIZE + Math.max(enemy.size.width, enemy.size.height)) / 2;

    if (dist <= contactDist) {
      if (player.shieldActive) {
        player.shieldActive = false;
        player.invincibilityFrames = PLAYER_INVINCIBILITY_DURATION;
        state.abilityEffects.push({
          type: "shield_break",
          position: { x: player.position.x, y: player.position.y },
          radius: PLAYER_SIZE,
          timer: 0.3,
        });
        break;
      }

      if (player.dodgeChance > 0 && Math.random() < player.dodgeChance) {
        continue;
      }

      let damage = enemy.damage;
      if (player.damageReduction > 0) {
        damage = Math.max(1, damage - player.damageReduction);
      }

      player.hp -= damage;
      spawnDamageNumber(state, player.position, damage, false);
      player.invincibilityFrames = PLAYER_INVINCIBILITY_DURATION;

      state.particles.push(...createHitSpark(player.position, true));
      state.screenShakeEvents.push({ intensity: 6, duration: 0.2 });
      state.audioEvents.push("player_hit");

      if (player.hp <= 0) {
        player.hp = 0;
        player.alive = false;
        state.gameOver = true;
        state.particles.push(...createPlayerDeathExplosion(player.position));
        state.screenShakeEvents.push({ intensity: 20, duration: 0.5 });
      }
      break;
    }
  }
}

function updateDeathAnimations(state: GameState, dt: number): void {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (!enemy.alive && enemy.deathTimer > 0) {
      enemy.deathTimer -= dt;
      if (enemy.deathTimer <= 0) {
        state.enemies.splice(i, 1);
      }
    }
  }
}

function updateDamageNumbers(state: GameState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dmg = state.damageNumbers[i];
    dmg.lifetime -= dt;
    dmg.position.y -= 40 * dt;

    if (dmg.lifetime <= 0) {
      dmg.alive = false;
      state.damageNumbers.splice(i, 1);
    }
  }
}

function getEnemyDeathColor(type: EnemyState["type"]): string {
  switch (type) {
    case "melee_basic":
      return "#e57373";
    case "melee_fast":
      return "#ffb74d";
    case "ranged_basic":
      return "#64b5f6";
    case "ranged_spread":
      return "#ba68c8";
    case "boss_golem":
      return "#a1887f";
    case "boss_dragon":
      return "#ef5350";
    case "boss_wizard":
      return "#ce93d8";
    default:
      return "#ffffff";
  }
}

function handleEnemyDeaths(state: GameState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive && enemy.deathTimer === 0) {
      enemy.deathTimer = ENEMY_DEATH_DURATION;
      state.killCount++;

      const drops = createDropsFromEnemy(
        enemy.position,
        enemy.xpValue,
        enemy.coinValue,
      );
      state.drops.push(...drops);

      // Death particles
      const color = getEnemyDeathColor(enemy.type);
      const isBoss = isBossType(enemy.type);
      state.particles.push(...createDeathBurst(enemy.position, color));
      if (isBoss) {
        // Extra big death for bosses
        state.particles.push(...createDeathBurst(enemy.position, "#ffd700"));
        state.particles.push(...createDeathBurst(enemy.position, "#ffffff"));
        state.screenShakeEvents.push({ intensity: 25, duration: 1.0 });
      } else {
        state.screenShakeEvents.push({ intensity: 3, duration: 0.15 });
      }
      state.audioEvents.push("enemy_death");
    }
  }
}

function applyStatusEffect(
  enemy: EnemyState,
  effect: import("./types").ProjectileEffect,
): void {
  const existing = enemy.statusEffects.find((s) => s.type === effect);
  if (existing) {
    existing.duration = getEffectDuration(effect);
    return;
  }

  enemy.statusEffects.push({
    type: effect,
    duration: getEffectDuration(effect),
    tickTimer: 0.5,
  });

  if (effect === "freeze") {
    enemy.speed = enemy.baseSpeed * 0.4;
  }
}

function getEffectDuration(effect: import("./types").ProjectileEffect): number {
  switch (effect) {
    case "poison":
      return 3;
    case "freeze":
      return 2;
    case "burn":
      return 2.5;
  }
}

function updateStatusEffects(state: GameState, dt: number): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    let hasFreezeEffect = false;

    for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
      const effect = enemy.statusEffects[i];
      effect.duration -= dt;
      effect.tickTimer -= dt;

      if (effect.tickTimer <= 0) {
        effect.tickTimer = 0.5;

        if (effect.type === "poison") {
          const dmg = 3;
          enemy.hp -= dmg;
          spawnDamageNumber(state, enemy.position, dmg, false);
        } else if (effect.type === "burn") {
          const burnDmg = 4;
          enemy.hp -= burnDmg;
          spawnDamageNumber(state, enemy.position, burnDmg, false);

          for (const other of state.enemies) {
            if (other.id === enemy.id || !other.alive) continue;
            const dx = other.position.x - enemy.position.x;
            const dy = other.position.y - enemy.position.y;
            if (dx * dx + dy * dy < 50 * 50) {
              other.hp -= 2;
              spawnDamageNumber(state, other.position, 2, false);
            }
          }
        }
      }

      if (effect.type === "freeze") hasFreezeEffect = true;

      if (effect.duration <= 0) {
        enemy.statusEffects.splice(i, 1);
      }
    }

    if (!hasFreezeEffect && enemy.speed !== enemy.baseSpeed) {
      enemy.speed = enemy.baseSpeed;
    }

    if (enemy.hp <= 0 && enemy.alive) {
      enemy.hp = 0;
      enemy.alive = false;
    }
  }
}

function spawnRicochet(
  state: GameState,
  source: import("./types").Projectile,
  hitEnemy: EnemyState,
): void {
  const ricochetLevel = getSkillLevel(state.player, "ricochet");
  if (ricochetLevel <= 0) return;

  // Find nearby enemies sorted by distance
  const candidates: { enemy: EnemyState; dist: number }[] = [];
  const excluded = new Set(source.hitEntities);
  excluded.add(hitEnemy.id);

  for (const enemy of state.enemies) {
    if (!enemy.alive || excluded.has(enemy.id)) continue;

    const dx = enemy.position.x - hitEnemy.position.x;
    const dy = enemy.position.y - hitEnemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 150) {
      candidates.push({ enemy, dist });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);

  // Level determines number of ricochet targets
  const targetCount = ricochetLevel;
  for (let i = 0; i < Math.min(targetCount, candidates.length); i++) {
    const target = candidates[i].enemy;
    const proj = createProjectile(
      hitEnemy.position,
      target.position,
      Math.round(state.player.attackDamage * 0.7),
      "player",
    );
    proj.hitEntities = new Set(excluded);
    proj.effects = [...source.effects];
    state.projectiles.push(proj);
  }
}

const SHIELD_BASE_COOLDOWN = 8;
const CIRCLE_DAMAGE_COOLDOWN = 3;
const CIRCLE_DAMAGE_RADIUS = 80;
const CIRCLE_DAMAGE_BASE = 8;
const METEOR_COOLDOWN = 4;
const METEOR_DAMAGE_BASE = 20;
const METEOR_RADIUS = 40;
const SWORD_SPIN_COOLDOWN = 2.5;
const SWORD_SPIN_RADIUS = 50;
const SWORD_SPIN_DAMAGE_BASE = 12;

function updateAbilities(state: GameState, dt: number): void {
  const { player } = state;
  if (!player.alive) return;

  const regenLevel = getSkillLevel(player, "hp_regen");
  if (regenLevel > 0) {
    player.hp = Math.min(player.maxHp, player.hp + regenLevel * dt);
  }

  if (hasSkill(player, "shield")) {
    const shieldLevel = getSkillLevel(player, "shield");
    if (player.shieldCooldown > 0) {
      player.shieldCooldown -= dt;
    }
    if (player.shieldCooldown <= 0 && !player.shieldActive) {
      player.shieldActive = true;
      player.shieldCooldown = SHIELD_BASE_COOLDOWN - shieldLevel;
    }
  }

  const circleLevel = getSkillLevel(player, "circle_damage");
  if (circleLevel > 0) {
    player.abilityCooldowns.circle_damage =
      (player.abilityCooldowns.circle_damage ?? CIRCLE_DAMAGE_COOLDOWN) - dt;
    if (player.abilityCooldowns.circle_damage <= 0) {
      player.abilityCooldowns.circle_damage = CIRCLE_DAMAGE_COOLDOWN;
      const dmg = CIRCLE_DAMAGE_BASE * circleLevel;

      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.spawnTimer > 0) continue;
        const dx = enemy.position.x - player.position.x;
        const dy = enemy.position.y - player.position.y;
        if (dx * dx + dy * dy < CIRCLE_DAMAGE_RADIUS * CIRCLE_DAMAGE_RADIUS) {
          enemy.hp -= dmg;
          spawnDamageNumber(state, enemy.position, dmg, false);
          if (enemy.hp <= 0) {
            enemy.hp = 0;
            enemy.alive = false;
          }
        }
      }

      state.abilityEffects.push({
        type: "circle",
        position: { x: player.position.x, y: player.position.y },
        radius: CIRCLE_DAMAGE_RADIUS,
        timer: 0.3,
      });
    }
  }

  const meteorLevel = getSkillLevel(player, "meteor");
  if (meteorLevel > 0) {
    player.abilityCooldowns.meteor =
      (player.abilityCooldowns.meteor ?? METEOR_COOLDOWN) - dt;
    if (player.abilityCooldowns.meteor <= 0) {
      player.abilityCooldowns.meteor = METEOR_COOLDOWN;
      const dmg = METEOR_DAMAGE_BASE * meteorLevel;

      const aliveEnemies = state.enemies.filter(
        (e) => e.alive && e.spawnTimer <= 0,
      );
      let targetPos: Vector2;
      if (aliveEnemies.length > 0) {
        const randomEnemy =
          aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        targetPos = { x: randomEnemy.position.x, y: randomEnemy.position.y };
      } else {
        targetPos = {
          x: Math.random() * ARENA_WIDTH,
          y: Math.random() * ARENA_HEIGHT,
        };
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.spawnTimer > 0) continue;
        const dx = enemy.position.x - targetPos.x;
        const dy = enemy.position.y - targetPos.y;
        if (dx * dx + dy * dy < METEOR_RADIUS * METEOR_RADIUS) {
          enemy.hp -= dmg;
          spawnDamageNumber(state, enemy.position, dmg, false);
          if (enemy.hp <= 0) {
            enemy.hp = 0;
            enemy.alive = false;
          }
        }
      }

      state.abilityEffects.push({
        type: "meteor",
        position: targetPos,
        radius: METEOR_RADIUS,
        timer: 0.5,
      });
    }
  }

  const swordSpinLevel = getSkillLevel(player, "sword_spin");
  if (swordSpinLevel > 0) {
    player.abilityCooldowns.sword_spin =
      (player.abilityCooldowns.sword_spin ?? SWORD_SPIN_COOLDOWN) - dt;
    if (player.abilityCooldowns.sword_spin <= 0) {
      player.abilityCooldowns.sword_spin = SWORD_SPIN_COOLDOWN;
      const dmg = SWORD_SPIN_DAMAGE_BASE * swordSpinLevel;

      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.spawnTimer > 0) continue;
        const dx = enemy.position.x - player.position.x;
        const dy = enemy.position.y - player.position.y;
        if (dx * dx + dy * dy < SWORD_SPIN_RADIUS * SWORD_SPIN_RADIUS) {
          enemy.hp -= dmg;
          spawnDamageNumber(state, enemy.position, dmg, false);
          if (enemy.hp <= 0) {
            enemy.hp = 0;
            enemy.alive = false;
          }
        }
      }

      state.abilityEffects.push({
        type: "sword_spin",
        position: { x: player.position.x, y: player.position.y },
        radius: SWORD_SPIN_RADIUS,
        timer: 0.3,
      });
    }
  }
}

function updateAbilityEffects(state: GameState, dt: number): void {
  for (let i = state.abilityEffects.length - 1; i >= 0; i--) {
    state.abilityEffects[i].timer -= dt;
    if (state.abilityEffects[i].timer <= 0) {
      state.abilityEffects.splice(i, 1);
    }
  }
}

function handleLevelUp(state: GameState): void {
  while (state.player.xp >= state.player.xpToNextLevel) {
    state.player.xp -= state.player.xpToNextLevel;
    state.player.level++;
    state.player.xpToNextLevel = Math.round(
      BASE_XP_THRESHOLD * Math.pow(XP_SCALING, state.player.level - 1),
    );
    state.isSkillSelection = true;

    // Level-up particles and audio
    state.particles.push(...createLevelUpSparkles(state.player.position));
    state.audioEvents.push("level_up");
  }
}

function handleRoomProgression(state: GameState): void {
  if (state.roomCleared || state.doorActive || state.roomTransitionTimer > 0)
    return;
  if (state.victory || state.gameOver) return;
  const room = getRoomConfig(state.chapterId, state.currentRoom - 1);
  if (!room) return;

  const allEnemiesDead = state.enemies.length === 0;
  const spawnQueueEmpty = state.spawnQueue.length === 0;

  if (allEnemiesDead && spawnQueueEmpty) {
    const nextWaveIndex = state.currentWave + 1;

    if (nextWaveIndex < room.waves.length) {
      state.currentWave = nextWaveIndex;
      spawnCurrentWave(state);
    } else {
      state.roomCleared = true;
      state.roomTransitionTimer = ROOM_CLEAR_PAUSE;
      state.audioEvents.push("room_clear");
    }
  }
}

function handleRoomTransition(state: GameState, dt: number): void {
  if (!state.roomCleared) return;

  if (state.roomTransitionTimer > 0) {
    state.roomTransitionTimer -= dt;
    if (state.roomTransitionTimer <= 0) {
      state.roomTransitionTimer = 0;

      if (state.currentRoom >= state.totalRooms) {
        state.victory = true;
        return;
      }

      state.doorActive = true;
      state.doorPosition = { x: ARENA_WIDTH / 2, y: 20 };
      state.audioEvents.push("door_open");
    }
    return;
  }

  if (state.doorActive) {
    const dx = state.player.position.x - state.doorPosition.x;
    const dy = state.player.position.y - state.doorPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DOOR_COLLISION_RANGE) {
      advanceToNextRoom(state);
    }
  }
}

function advanceToNextRoom(state: GameState): void {
  state.currentRoom++;
  state.currentWave = 0;
  state.roomCleared = false;
  state.doorActive = false;
  state.roomTransitionTimer = 0;
  state.projectiles = [];

  const room = getRoomConfig(state.chapterId, state.currentRoom - 1);
  state.roomModifier = room?.modifier ?? null;

  state.player.position.x = ARENA_WIDTH / 2;
  state.player.position.y = ARENA_HEIGHT / 2;

  state.obstacles = generateObstacles(state.chapterId, state.currentRoom - 1);

  spawnCurrentWave(state);
}

export function updateGameState(
  state: GameState,
  input: InputState,
  dt: number,
  viewportWidth: number,
  viewportHeight: number,
): void {
  if (
    state.isPaused ||
    state.gameOver ||
    state.victory ||
    state.isSkillSelection
  )
    return;

  // Clear per-frame events (consumed by renderer/GameCanvas)
  state.screenShakeEvents = [];
  state.audioEvents = [];

  state.runTimer += dt;

  handleRoomTransition(state, dt);

  const chapter = getChapter(state.chapterId);
  processSpawnQueue(state.spawnQueue, state.enemies, dt, {
    difficulty: chapter.difficulty,
    modifier: state.roomModifier,
  });
  updatePlayer(state.player, input, dt, state.obstacles);

  if (!state.roomCleared || state.doorActive) {
    handleAutoAttack(state, dt);

    // Update regular enemies and boss enemies
    const regularEnemies = state.enemies.filter((e) => !isBossType(e.type));
    const bossEnemies = state.enemies.filter((e) => isBossType(e.type));

    updateEnemies({ ...state, enemies: regularEnemies }, dt);
    for (const boss of bossEnemies) {
      updateBoss(boss, state, dt);
    }

    updateProjectiles(state.projectiles, dt, state.enemies, state.obstacles);
    handleProjectileHits(state);
    handleMeleeContactDamage(state);
  }

  handleEnemyDeaths(state);
  updateDeathAnimations(state, dt);
  updateDamageNumbers(state, dt);
  updateStatusEffects(state, dt);
  updateAbilities(state, dt);
  updateAbilityEffects(state, dt);
  updateParticles(state.particles, dt);

  const collected = updateDrops(state.drops, state.player, dt);
  if (collected.xp > 0) {
    state.player.xp += collected.xp;
    state.particles.push(...createXpCollectSparkle(state.player.position));
    handleLevelUp(state);
  }
  if (collected.coins > 0) {
    state.player.coins += collected.coins;
    state.particles.push(...createCoinCollectSparkle(state.player.position));
    state.audioEvents.push("coin_collect");
  }
  if (collected.hp > 0) {
    const healAmount = Math.round(state.player.maxHp * collected.hp);
    state.player.hp = Math.min(
      state.player.maxHp,
      state.player.hp + healAmount,
    );
  }

  updateCamera(
    state.camera,
    state.player.position,
    viewportWidth,
    viewportHeight,
  );
  handleRoomProgression(state);

  state.frameCount++;
}
