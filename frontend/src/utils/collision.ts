import type { Entity, Projectile } from "./types";
import { PROJECTILE_SIZE } from "./constants";

// Circle-based collision between two entities
export function checkCollision(a: Entity, b: Entity): boolean {
  if (!a.alive || !b.alive) return false;

  const radiusA = Math.max(a.size.width, a.size.height) / 2;
  const radiusB = Math.max(b.size.width, b.size.height) / 2;

  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distSq = dx * dx + dy * dy;
  const minDist = radiusA + radiusB;

  return distSq <= minDist * minDist;
}

// Check projectile hits against a list of entities
export function checkProjectileHits(
  projectiles: Projectile[],
  entities: Entity[],
): { projectile: Projectile; entity: Entity }[] {
  const hits: { projectile: Projectile; entity: Entity }[] = [];

  for (const proj of projectiles) {
    if (!proj.alive) continue;

    for (const entity of entities) {
      if (!entity.alive) continue;
      if (proj.hitEntities.has(entity.id)) continue;

      const entityRadius = Math.max(entity.size.width, entity.size.height) / 2;
      const projRadius = PROJECTILE_SIZE;

      const dx = proj.position.x - entity.position.x;
      const dy = proj.position.y - entity.position.y;
      const distSq = dx * dx + dy * dy;
      const minDist = entityRadius + projRadius;

      if (distSq <= minDist * minDist) {
        hits.push({ projectile: proj, entity });
        proj.hitEntities.add(entity.id);

        if (!proj.piercing) {
          proj.alive = false;
          break;
        }
      }
    }
  }

  return hits;
}

// Distance squared between two points
export function distanceSq(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
