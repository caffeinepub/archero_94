import type { EnemyType, EnemyBehavior } from "./types";

export interface BossConfig {
  type: EnemyType;
  name: string;
  title: string;
  hp: number;
  size: number;
  speed: number;
  damage: number;
  xpValue: number;
  coinValue: number;
  phase2HpThreshold: number; // fraction of maxHp (e.g. 0.5 = 50%)
  phase3HpThreshold: number; // fraction of maxHp (e.g. 0.25 = 25%)
  behavior: EnemyBehavior;
  color: string;
  accentColor: string;
}

export const BOSS_CONFIGS: Record<string, BossConfig> = {
  boss_golem: {
    type: "boss_golem",
    name: "Stone Golem",
    title: "The Unyielding",
    hp: 500,
    size: 64,
    speed: 45,
    damage: 18,
    xpValue: 200,
    coinValue: 80,
    phase2HpThreshold: 0.5,
    phase3HpThreshold: 0.25,
    behavior: "boss_pattern",
    color: "#8d6e63",
    accentColor: "#d7ccc8",
  },
  boss_dragon: {
    type: "boss_dragon",
    name: "Ember Dragon",
    title: "Lord of Flames",
    hp: 700,
    size: 72,
    speed: 60,
    damage: 22,
    xpValue: 300,
    coinValue: 120,
    phase2HpThreshold: 0.5,
    phase3HpThreshold: 0.25,
    behavior: "boss_pattern",
    color: "#c62828",
    accentColor: "#ff6d00",
  },
  boss_wizard: {
    type: "boss_wizard",
    name: "Arcane Wizard",
    title: "Master of Shadows",
    hp: 600,
    size: 56,
    speed: 80,
    damage: 20,
    xpValue: 400,
    coinValue: 160,
    phase2HpThreshold: 0.5,
    phase3HpThreshold: 0.25,
    behavior: "boss_pattern",
    color: "#6a1b9a",
    accentColor: "#e040fb",
  },
};

export function getBossConfig(type: EnemyType): BossConfig | null {
  return BOSS_CONFIGS[type] ?? null;
}

export function isBossType(type: EnemyType): boolean {
  return type.startsWith("boss_");
}
