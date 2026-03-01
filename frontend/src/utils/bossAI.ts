import type { EnemyState, GameState, Vector2 } from "./types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./constants";
import { createProjectile } from "./projectiles";
import { createEnemy } from "./enemies";

const BOSS_PHASE2_THRESHOLD = 0.5;
const BOSS_PHASE3_THRESHOLD = 0.25;

// Golem attack timings
const GOLEM_SLAM_COOLDOWN = 3.5;
const GOLEM_THROW_COOLDOWN = 2.0;
const GOLEM_CHARGE_COOLDOWN = 5.0;
const GOLEM_CHARGE_SPEED = 300;

// Dragon attack timings
const DRAGON_BREATH_COOLDOWN = 3.0;
const DRAGON_FIREBALL_COOLDOWN = 1.5;
const DRAGON_FLYOVER_COOLDOWN = 8.0;
const DRAGON_FLYOVER_DURATION = 3.0;

// Wizard attack timings
const WIZARD_MISSILE_COOLDOWN = 0.25;
const WIZARD_MISSILE_BURST = 8;
const WIZARD_TELEPORT_COOLDOWN = 4.0;
const WIZARD_ZONE_COOLDOWN = 5.0;

function updateBossPhase(boss: EnemyState): void {
  const hpRatio = boss.hp / boss.maxHp;
  const currentPhase = boss.bossPhase ?? 1;

  let newPhase = 1;
  if (hpRatio <= BOSS_PHASE3_THRESHOLD) {
    newPhase = 3;
  } else if (hpRatio <= BOSS_PHASE2_THRESHOLD) {
    newPhase = 2;
  }

  if (newPhase !== currentPhase) {
    boss.bossPhase = newPhase;
    // Reset pattern timer on phase change to give brief respite
    boss.bossPatternTimer = 1.5;
  }
}

// Golem boss — slow heavy attacker
function updateGolem(boss: EnemyState, state: GameState, dt: number): void {
  const phase = boss.bossPhase ?? 1;
  const player = state.player;

  // Handle charge dash movement
  if (boss.bossDashActive && boss.bossDashTarget) {
    const dx = boss.bossDashTarget.x - boss.position.x;
    const dy = boss.bossDashTarget.y - boss.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      boss.bossDashActive = false;
      boss.bossDashTarget = undefined;
      boss.speed = boss.baseSpeed;
    } else {
      boss.position.x += (dx / dist) * GOLEM_CHARGE_SPEED * dt;
      boss.position.y += (dy / dist) * GOLEM_CHARGE_SPEED * dt;
    }
    return;
  }

  // Slow move toward player
  const dx = player.position.x - boss.position.x;
  const dy = player.position.y - boss.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 80) {
    boss.position.x += (dx / dist) * boss.speed * dt;
    boss.position.y += (dy / dist) * boss.speed * dt;
  }

  // Clamp to arena
  clampBossToArena(boss);

  boss.bossPatternTimer = (boss.bossPatternTimer ?? 0) - dt;
  if ((boss.bossPatternTimer ?? 0) > 0) return;

  // Pick attack based on phase and randomness
  const roll = Math.random();

  if (phase === 1) {
    if (roll < 0.4) {
      doGolemSlam(boss, state);
      boss.bossPatternTimer = GOLEM_SLAM_COOLDOWN;
    } else if (roll < 0.7) {
      doGolemThrow(boss, state);
      boss.bossPatternTimer = GOLEM_THROW_COOLDOWN;
    } else {
      doGolemCharge(boss, state);
      boss.bossPatternTimer = GOLEM_CHARGE_COOLDOWN;
    }
  } else {
    // Phase 2/3: faster, adds shockwave after slam
    const speedMult = phase === 3 ? 1.4 : 1.2;
    boss.speed = boss.baseSpeed * speedMult;

    if (roll < 0.35) {
      doGolemSlam(boss, state, phase >= 2);
      boss.bossPatternTimer = GOLEM_SLAM_COOLDOWN * 0.8;
    } else if (roll < 0.65) {
      doGolemThrow(boss, state);
      boss.bossPatternTimer = GOLEM_THROW_COOLDOWN * 0.7;
    } else {
      doGolemCharge(boss, state);
      boss.bossPatternTimer = GOLEM_CHARGE_COOLDOWN * 0.7;
    }
  }
}

function doGolemSlam(
  boss: EnemyState,
  state: GameState,
  withShockwave = false,
): void {
  // AoE circle slam at current position
  state.abilityEffects.push({
    type: "circle",
    position: { x: boss.position.x, y: boss.position.y },
    radius: 90,
    timer: 0.5,
  });

  // Damage player if in range
  const player = state.player;
  const dx = player.position.x - boss.position.x;
  const dy = player.position.y - boss.position.y;
  if (dx * dx + dy * dy < 90 * 90) {
    applyBossDamage(boss, state);
  }

  if (withShockwave) {
    // Shockwave rings: spawn 8 projectiles outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const proj = createProjectile(
        boss.position,
        {
          x: boss.position.x + Math.cos(angle) * 200,
          y: boss.position.y + Math.sin(angle) * 200,
        },
        boss.damage * 0.6,
        "enemy",
        160,
      );
      state.projectiles.push(proj);
    }
  }

  state.audioEvents.push("boss_attack");
}

function doGolemThrow(boss: EnemyState, state: GameState): void {
  // Slow large projectile toward player
  const player = state.player;
  const proj = createProjectile(
    boss.position,
    player.position,
    boss.damage * 1.2,
    "enemy",
    130,
  );
  state.projectiles.push(proj);
  state.audioEvents.push("boss_attack");
}

function doGolemCharge(boss: EnemyState, state: GameState): void {
  boss.bossDashActive = true;
  boss.bossDashTarget = {
    x: state.player.position.x,
    y: state.player.position.y,
  };
  state.audioEvents.push("boss_attack");
}

// Dragon boss — ranged fire attacker
function updateDragon(boss: EnemyState, state: GameState, dt: number): void {
  const phase = boss.bossPhase ?? 1;
  const player = state.player;

  // Dragon is invulnerable during fly-over
  if (boss.bossInvulnerable) {
    boss.bossPatternTimer = (boss.bossPatternTimer ?? 0) - dt;
    if ((boss.bossPatternTimer ?? 0) <= 0) {
      boss.bossInvulnerable = false;
      boss.bossPatternTimer = DRAGON_FIREBALL_COOLDOWN;
    }

    // Rain fireballs during fly-over
    if (state.frameCount % 18 === 0) {
      const targetX = Math.random() * ARENA_WIDTH;
      const targetY = Math.random() * ARENA_HEIGHT;
      const proj = createProjectile(
        { x: targetX, y: -50 },
        { x: targetX, y: targetY + 100 },
        boss.damage * 0.7,
        "enemy",
        200,
      );
      state.projectiles.push(proj);
    }
    return;
  }

  // Maintain preferred distance from player (kite behavior for ranged)
  const dx = player.position.x - boss.position.x;
  const dy = player.position.y - boss.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const preferredDist = 200;

  if (dist < preferredDist - 30) {
    // Back away
    boss.position.x -= (dx / dist) * boss.speed * dt;
    boss.position.y -= (dy / dist) * boss.speed * dt;
  } else if (dist > preferredDist + 30) {
    // Move closer
    boss.position.x += (dx / dist) * boss.speed * 0.5 * dt;
    boss.position.y += (dy / dist) * boss.speed * 0.5 * dt;
  }

  clampBossToArena(boss);

  boss.bossPatternTimer = (boss.bossPatternTimer ?? 0) - dt;
  if ((boss.bossPatternTimer ?? 0) > 0) return;

  const roll = Math.random();
  const breathCooldown =
    phase >= 2 ? DRAGON_BREATH_COOLDOWN * 0.8 : DRAGON_BREATH_COOLDOWN;
  const fireballCooldown =
    phase >= 2 ? DRAGON_FIREBALL_COOLDOWN * 0.7 : DRAGON_FIREBALL_COOLDOWN;

  if (roll < 0.4) {
    doDragonBreath(boss, state, phase);
    boss.bossPatternTimer = breathCooldown;
  } else if (phase >= 2 && roll < 0.55) {
    // Phase 2+: fly-over attack
    boss.bossInvulnerable = true;
    boss.bossPatternTimer = DRAGON_FLYOVER_DURATION;
    state.audioEvents.push("boss_attack");
  } else if (phase >= 2 && roll < 0.7) {
    // Phase 2+: spawn minions
    spawnDragonMinion(boss, state);
    boss.bossPatternTimer = 6.0;
  } else {
    doDragonFireball(boss, state);
    boss.bossPatternTimer = fireballCooldown;
  }
}

function doDragonBreath(
  boss: EnemyState,
  state: GameState,
  phase: number,
): void {
  const player = state.player;
  const dx = player.position.x - boss.position.x;
  const dy = player.position.y - boss.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 0) return;

  const baseAngle = Math.atan2(dy, dx);
  const spreadCount = phase >= 2 ? 7 : 5;
  const spreadAngle = phase >= 2 ? Math.PI / 6 : Math.PI / 8;

  for (let i = 0; i < spreadCount; i++) {
    const offset =
      ((i - Math.floor(spreadCount / 2)) * spreadAngle) /
      Math.floor(spreadCount / 2);
    const angle = baseAngle + offset;
    const proj = createProjectile(
      boss.position,
      {
        x: boss.position.x + Math.cos(angle) * 300,
        y: boss.position.y + Math.sin(angle) * 300,
      },
      boss.damage * 0.8,
      "enemy",
      280,
    );
    proj.effects = ["burn"];
    state.projectiles.push(proj);
  }
  state.audioEvents.push("boss_attack");
}

function doDragonFireball(boss: EnemyState, state: GameState): void {
  const player = state.player;
  const proj = createProjectile(
    boss.position,
    player.position,
    boss.damage,
    "enemy",
    220,
  );
  proj.effects = ["burn"];
  state.projectiles.push(proj);
  state.audioEvents.push("boss_attack");
}

function spawnDragonMinion(boss: EnemyState, state: GameState): void {
  const pos: Vector2 = {
    x: boss.position.x + (Math.random() - 0.5) * 100,
    y: boss.position.y + (Math.random() - 0.5) * 100,
  };
  const minion = createEnemy("melee_basic", pos);
  state.enemies.push(minion);
}

// Wizard boss — teleporting magic attacker
function updateWizard(boss: EnemyState, state: GameState, dt: number): void {
  const phase = boss.bossPhase ?? 1;

  boss.bossPatternTimer = (boss.bossPatternTimer ?? 0) - dt;
  if ((boss.bossPatternTimer ?? 0) > 0) return;

  const teleportCooldown =
    phase >= 2 ? WIZARD_TELEPORT_COOLDOWN * 0.6 : WIZARD_TELEPORT_COOLDOWN;
  const missileCooldown =
    WIZARD_MISSILE_COOLDOWN * (phase >= 3 ? 0.6 : phase >= 2 ? 0.75 : 1);
  const missileBurst =
    phase >= 2 ? WIZARD_MISSILE_BURST + 4 : WIZARD_MISSILE_BURST;

  const roll = Math.random();

  if (roll < 0.35) {
    doWizardMissileBurst(boss, state, missileBurst);
    boss.bossPatternTimer = missileCooldown * missileBurst + 1.0;
  } else if (roll < 0.6) {
    doWizardTeleport(boss, state);
    boss.bossPatternTimer = teleportCooldown;
  } else {
    doWizardGroundZones(boss, state, phase);
    boss.bossPatternTimer = WIZARD_ZONE_COOLDOWN;
  }
}

function doWizardMissileBurst(
  boss: EnemyState,
  state: GameState,
  count: number,
): void {
  const player = state.player;
  for (let i = 0; i < count; i++) {
    // Schedule each missile with a small offset (we fire them all now but jitter positions)
    const spread = (Math.random() - 0.5) * 0.4;
    const dx = player.position.x - boss.position.x + (Math.random() - 0.5) * 40;
    const dy = player.position.y - boss.position.y + (Math.random() - 0.5) * 40;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy, dx) + spread;

    const proj = createProjectile(
      {
        x: boss.position.x + (Math.random() - 0.5) * 20,
        y: boss.position.y + (Math.random() - 0.5) * 20,
      },
      {
        x: boss.position.x + Math.cos(angle) * 400,
        y: boss.position.y + Math.sin(angle) * 400,
      },
      boss.damage * 0.5,
      "enemy",
      280,
    );
    proj.homing = true;
    state.projectiles.push(proj);
  }
  state.audioEvents.push("boss_attack");
}

function doWizardTeleport(boss: EnemyState, state: GameState): void {
  // Teleport to a random position away from player
  const player = state.player;
  let bestPos: Vector2 = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
  let bestDist = 0;

  for (let attempt = 0; attempt < 8; attempt++) {
    const pos: Vector2 = {
      x: 80 + Math.random() * (ARENA_WIDTH - 160),
      y: 80 + Math.random() * (ARENA_HEIGHT - 160),
    };
    const dx = pos.x - player.position.x;
    const dy = pos.y - player.position.y;
    const dist = dx * dx + dy * dy;
    if (dist > bestDist) {
      bestDist = dist;
      bestPos = pos;
    }
  }

  boss.position.x = bestPos.x;
  boss.position.y = bestPos.y;

  // Spawn brief visual at teleport location
  state.abilityEffects.push({
    type: "circle",
    position: { x: bestPos.x, y: bestPos.y },
    radius: 40,
    timer: 0.4,
  });

  state.audioEvents.push("boss_attack");
}

function doWizardGroundZones(
  boss: EnemyState,
  state: GameState,
  phase: number,
): void {
  const zoneCount = phase >= 2 ? 5 : 3;
  const player = state.player;

  for (let i = 0; i < zoneCount; i++) {
    // Zones appear near the player
    const pos: Vector2 = {
      x: player.position.x + (Math.random() - 0.5) * 200,
      y: player.position.y + (Math.random() - 0.5) * 200,
    };

    // Ground zones deal damage as a meteor-like effect
    state.abilityEffects.push({
      type: "meteor",
      position: pos,
      radius: 50,
      timer: 1.5,
    });

    // Damage player if standing in it
    const dx = player.position.x - pos.x;
    const dy = player.position.y - pos.y;
    if (dx * dx + dy * dy < 50 * 50) {
      applyBossDamage(boss, state);
    }
  }

  state.audioEvents.push("boss_attack");
}

function applyBossDamage(boss: EnemyState, state: GameState): void {
  const player = state.player;
  if (player.invincibilityFrames > 0) return;

  if (player.shieldActive) {
    player.shieldActive = false;
    player.invincibilityFrames = 0.5;
    state.abilityEffects.push({
      type: "shield_break",
      position: { x: player.position.x, y: player.position.y },
      radius: 24,
      timer: 0.3,
    });
    return;
  }

  if (player.dodgeChance > 0 && Math.random() < player.dodgeChance) return;

  let damage = boss.damage;
  if (player.damageReduction > 0) {
    damage = Math.max(1, damage - player.damageReduction);
  }

  player.hp -= damage;
  player.invincibilityFrames = 0.5;
  state.screenShakeEvents.push({ intensity: 10, duration: 0.3 });
  state.audioEvents.push("player_hit");

  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    state.gameOver = true;
  }
}

function clampBossToArena(boss: EnemyState): void {
  const half = Math.max(boss.size.width, boss.size.height) / 2;
  boss.position.x = Math.max(
    half + 10,
    Math.min(ARENA_WIDTH - half - 10, boss.position.x),
  );
  boss.position.y = Math.max(
    half + 10,
    Math.min(ARENA_HEIGHT - half - 10, boss.position.y),
  );
}

export function updateBoss(
  boss: EnemyState,
  state: GameState,
  dt: number,
): void {
  if (!boss.alive) return;
  if (boss.spawnTimer > 0) {
    boss.spawnTimer -= dt;
    return;
  }

  updateBossPhase(boss);

  switch (boss.type) {
    case "boss_golem":
      updateGolem(boss, state, dt);
      break;
    case "boss_dragon":
      updateDragon(boss, state, dt);
      break;
    case "boss_wizard":
      updateWizard(boss, state, dt);
      break;
  }
}
