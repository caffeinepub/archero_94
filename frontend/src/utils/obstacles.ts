import type { Obstacle, ObstacleType, Vector2 } from "./types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./constants";

// Seeded pseudo-random number generator
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Exclusion zones: player spawn (center) and door area (top-center)
function isInExclusionZone(
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  const spawnClearance = 100;
  const doorClearance = 80;

  // Player spawn area
  if (
    Math.abs(x + w / 2 - cx) < spawnClearance &&
    Math.abs(y + h / 2 - cy) < spawnClearance
  ) {
    return true;
  }

  // Door area (top-center)
  if (Math.abs(x + w / 2 - cx) < doorClearance && y < doorClearance) {
    return true;
  }

  return false;
}

export function generateObstacles(
  chapterId: number,
  roomIndex: number,
): Obstacle[] {
  const seed = chapterId * 7919 + roomIndex * 1301;
  const rand = seededRandom(seed);
  const obstacles: Obstacle[] = [];

  const padding = 50;
  const minX = padding;
  const maxX = ARENA_WIDTH - padding;
  const minY = padding;
  const maxY = ARENA_HEIGHT - padding;

  // More obstacles for the larger arena
  const rockCount = 4 + Math.floor(rand() * 3);
  const waterCount = 3 + Math.floor(rand() * 2);

  const tryPlace = (type: ObstacleType, w: number, h: number): boolean => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = minX + rand() * (maxX - minX - w);
      const y = minY + rand() * (maxY - minY - h);

      if (isInExclusionZone(x, y, w, h)) continue;

      // Check overlap with existing obstacles
      let overlaps = false;
      for (const obs of obstacles) {
        if (
          x < obs.position.x + obs.width + 15 &&
          x + w + 15 > obs.position.x &&
          y < obs.position.y + obs.height + 15 &&
          y + h + 15 > obs.position.y
        ) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      obstacles.push({ position: { x, y }, width: w, height: h, type });
      return true;
    }
    return false;
  };

  // Rocks: blocky shapes
  for (let i = 0; i < rockCount; i++) {
    const w = 40 + rand() * 20;
    const h = 40 + rand() * 20;
    tryPlace("rock", w, h);
  }

  // Water: wide rectangular pools
  for (let i = 0; i < waterCount; i++) {
    const w = 70 + rand() * 40;
    const h = 30 + rand() * 15;
    tryPlace("water", w, h);
  }

  return obstacles;
}

// Check if a circle (entity) collides with a solid obstacle (rock or water)
// Returns push-out vector if colliding, null otherwise
export function resolveObstacleCollision(
  pos: Vector2,
  radius: number,
  obstacles: Obstacle[],
): Vector2 | null {
  for (const obs of obstacles) {
    // Both rock and water block movement
    if (obs.type !== "rock" && obs.type !== "water") continue;

    // Closest point on the AABB to the circle center
    const closestX = Math.max(
      obs.position.x,
      Math.min(pos.x, obs.position.x + obs.width),
    );
    const closestY = Math.max(
      obs.position.y,
      Math.min(pos.y, obs.position.y + obs.height),
    );

    const dx = pos.x - closestX;
    const dy = pos.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      return {
        x: (dx / dist) * overlap,
        y: (dy / dist) * overlap,
      };
    }

    // Handle case where center is inside the AABB
    if (distSq === 0) {
      return { x: 0, y: -radius };
    }
  }
  return null;
}

// Check if a projectile (point) hits a rock obstacle (only rocks block projectiles)
export function projectileHitsObstacle(
  pos: Vector2,
  obstacles: Obstacle[],
): boolean {
  for (const obs of obstacles) {
    if (obs.type !== "rock") continue;

    if (
      pos.x >= obs.position.x &&
      pos.x <= obs.position.x + obs.width &&
      pos.y >= obs.position.y &&
      pos.y <= obs.position.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}
