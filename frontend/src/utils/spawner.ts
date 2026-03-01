import type {
  WaveConfig,
  EnemyState,
  Vector2,
  SpawnEntry,
  EnemyType,
  RoomModifier,
} from "./types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./constants";
import { createEnemy, type EnemyScaling } from "./enemies";

const MIN_PLAYER_DISTANCE = 120;
const SPAWN_STAGGER = 0.15; // seconds between each enemy spawn
const EDGE_MARGIN = 30;

type Edge = "top" | "bottom" | "left" | "right";

function getRandomEdgePosition(edge: Edge): Vector2 {
  switch (edge) {
    case "top":
      return {
        x: EDGE_MARGIN + Math.random() * (ARENA_WIDTH - EDGE_MARGIN * 2),
        y: EDGE_MARGIN,
      };
    case "bottom":
      return {
        x: EDGE_MARGIN + Math.random() * (ARENA_WIDTH - EDGE_MARGIN * 2),
        y: ARENA_HEIGHT - EDGE_MARGIN,
      };
    case "left":
      return {
        x: EDGE_MARGIN,
        y: EDGE_MARGIN + Math.random() * (ARENA_HEIGHT - EDGE_MARGIN * 2),
      };
    case "right":
      return {
        x: ARENA_WIDTH - EDGE_MARGIN,
        y: EDGE_MARGIN + Math.random() * (ARENA_HEIGHT - EDGE_MARGIN * 2),
      };
  }
}

function getSpawnPosition(playerPos: Vector2): Vector2 {
  const edges: Edge[] = ["top", "bottom", "left", "right"];
  let attempts = 0;

  while (attempts < 10) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const pos = getRandomEdgePosition(edge);

    const dx = pos.x - playerPos.x;
    const dy = pos.y - playerPos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= MIN_PLAYER_DISTANCE * MIN_PLAYER_DISTANCE) {
      return pos;
    }
    attempts++;
  }

  // Fallback: spawn at opposite corner from player
  return {
    x: playerPos.x < ARENA_WIDTH / 2 ? ARENA_WIDTH - EDGE_MARGIN : EDGE_MARGIN,
    y:
      playerPos.y < ARENA_HEIGHT / 2 ? ARENA_HEIGHT - EDGE_MARGIN : EDGE_MARGIN,
  };
}

export function createSpawnQueue(
  wave: WaveConfig,
  playerPos: Vector2,
): SpawnEntry[] {
  const entries: SpawnEntry[] = [];
  let delay = wave.spawnDelay;

  for (const group of wave.enemies) {
    for (let i = 0; i < group.count; i++) {
      const position = getSpawnPosition(playerPos);
      entries.push({
        type: group.type,
        position,
        delay,
      });
      delay += SPAWN_STAGGER;
    }
  }

  return entries;
}

export function processSpawnQueue(
  queue: SpawnEntry[],
  enemies: EnemyState[],
  dt: number,
  scaling?: EnemyScaling,
): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    queue[i].delay -= dt;

    if (queue[i].delay <= 0) {
      const entry = queue[i];
      const enemy = createEnemy(entry.type, entry.position, scaling);
      enemies.push(enemy);
      queue.splice(i, 1);
    }
  }
}
