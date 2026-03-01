import type {
  Projectile,
  Vector2,
  ProjectileEffect,
  EnemyState,
  Obstacle,
} from "./types";
import {
  PROJECTILE_SPEED,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PROJECTILE_SIZE,
} from "./constants";
import { projectileHitsObstacle } from "./obstacles";

let nextProjectileId = 0;

export function createProjectile(
  origin: Vector2,
  target: Vector2,
  damage: number,
  owner: "player" | "enemy",
  speed: number = PROJECTILE_SPEED,
  effects: ProjectileEffect[] = [],
): Projectile {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Avoid division by zero - default to shooting upward
  const vx = dist > 0 ? (dx / dist) * speed : 0;
  const vy = dist > 0 ? (dy / dist) * speed : -speed;

  return {
    id: `proj_${nextProjectileId++}`,
    position: { x: origin.x, y: origin.y },
    velocity: { x: vx, y: vy },
    damage,
    owner,
    piercing: false,
    bounces: 0,
    effects,
    alive: true,
    hitEntities: new Set(),
    homing: false,
  };
}

const HOMING_STRENGTH = 3.0;
const HOMING_RANGE = 200;

export function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
  enemies?: EnemyState[],
  obstacles?: Obstacle[],
): void {
  const margin = PROJECTILE_SIZE * 2;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (!proj.alive) {
      projectiles.splice(i, 1);
      continue;
    }

    // Homing: slightly curve toward nearest enemy
    if (proj.homing && proj.owner === "player" && enemies) {
      applyHoming(proj, enemies, dt);
    }

    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;

    // Rock obstacle collision (non-piercing projectiles only)
    if (
      obstacles &&
      !proj.piercing &&
      projectileHitsObstacle(proj.position, obstacles)
    ) {
      proj.alive = false;
      projectiles.splice(i, 1);
      continue;
    }

    // Bounce off walls
    if (proj.bounces > 0) {
      let bounced = false;
      if (proj.position.x < 0) {
        proj.position.x = 0;
        proj.velocity.x = Math.abs(proj.velocity.x);
        bounced = true;
      } else if (proj.position.x > ARENA_WIDTH) {
        proj.position.x = ARENA_WIDTH;
        proj.velocity.x = -Math.abs(proj.velocity.x);
        bounced = true;
      }
      if (proj.position.y < 0) {
        proj.position.y = 0;
        proj.velocity.y = Math.abs(proj.velocity.y);
        bounced = true;
      } else if (proj.position.y > ARENA_HEIGHT) {
        proj.position.y = ARENA_HEIGHT;
        proj.velocity.y = -Math.abs(proj.velocity.y);
        bounced = true;
      }
      if (bounced) {
        proj.bounces--;
        continue;
      }
    }

    // Remove if off-screen (with margin)
    if (
      proj.position.x < -margin ||
      proj.position.x > ARENA_WIDTH + margin ||
      proj.position.y < -margin ||
      proj.position.y > ARENA_HEIGHT + margin
    ) {
      proj.alive = false;
      projectiles.splice(i, 1);
    }
  }
}

function applyHoming(
  proj: Projectile,
  enemies: EnemyState[],
  dt: number,
): void {
  let nearestDist = HOMING_RANGE;
  let nearestEnemy: EnemyState | null = null;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.spawnTimer > 0) continue;
    if (proj.hitEntities.has(enemy.id)) continue;

    const dx = enemy.position.x - proj.position.x;
    const dy = enemy.position.y - proj.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestEnemy = enemy;
    }
  }

  if (!nearestEnemy) return;

  const dx = nearestEnemy.position.x - proj.position.x;
  const dy = nearestEnemy.position.y - proj.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 0) return;

  // Adjust velocity toward enemy
  const speed = Math.sqrt(
    proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y,
  );
  proj.velocity.x += (dx / dist) * HOMING_STRENGTH;
  proj.velocity.y += (dy / dist) * HOMING_STRENGTH;

  // Re-normalize to original speed
  const newSpeed = Math.sqrt(
    proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y,
  );
  if (newSpeed > 0) {
    proj.velocity.x = (proj.velocity.x / newSpeed) * speed;
    proj.velocity.y = (proj.velocity.y / newSpeed) * speed;
  }
}
