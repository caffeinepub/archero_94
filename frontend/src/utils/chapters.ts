import type { ChapterConfig, RoomConfig, RoomModifier } from "./types";

// Chapter 1: The Dark Caves — introductory difficulty
const CHAPTER_1: ChapterConfig = {
  id: 1,
  name: "The Dark Caves",
  backgroundColor: "#16213e",
  difficulty: 1,
  rooms: [
    {
      id: 1,
      isBoss: false,
      waves: [
        { enemies: [{ type: "melee_basic", count: 3 }], spawnDelay: 0.3 },
      ],
    },
    {
      id: 2,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 2 },
            { type: "melee_fast", count: 2 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 3,
      isBoss: false,
      waves: [
        { enemies: [{ type: "melee_basic", count: 3 }], spawnDelay: 0.3 },
        { enemies: [{ type: "ranged_basic", count: 2 }], spawnDelay: 0.5 },
      ],
    },
    {
      id: 4,
      isBoss: false,
      modifier: {
        type: "swarm",
        enemyHpMultiplier: 0.6,
        enemyCountMultiplier: 1.5,
      },
      waves: [
        { enemies: [{ type: "melee_fast", count: 4 }], spawnDelay: 0.2 },
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "melee_fast", count: 2 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 5,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 2 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "melee_fast", count: 3 },
            { type: "ranged_spread", count: 1 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 6,
      isBoss: true,
      waves: [{ enemies: [{ type: "boss_golem", count: 1 }], spawnDelay: 1.0 }],
    },
  ],
};

// Chapter 2: The Scorched Halls — moderate difficulty with more ranged enemies
const CHAPTER_2: ChapterConfig = {
  id: 2,
  name: "The Scorched Halls",
  backgroundColor: "#2e1a0e",
  difficulty: 2,
  rooms: [
    {
      id: 1,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "ranged_basic", count: 1 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 2,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_fast", count: 3 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        { enemies: [{ type: "ranged_spread", count: 2 }], spawnDelay: 0.5 },
      ],
    },
    {
      id: 3,
      isBoss: false,
      modifier: {
        type: "elite",
        enemyHpMultiplier: 1.5,
        enemyDamageMultiplier: 1.3,
        enemyCountMultiplier: 0.7,
      },
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 2 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 4,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_fast", count: 3 },
            { type: "ranged_spread", count: 1 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "melee_basic", count: 2 },
            { type: "ranged_basic", count: 2 },
            { type: "ranged_spread", count: 1 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 5,
      isBoss: false,
      modifier: { type: "fast", enemySpeedMultiplier: 1.4 },
      waves: [
        { enemies: [{ type: "melee_fast", count: 4 }], spawnDelay: 0.2 },
        {
          enemies: [
            { type: "melee_fast", count: 3 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 6,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "ranged_basic", count: 2 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "melee_fast", count: 4 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 7,
      isBoss: true,
      waves: [
        { enemies: [{ type: "boss_dragon", count: 1 }], spawnDelay: 1.0 },
      ],
    },
  ],
};

// Chapter 3: The Arcane Tower — hard difficulty with dense ranged enemies
const CHAPTER_3: ChapterConfig = {
  id: 3,
  name: "The Arcane Tower",
  backgroundColor: "#1a0e2e",
  difficulty: 3,
  rooms: [
    {
      id: 1,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        { enemies: [{ type: "ranged_spread", count: 2 }], spawnDelay: 0.4 },
      ],
    },
    {
      id: 2,
      isBoss: false,
      modifier: {
        type: "swarm",
        enemyHpMultiplier: 0.5,
        enemyCountMultiplier: 2,
      },
      waves: [
        {
          enemies: [
            { type: "melee_fast", count: 5 },
            { type: "melee_basic", count: 3 },
          ],
          spawnDelay: 0.2,
        },
        {
          enemies: [
            { type: "melee_fast", count: 4 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 3,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "ranged_basic", count: 3 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "melee_fast", count: 3 },
            { type: "ranged_basic", count: 2 },
            { type: "ranged_spread", count: 1 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 4,
      isBoss: false,
      modifier: {
        type: "elite",
        enemyHpMultiplier: 1.8,
        enemyDamageMultiplier: 1.5,
        enemyCountMultiplier: 0.6,
      },
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 2 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.4,
        },
        {
          enemies: [
            { type: "melee_fast", count: 2 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.5,
        },
      ],
    },
    {
      id: 5,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "melee_fast", count: 3 },
            { type: "ranged_basic", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "ranged_spread", count: 3 },
            { type: "ranged_basic", count: 3 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 6,
      isBoss: false,
      modifier: { type: "fast", enemySpeedMultiplier: 1.5 },
      waves: [
        {
          enemies: [
            { type: "melee_fast", count: 5 },
            { type: "ranged_basic", count: 3 },
          ],
          spawnDelay: 0.2,
        },
        {
          enemies: [
            { type: "melee_fast", count: 4 },
            { type: "ranged_spread", count: 3 },
          ],
          spawnDelay: 0.3,
        },
      ],
    },
    {
      id: 7,
      isBoss: false,
      waves: [
        {
          enemies: [
            { type: "melee_basic", count: 4 },
            { type: "ranged_basic", count: 3 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.3,
        },
        {
          enemies: [
            { type: "melee_fast", count: 4 },
            { type: "ranged_spread", count: 3 },
          ],
          spawnDelay: 0.4,
        },
        {
          enemies: [
            { type: "melee_basic", count: 3 },
            { type: "ranged_basic", count: 2 },
            { type: "ranged_spread", count: 2 },
          ],
          spawnDelay: 0.4,
        },
      ],
    },
    {
      id: 8,
      isBoss: true,
      waves: [
        { enemies: [{ type: "boss_wizard", count: 1 }], spawnDelay: 1.0 },
      ],
    },
  ],
};

export const CHAPTERS: ChapterConfig[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3];

export function getChapter(chapterId: number): ChapterConfig {
  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) {
    return CHAPTERS[0];
  }
  return chapter;
}

export function getRoomConfig(
  chapterId: number,
  roomIndex: number,
): RoomConfig | null {
  const chapter = getChapter(chapterId);
  if (roomIndex < 0 || roomIndex >= chapter.rooms.length) {
    return null;
  }
  return chapter.rooms[roomIndex];
}
