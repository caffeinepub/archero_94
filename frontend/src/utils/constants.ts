import type { SkillId } from "./types";

// Arena
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 1200;
export const ARENA_PADDING = 20;

// Player
export const PLAYER_SIZE = 24;
export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HP = 100;
export const PLAYER_ATTACK_DAMAGE = 10;
export const PLAYER_ATTACK_SPEED = 1.5; // attacks per second
export const PLAYER_ATTACK_RANGE = 300;
export const PLAYER_CRIT_CHANCE = 0.05;
export const PLAYER_CRIT_MULTIPLIER = 2.0;
export const PLAYER_INVINCIBILITY_DURATION = 0.5; // seconds

// Projectile
export const PROJECTILE_SPEED = 400;
export const PROJECTILE_SIZE = 6;

// XP / Leveling
export const BASE_XP_THRESHOLD = 50;
export const XP_SCALING = 1.2;

// Drops
export const DROP_MAGNET_RANGE = 60;
export const DROP_SIZE = 8;
export const HP_DROP_CHANCE = 0.1;
export const HP_DROP_RESTORE = 0.2; // 20% of max HP

// Camera
export const CAMERA_LERP_SPEED = 0.1;

// Timing
export const FIXED_TIMESTEP = 1 / 60;
export const MAX_DELTA = 0.1; // cap to prevent spiral of death

// Colors
export const COLORS = {
  background: "#1a1a2e",
  arena: "#16213e",
  arenaGrid: "#1a2744",
  arenaBorder: "#0f3460",
  player: "#3db86a",
  playerOutline: "#4acc7a",
  playerDirection: "#ffffff",
  hpBarBg: "#4a0000",
  hpBarFill: "#00c853",
  hpBarLow: "#ff5252",
  xpBarBg: "#1a1a2e",
  xpBarFill: "#7c4dff",
  projectilePlayer: "#ffd700",
  projectileEnemy: "#ff4444",
  xpDrop: "#69f0ae",
  coinDrop: "#ffd740",
  hpDrop: "#ff5252",
  enemyMelee: "#e57373",
  enemyFast: "#ffb74d",
  enemyRanged: "#64b5f6",
  enemySpread: "#ba68c8",
  textPrimary: "#ffffff",
  textSecondary: "#aaaaaa",
  door: "#4fc3f7",
  doorGlow: "rgba(79, 195, 247, 0.3)",
  roomClearedText: "#ffd700",
  victoryText: "#ffd700",
} as const;

// Enemy animations
export const ENEMY_SPAWN_DURATION = 0.4;
export const ENEMY_DEATH_DURATION = 0.3;
export const ENEMY_WINDUP_DURATION = 0.3;

// Room progression
export const ROOM_CLEAR_PAUSE = 1.5; // seconds to show "Room Cleared!" before door appears
export const ROOM_TRANSITION_DURATION = 0.5; // seconds for transition effect
export const DOOR_WIDTH = 50;
export const DOOR_HEIGHT = 60;
export const DOOR_GLOW_RADIUS = 30;
export const DOOR_COLLISION_RANGE = 35;
export const DIFFICULTY_HP_SCALING = 0.2; // +20% HP per difficulty level
export const DIFFICULTY_DAMAGE_SCALING = 0.15; // +15% damage per difficulty level

// Joystick
export const JOYSTICK_RADIUS = 70;
export const JOYSTICK_KNOB_RADIUS = 28;
export const JOYSTICK_DEAD_ZONE = 0.15;
export const JOYSTICK_ZONE_SIZE = 180; // touch area size

// Hero configs
export interface HeroConfig {
  hp: number;
  damage: number;
  speed: number;
  attackSpeed: number;
  startingSkill?: SkillId;
}

export const HERO_CONFIGS: Record<string, HeroConfig> = {
  archer: {
    hp: PLAYER_MAX_HP,
    damage: PLAYER_ATTACK_DAMAGE,
    speed: PLAYER_SPEED,
    attackSpeed: PLAYER_ATTACK_SPEED,
  },
  mage: {
    hp: 80,
    damage: 12,
    speed: PLAYER_SPEED,
    attackSpeed: PLAYER_ATTACK_SPEED,
    startingSkill: "homing",
  },
  warrior: {
    hp: 130,
    damage: 10,
    speed: PLAYER_SPEED,
    attackSpeed: 1.0,
    startingSkill: "sword_spin",
  },
};
