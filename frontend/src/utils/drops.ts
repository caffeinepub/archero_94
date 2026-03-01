import type { Drop, Vector2, PlayerState } from "./types";
import {
  DROP_MAGNET_RANGE,
  HP_DROP_CHANCE,
  HP_DROP_RESTORE,
} from "./constants";

let nextDropId = 0;

export function createDropsFromEnemy(
  position: Vector2,
  xpValue: number,
  coinValue: number,
): Drop[] {
  const drops: Drop[] = [];

  // XP gem
  drops.push({
    id: `drop_${nextDropId++}`,
    position: {
      x: position.x + (Math.random() - 0.5) * 16,
      y: position.y + (Math.random() - 0.5) * 16,
    },
    type: "xp",
    value: xpValue,
    magnetRange: DROP_MAGNET_RANGE,
    alive: true,
  });

  // Coin
  if (coinValue > 0) {
    drops.push({
      id: `drop_${nextDropId++}`,
      position: {
        x: position.x + (Math.random() - 0.5) * 16,
        y: position.y + (Math.random() - 0.5) * 16,
      },
      type: "coin",
      value: coinValue,
      magnetRange: DROP_MAGNET_RANGE,
      alive: true,
    });
  }

  // HP pickup (~10% chance)
  if (Math.random() < HP_DROP_CHANCE) {
    drops.push({
      id: `drop_${nextDropId++}`,
      position: {
        x: position.x + (Math.random() - 0.5) * 16,
        y: position.y + (Math.random() - 0.5) * 16,
      },
      type: "hp",
      value: HP_DROP_RESTORE,
      magnetRange: DROP_MAGNET_RANGE,
      alive: true,
    });
  }

  return drops;
}

const DROP_MAGNET_SPEED = 300;
const DROP_COLLECT_RADIUS = 12;

export function updateDrops(
  drops: Drop[],
  player: PlayerState,
  dt: number,
): { xp: number; coins: number; hp: number } {
  let xpCollected = 0;
  let coinsCollected = 0;
  let hpCollected = 0;

  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    if (!drop.alive) {
      drops.splice(i, 1);
      continue;
    }

    const dx = player.position.x - drop.position.x;
    const dy = player.position.y - drop.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Magnetism: move toward player when within range
    if (dist < drop.magnetRange && dist > 0) {
      const speed = DROP_MAGNET_SPEED * (1 - dist / drop.magnetRange);
      drop.position.x += (dx / dist) * speed * dt;
      drop.position.y += (dy / dist) * speed * dt;
    }

    // Collection
    if (dist < DROP_COLLECT_RADIUS) {
      drop.alive = false;

      switch (drop.type) {
        case "xp":
          xpCollected += drop.value;
          break;
        case "coin":
          coinsCollected += drop.value;
          break;
        case "hp":
          hpCollected += drop.value;
          break;
      }

      drops.splice(i, 1);
    }
  }

  return { xp: xpCollected, coins: coinsCollected, hp: hpCollected };
}
