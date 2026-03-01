import type { EnemyState, GameState, Vector2 } from "./types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./constants";
import { createProjectile } from "./projectiles";
import { resolveObstacleCollision } from "./obstacles";

const SEPARATION_RADIUS = 30;
const SEPARATION_FORCE = 80;
const ATTACK_WINDUP_DURATION = 0.3;
const SPREAD_ANGLE = Math.PI / 8; // ~22.5 degrees for 3-way spread

function clampToArena(enemy: EnemyState): void {
  const half = Math.max(enemy.size.width, enemy.size.height) / 2;
  enemy.position.x = Math.max(
    half,
    Math.min(ARENA_WIDTH - half, enemy.position.x),
  );
  enemy.position.y = Math.max(
    half,
    Math.min(ARENA_HEIGHT - half, enemy.position.y),
  );
}

function getSeparationForce(enemy: EnemyState, others: EnemyState[]): Vector2 {
  let sx = 0;
  let sy = 0;

  for (const other of others) {
    if (other.id === enemy.id || !other.alive) continue;

    const dx = enemy.position.x - other.position.x;
    const dy = enemy.position.y - other.position.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const strength = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS;
      sx += (dx / dist) * strength;
      sy += (dy / dist) * strength;
    }
  }

  return { x: sx, y: sy };
}

function updateChaseEnemy(
  enemy: EnemyState,
  state: GameState,
  dt: number,
): void {
  const player = state.player;
  const dx = player.position.x - enemy.position.x;
  const dy = player.position.y - enemy.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 0) return;

  // Direction toward player
  let moveX = (dx / dist) * enemy.speed;
  let moveY = (dy / dist) * enemy.speed;

  // Add separation force to prevent stacking
  const sep = getSeparationForce(enemy, state.enemies);
  moveX += sep.x * SEPARATION_FORCE;
  moveY += sep.y * SEPARATION_FORCE;

  enemy.position.x += moveX * dt;
  enemy.position.y += moveY * dt;

  clampToArena(enemy);

  const radius = Math.max(enemy.size.width, enemy.size.height) / 2;
  const push = resolveObstacleCollision(
    enemy.position,
    radius,
    state.obstacles,
  );
  if (push) {
    enemy.position.x += push.x;
    enemy.position.y += push.y;
  }
}

function updateKiteEnemy(
  enemy: EnemyState,
  state: GameState,
  dt: number,
): void {
  const player = state.player;
  const dx = player.position.x - enemy.position.x;
  const dy = player.position.y - enemy.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 0) return;

  const preferredDist = enemy.attackRange * 0.65;
  const dirX = dx / dist;
  const dirY = dy / dist;

  let moveX = 0;
  let moveY = 0;

  if (dist < preferredDist * 0.5) {
    // Too close - back away fast
    moveX = -dirX * enemy.speed;
    moveY = -dirY * enemy.speed;
  } else if (dist < preferredDist * 0.8) {
    // Slightly too close - back away slowly
    moveX = -dirX * enemy.speed * 0.5;
    moveY = -dirY * enemy.speed * 0.5;
  } else if (dist > preferredDist * 1.3) {
    // Too far - approach slowly
    moveX = dirX * enemy.speed * 0.5;
    moveY = dirY * enemy.speed * 0.5;
  }
  // Otherwise hold position

  // Add separation force
  const sep = getSeparationForce(enemy, state.enemies);
  moveX += sep.x * SEPARATION_FORCE;
  moveY += sep.y * SEPARATION_FORCE;

  enemy.position.x += moveX * dt;
  enemy.position.y += moveY * dt;

  clampToArena(enemy);

  const radius = Math.max(enemy.size.width, enemy.size.height) / 2;
  const push = resolveObstacleCollision(
    enemy.position,
    radius,
    state.obstacles,
  );
  if (push) {
    enemy.position.x += push.x;
    enemy.position.y += push.y;
  }

  // Attack logic with windup
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

  if (enemy.attackWindup > 0) {
    enemy.attackWindup -= dt;
    if (enemy.attackWindup <= 0) {
      // Fire!
      fireEnemyProjectile(enemy, state);
      enemy.attackCooldown = getAttackCooldown(enemy.type);
    }
    return;
  }

  if (enemy.attackCooldown <= 0 && dist <= enemy.attackRange) {
    // Start windup
    enemy.attackWindup = ATTACK_WINDUP_DURATION;
  }
}

function getAttackCooldown(type: string): number {
  switch (type) {
    case "ranged_spread":
      return 2.5;
    case "ranged_basic":
      return 2.0;
    default:
      return 2.0;
  }
}

function fireEnemyProjectile(enemy: EnemyState, state: GameState): void {
  const speed = enemy.projectileSpeed ?? 200;

  if (enemy.type === "ranged_spread") {
    // Fire 3-way spread
    const dx = state.player.position.x - enemy.position.x;
    const dy = state.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0) return;

    const baseAngle = Math.atan2(dy, dx);

    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * SPREAD_ANGLE;
      const targetX = enemy.position.x + Math.cos(angle) * 100;
      const targetY = enemy.position.y + Math.sin(angle) * 100;

      const proj = createProjectile(
        enemy.position,
        { x: targetX, y: targetY },
        enemy.damage,
        "enemy",
        speed,
      );
      state.projectiles.push(proj);
    }
  } else {
    // Single shot
    const proj = createProjectile(
      enemy.position,
      state.player.position,
      enemy.damage,
      "enemy",
      speed,
    );
    state.projectiles.push(proj);
  }
}

export function updateEnemies(state: GameState, dt: number): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    // Tick spawn timer (enemy is invulnerable while spawning)
    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer -= dt;
      continue;
    }

    if (enemy.behavior === "chase") {
      updateChaseEnemy(enemy, state, dt);
    } else if (enemy.behavior === "kite") {
      updateKiteEnemy(enemy, state, dt);
    }
  }
}
