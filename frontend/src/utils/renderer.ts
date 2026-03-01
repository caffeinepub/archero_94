import type {
  GameState,
  EnemyState,
  Projectile,
  DamageNumber,
  AbilityEffect,
  Particle,
} from "./types";
import type { JoystickState } from "./input";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  COLORS,
  DOOR_HEIGHT,
  DOOR_WIDTH,
  ENEMY_DEATH_DURATION,
  ENEMY_SPAWN_DURATION,
  ENEMY_WINDUP_DURATION,
  JOYSTICK_KNOB_RADIUS,
  JOYSTICK_RADIUS,
  PLAYER_SIZE,
  PROJECTILE_SIZE,
} from "./constants";
import { getRoomConfig } from "./chapters";
import { getBossConfig, isBossType } from "./bosses";

// Chapter color palettes for arenas — bright Archero-style
const CHAPTER_PALETTES = {
  1: {
    grassLight: "#8BC34A",
    grassDark: "#7CB342",
    wallTop: "#2EAEC7",
    wallFace: "#1E8FA5",
    wallDark: "#176E80",
    trim: "#40C4E0",
    waterLight: "#3BB8D4",
    waterDark: "#2EA2BC",
  },
  2: {
    grassLight: "#C4A24A",
    grassDark: "#B08E3C",
    wallTop: "#8B5E3C",
    wallFace: "#6B4228",
    wallDark: "#4A2E1A",
    trim: "#D4803A",
    waterLight: "#CC7A3B",
    waterDark: "#B06830",
  },
  3: {
    grassLight: "#6A6A9E",
    grassDark: "#5A5A8E",
    wallTop: "#7A5AAE",
    wallFace: "#5A3A8E",
    wallDark: "#3A2060",
    trim: "#B080E0",
    waterLight: "#8060C0",
    waterDark: "#6848A8",
  },
} as Record<
  number,
  {
    grassLight: string;
    grassDark: string;
    wallTop: string;
    wallFace: string;
    wallDark: string;
    trim: string;
    waterLight: string;
    waterDark: string;
  }
>;

function getPalette(chapterId: number) {
  return CHAPTER_PALETTES[chapterId] ?? CHAPTER_PALETTES[1];
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
  viewportHeight: number,
  joystick: JoystickState,
): void {
  const { camera } = state;

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawArena(ctx, state);
  drawObstacles(ctx, state);

  if (state.doorActive) {
    drawDoor(ctx, state);
  }

  drawDrops(ctx, state);
  drawAbilityEffects(ctx, state);
  drawParticles(ctx, state.particles);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state.projectiles);
  drawPlayer(ctx, state);
  drawEntityHpBars(ctx, state);
  drawStatusEffectIndicators(ctx, state);
  drawDamageNumbers(ctx, state.damageNumbers);

  ctx.restore();

  // HUD overlay (screen space)
  drawHUD(ctx, state, viewportWidth);

  // Boss HP bar at top of screen
  const currentRoom = getRoomConfig(state.chapterId, state.currentRoom - 1);
  if (currentRoom?.isBoss) {
    const boss = state.enemies.find((e) => isBossType(e.type) && e.alive);
    if (boss) {
      drawBossHPBar(ctx, boss, state, viewportWidth);
    }
  }

  // Portal arrow guide when room is cleared
  if (state.roomCleared && state.doorActive) {
    drawPortalArrow(ctx, state, viewportWidth, viewportHeight);
  }

  drawJoystick(ctx, joystick, viewportWidth, viewportHeight);
}

// Arena with solid green grass, natural decorations, and simple edge walls
function drawArena(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pal = getPalette(state.chapterId);

  // Dark background outside arena
  ctx.fillStyle = "#2A5A1A";
  ctx.fillRect(-200, -200, ARENA_WIDTH + 400, ARENA_HEIGHT + 400);

  // Solid grass fill across entire arena
  ctx.fillStyle = pal.grassLight;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  // Subtle grass variation patches (large soft blobs)
  ctx.save();
  ctx.globalAlpha = 0.15;
  const patchSeed = state.chapterId * 500 + state.currentRoom * 50;
  for (let i = 0; i < 20; i++) {
    const px = (patchSeed + i * 397) % ARENA_WIDTH;
    const py = (patchSeed + i * 613) % ARENA_HEIGHT;
    const radius = 40 + (i % 5) * 15;
    ctx.fillStyle = i % 2 === 0 ? pal.grassDark : "#6ABF3A";
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Scattered grass tufts
  ctx.save();
  ctx.globalAlpha = 0.2;
  const grassSeed = state.chapterId * 1000 + state.currentRoom * 100;
  for (let i = 0; i < 120; i++) {
    const gx = (grassSeed + i * 137) % ARENA_WIDTH;
    const gy = (grassSeed + i * 271) % ARENA_HEIGHT;
    ctx.strokeStyle = i % 3 === 0 ? "#5A9030" : "#A5D66A";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const lean = ((i * 7) % 5) - 2;
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + lean, gy - 4 - (i % 3));
    ctx.stroke();
  }
  ctx.restore();

  // Environmental decorations (flowers, small rocks, mushrooms)
  drawDecorations(ctx, state);

  // Thin border around the arena
  ctx.strokeStyle = "#3A6A20";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  // Room modifier label
  if (state.roomModifier) {
    drawRoomModifierLabel(ctx, state);
  }
}

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const seed = state.chapterId * 500 + state.currentRoom * 100;

  // Generate decorations scattered across the full arena
  const decorations: { x: number; y: number; type: string }[] = [];
  for (let i = 0; i < 35; i++) {
    const x = 20 + ((seed + i * 197) % (ARENA_WIDTH - 40));
    const y = 20 + ((seed + i * 311) % (ARENA_HEIGHT - 40));
    const types = ["flower", "flower", "mushroom", "pebble", "flower"];
    decorations.push({ x, y, type: types[i % types.length] });
  }

  ctx.save();
  ctx.globalAlpha = 0.55;
  for (const dec of decorations) {
    if (dec.type === "mushroom") {
      ctx.fillStyle = state.chapterId === 2 ? "#c45a30" : "#e57373";
      ctx.beginPath();
      ctx.arc(dec.x, dec.y - 3, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#e0d8c8";
      ctx.fillRect(dec.x - 1.5, dec.y - 3, 3, 5);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(dec.x - 2, dec.y - 5, 1.2, 0, Math.PI * 2);
      ctx.arc(dec.x + 2, dec.y - 4, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === "flower") {
      const colors = ["#ffeb3b", "#ff9800", "#e91e63", "#9c27b0", "#f06292"];
      const color = colors[(seed + Math.round(dec.x * 10)) % colors.length];
      for (let p = 0; p < 4; p++) {
        const angle = (p / 4) * Math.PI * 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          dec.x + Math.cos(angle) * 2.5,
          dec.y - 3 + Math.sin(angle) * 2.5,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(dec.x, dec.y - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dec.x, dec.y - 1);
      ctx.lineTo(dec.x, dec.y + 4);
      ctx.stroke();
    } else if (dec.type === "pebble") {
      ctx.fillStyle = "#8a9a7a";
      ctx.beginPath();
      ctx.ellipse(dec.x, dec.y, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.ellipse(dec.x - 1, dec.y - 1, 1.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRoomModifierLabel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const mod = state.roomModifier;
  if (!mod) return;

  let label = "";
  let color = "";
  if (mod.type === "swarm") {
    label = "SWARM";
    color = "#ffb74d";
  } else if (mod.type === "elite") {
    label = "ELITE";
    color = "#e57373";
  } else if (mod.type === "fast") {
    label = "FAST";
    color = "#64b5f6";
  }

  ctx.save();
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;

  // Background pill
  const metrics = ctx.measureText(label);
  const pillW = metrics.width + 12;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.roundRect(6, ARENA_HEIGHT - 22, pillW, 16, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(label, 12, ARENA_HEIGHT - 10);
  ctx.restore();
}

// Player character — cartoon Archero-style chibi archer
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player } = state;
  if (!player.alive) return;

  const { x, y } = player.position;
  const r = PLAYER_SIZE / 2;

  // Invincibility flash
  if (
    player.invincibilityFrames > 0 &&
    Math.floor(state.frameCount / 4) % 2 === 0
  ) {
    ctx.globalAlpha = 0.4;
  }

  // Shadow
  ctx.save();
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(x, y + r + 5, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Idle breathing animation
  const breathe = player.isMoving ? 0 : Math.sin(state.frameCount * 0.06) * 1.0;
  const bobOffset = player.isMoving
    ? Math.sin(state.frameCount * 0.25) * 1.8
    : breathe;
  // Movement lean
  const leanX = player.isMoving ? player.velocity.x * 0.01 : 0;
  const leanY = player.isMoving ? player.velocity.y * 0.01 : 0;
  // Cloak sway
  const cloakSway = player.isMoving
    ? Math.sin(state.frameCount * 0.15) * 2.0
    : Math.sin(state.frameCount * 0.04) * 0.6;

  const drawX = x + leanX;
  const drawY = y + bobOffset + leanY;

  ctx.save();
  ctx.translate(drawX, drawY);

  const fx = player.facingDirection.x;
  const fy = player.facingDirection.y;

  // --- Chibi body (short stubby torso + cloak) ---
  const bodyTop = -r * 0.15;
  const bodyBottom = r + 3;
  const bodyTopW = r * 0.6;
  const bodyBottomW = r * 0.85 + cloakSway * 0.2;

  // Cloak body — bright green gradient (Archero signature)
  const cloakGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom);
  cloakGrad.addColorStop(0, "#3db86a");
  cloakGrad.addColorStop(0.6, "#2d9d56");
  cloakGrad.addColorStop(1, "#1e7a3e");
  ctx.fillStyle = cloakGrad;
  ctx.beginPath();
  ctx.moveTo(-bodyTopW, bodyTop);
  ctx.lineTo(bodyTopW, bodyTop);
  ctx.quadraticCurveTo(
    bodyBottomW + 3,
    bodyBottom * 0.5,
    bodyBottomW + cloakSway * 0.4,
    bodyBottom,
  );
  ctx.lineTo(-bodyBottomW + cloakSway * 0.2, bodyBottom);
  ctx.quadraticCurveTo(-bodyBottomW - 3, bodyBottom * 0.5, -bodyTopW, bodyTop);
  ctx.closePath();
  ctx.fill();

  // Cloak dark side for depth
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(1, bodyTop);
  ctx.lineTo(bodyTopW, bodyTop);
  ctx.quadraticCurveTo(
    bodyBottomW + 3,
    bodyBottom * 0.5,
    bodyBottomW + cloakSway * 0.4,
    bodyBottom,
  );
  ctx.lineTo(1, bodyBottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cloak bottom trim highlight
  ctx.save();
  ctx.strokeStyle = "#5edd8a";
  ctx.lineWidth = 1.0;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(-bodyBottomW + cloakSway * 0.2, bodyBottom);
  ctx.lineTo(bodyBottomW + cloakSway * 0.4, bodyBottom);
  ctx.stroke();
  ctx.restore();

  // Tiny feet peeking out
  const footY = bodyBottom + 1;
  ctx.fillStyle = "#5a3825";
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, footY, 3, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.25, footY, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Big chibi head (oversized for cartoon look) ---
  const headR = r * 0.62;
  const headCY = -r * 0.6;

  // Face — bright warm skin
  const faceGrad = ctx.createRadialGradient(
    -1,
    headCY - 1.5,
    0,
    0,
    headCY,
    headR,
  );
  faceGrad.addColorStop(0, "#ffe0c2");
  faceGrad.addColorStop(1, "#f5c69a");
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Face outline
  ctx.strokeStyle = "#d9a06e";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Blush cheeks
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#ff8a8a";
  ctx.beginPath();
  ctx.ellipse(-headR * 0.6, headCY + headR * 0.3, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(headR * 0.6, headCY + headR * 0.3, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hood — rounded green hood wrapping over head
  const hoodTop = headCY - headR - 2;
  const hoodW = headR + 4;
  const hoodGrad = ctx.createLinearGradient(
    0,
    hoodTop,
    0,
    headCY + headR * 0.3,
  );
  hoodGrad.addColorStop(0, "#4acc7a");
  hoodGrad.addColorStop(1, "#2d9d56");
  ctx.fillStyle = hoodGrad;
  ctx.beginPath();
  ctx.moveTo(0, hoodTop - 3);
  ctx.quadraticCurveTo(hoodW * 0.7, hoodTop + 1, hoodW, headCY);
  ctx.quadraticCurveTo(
    hoodW * 0.9,
    headCY + headR * 0.4,
    headR * 0.5,
    headCY + headR * 0.35,
  );
  ctx.lineTo(-headR * 0.5, headCY + headR * 0.35);
  ctx.quadraticCurveTo(-hoodW * 0.9, headCY + headR * 0.4, -hoodW, headCY);
  ctx.quadraticCurveTo(-hoodW * 0.7, hoodTop + 1, 0, hoodTop - 3);
  ctx.closePath();
  ctx.fill();

  // Hood outline
  ctx.strokeStyle = "#1e7a3e";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Hood highlight (light reflection)
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-2, hoodTop - 1);
  ctx.quadraticCurveTo(
    -hoodW * 0.5,
    hoodTop + 3,
    -hoodW * 0.6,
    headCY - headR * 0.2,
  );
  ctx.lineTo(-headR * 0.3, headCY - headR * 0.1);
  ctx.quadraticCurveTo(-hoodW * 0.2, hoodTop + 4, -2, hoodTop - 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Scarf / collar — golden yellow (signature Archero detail)
  ctx.fillStyle = "#ffd54f";
  ctx.beginPath();
  ctx.moveTo(-bodyTopW - 1, bodyTop + 1);
  ctx.quadraticCurveTo(0, bodyTop + 5, bodyTopW + 1, bodyTop + 1);
  ctx.quadraticCurveTo(bodyTopW + 2, bodyTop + 4, bodyTopW - 1, bodyTop + 6);
  ctx.quadraticCurveTo(0, bodyTop + 9, -bodyTopW + 1, bodyTop + 6);
  ctx.quadraticCurveTo(-bodyTopW - 2, bodyTop + 4, -bodyTopW - 1, bodyTop + 1);
  ctx.closePath();
  ctx.fill();

  // Scarf shadow for depth
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#c8a020";
  ctx.beginPath();
  ctx.moveTo(0, bodyTop + 5);
  ctx.quadraticCurveTo(bodyTopW * 0.5, bodyTop + 7, bodyTopW - 1, bodyTop + 6);
  ctx.quadraticCurveTo(bodyTopW + 2, bodyTop + 4, bodyTopW + 1, bodyTop + 1);
  ctx.quadraticCurveTo(bodyTopW * 0.5, bodyTop + 3, 0, bodyTop + 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- Big cartoon eyes (looking in facing direction) ---
  const eyeOff = headR * 0.25;
  const eyeBaseY = headCY + 1;

  // Eye whites
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    -3.5 + fx * eyeOff,
    eyeBaseY + fy * eyeOff * 0.3,
    3.0,
    3.4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    3.5 + fx * eyeOff,
    eyeBaseY + fy * eyeOff * 0.3,
    3.0,
    3.4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Eye outlines
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(
    -3.5 + fx * eyeOff,
    eyeBaseY + fy * eyeOff * 0.3,
    3.0,
    3.4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(
    3.5 + fx * eyeOff,
    eyeBaseY + fy * eyeOff * 0.3,
    3.0,
    3.4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Pupils (follow facing direction more)
  const pupilShift = 1.2;
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(
    -3.5 + fx * (eyeOff + pupilShift),
    eyeBaseY + 0.5 + fy * (eyeOff * 0.3 + pupilShift * 0.5),
    1.8,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    3.5 + fx * (eyeOff + pupilShift),
    eyeBaseY + 0.5 + fy * (eyeOff * 0.3 + pupilShift * 0.5),
    1.8,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Eye glint (big cartoon sparkle)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(
    -4.0 + fx * eyeOff,
    eyeBaseY - 0.8 + fy * eyeOff * 0.3,
    1.0,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    3.0 + fx * eyeOff,
    eyeBaseY - 0.8 + fy * eyeOff * 0.3,
    1.0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // Smaller secondary glint
  ctx.beginPath();
  ctx.arc(
    -2.8 + fx * eyeOff,
    eyeBaseY + 1.2 + fy * eyeOff * 0.3,
    0.5,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    4.2 + fx * eyeOff,
    eyeBaseY + 1.2 + fy * eyeOff * 0.3,
    0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Small determined mouth
  ctx.strokeStyle = "#b07850";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(
    0 + fx * 0.5,
    headCY + headR * 0.55 + fy * 0.5,
    1.8,
    0.15 * Math.PI,
    0.85 * Math.PI,
  );
  ctx.stroke();

  ctx.restore();

  // Bow (drawn in world-space, offset from body in facing direction)
  ctx.save();
  const bowOffX = drawX + fx * r * 1.1;
  const bowOffY = drawY + fy * r * 0.6;
  const perpX = -fy;
  const perpY = fx;
  const bowLen = r * 1.5;

  // Bow stave (curved, warm wood)
  ctx.strokeStyle = "#c8884c";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bowOffX + perpX * bowLen * 0.5, bowOffY + perpY * bowLen * 0.5);
  ctx.quadraticCurveTo(
    bowOffX + fx * 9,
    bowOffY + fy * 9,
    bowOffX - perpX * bowLen * 0.5,
    bowOffY - perpY * bowLen * 0.5,
  );
  ctx.stroke();

  // Bow stave inner highlight
  ctx.strokeStyle = "#e0a868";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(bowOffX + perpX * bowLen * 0.45, bowOffY + perpY * bowLen * 0.45);
  ctx.quadraticCurveTo(
    bowOffX + fx * 7,
    bowOffY + fy * 7,
    bowOffX - perpX * bowLen * 0.45,
    bowOffY - perpY * bowLen * 0.45,
  );
  ctx.stroke();

  // Bowstring
  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(bowOffX + perpX * bowLen * 0.5, bowOffY + perpY * bowLen * 0.5);
  ctx.lineTo(bowOffX - perpX * bowLen * 0.5, bowOffY - perpY * bowLen * 0.5);
  ctx.stroke();

  // Arrow nocked on string (glowing orb when idle, arrow when moving)
  if (!player.isMoving) {
    // Glowing energy orb
    const orbX = bowOffX - fx * 2;
    const orbY = bowOffY - fy * 2;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#ffee88";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Arrow shaft
    const arrowTipX = bowOffX + fx * 10;
    const arrowTipY = bowOffY + fy * 10;
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bowOffX - fx * 6, bowOffY - fy * 6);
    ctx.lineTo(arrowTipX, arrowTipY);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowTipX - fx * 4 + perpX * 2, arrowTipY - fy * 4 + perpY * 2);
    ctx.lineTo(arrowTipX - fx * 4 - perpX * 2, arrowTipY - fy * 4 - perpY * 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.lineCap = "butt";
  ctx.restore();

  ctx.globalAlpha = 1;
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  for (const p of particles) {
    if (!p.alive || p.size <= 0.5) continue;

    const alpha = p.lifetime / p.maxLifetime;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function getEnemyColor(type: EnemyState["type"]): string {
  switch (type) {
    case "melee_basic":
      return COLORS.enemyMelee;
    case "melee_fast":
      return COLORS.enemyFast;
    case "ranged_basic":
      return COLORS.enemyRanged;
    case "ranged_spread":
      return COLORS.enemySpread;
    case "boss_golem":
      return "#8d6e63";
    case "boss_dragon":
      return "#c62828";
    case "boss_wizard":
      return "#6a1b9a";
    default:
      return COLORS.enemyMelee;
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const enemy of state.enemies) {
    const { x, y } = enemy.position;
    const color = getEnemyColor(enemy.type);

    // Death animation
    if (!enemy.alive && enemy.deathTimer > 0) {
      const deathProgress = 1 - enemy.deathTimer / ENEMY_DEATH_DURATION;
      const scale = 1 - deathProgress;
      const alpha = 1 - deathProgress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      drawEnemyBody(ctx, enemy, 0, 0, color, state);
      ctx.restore();
      continue;
    }

    if (!enemy.alive) continue;

    // Spawn animation
    if (enemy.spawnTimer > 0) {
      const spawnProgress = 1 - enemy.spawnTimer / ENEMY_SPAWN_DURATION;
      const scale = spawnProgress;
      const alpha = spawnProgress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      drawEnemyBody(ctx, enemy, 0, 0, color, state);
      ctx.restore();
      continue;
    }

    // Attack windup warning for ranged enemies
    if (enemy.attackWindup > 0) {
      const windupProgress = 1 - enemy.attackWindup / ENEMY_WINDUP_DURATION;
      drawAttackWarning(ctx, enemy, state, windupProgress);
    }

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + enemy.size.height / 2 + 2,
      (enemy.size.width / 2) * 0.7,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    drawEnemyBody(ctx, enemy, x, y, color, state);
  }
}

function drawEnemyBody(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  x: number,
  y: number,
  color: string,
  _state: GameState,
): void {
  const halfW = enemy.size.width / 2;
  const halfH = enemy.size.height / 2;
  const t = Date.now();

  if (isBossType(enemy.type)) {
    drawBossBody(ctx, enemy, x, y, color);
    return;
  }

  if (enemy.type === "melee_basic") {
    // Slime — wobbly bezier blob with drip, highlight, mouth
    const squish = 1 + Math.sin(t * 0.005) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 / squish, squish);

    // Wobbly body outline (8 control points)
    const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, halfW);
    grad.addColorStop(0, lightenColor(color, 0.35));
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, lightenColor(color, -0.15));
    ctx.fillStyle = grad;
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const wobble = Math.sin(t * 0.004 + i * 1.3) * halfW * 0.08;
      const baseR = i >= 3 && i <= 5 ? halfW * 1.05 : halfW * 0.95;
      const r = baseR + wobble;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevAngle = ((i - 0.5) / points) * Math.PI * 2;
        const cpR = baseR + wobble * 1.3;
        ctx.quadraticCurveTo(
          Math.cos(prevAngle) * cpR,
          Math.sin(prevAngle) * cpR,
          px,
          py,
        );
      }
    }
    ctx.closePath();
    ctx.fill();

    // Drip tendril hanging from bottom
    const dripOff = Math.sin(t * 0.003) * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-3, halfH * 0.7);
    ctx.quadraticCurveTo(-1 + dripOff, halfH + 5, 1 + dripOff, halfH + 8);
    ctx.quadraticCurveTo(3 + dripOff, halfH + 5, 3, halfH * 0.7);
    ctx.closePath();
    ctx.fill();

    // Shiny highlight bubble
    const hlOff = Math.sin(t * 0.002) * 2;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(
      -halfW * 0.2 + hlOff,
      -halfH * 0.3,
      halfW * 0.3,
      halfH * 0.25,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Small bubble
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(-halfW * 0.35 + hlOff, -halfH * 0.45, 2, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-4, -3, 3.5, 0, Math.PI * 2);
    ctx.arc(4, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(-3, -2, 2, 0, Math.PI * 2);
    ctx.arc(5, -2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Angry brow
    ctx.strokeStyle = lightenColor(color, -0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(-2, -5);
    ctx.moveTo(7, -7);
    ctx.lineTo(2, -5);
    ctx.stroke();

    // Jagged mouth
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 3);
    ctx.lineTo(-3, 5);
    ctx.lineTo(-1, 3);
    ctx.lineTo(1, 5);
    ctx.lineTo(3, 3);
    ctx.lineTo(5, 5);
    ctx.stroke();

    ctx.restore();
  } else if (enemy.type === "melee_fast") {
    // Bat — lumpy body, 3-segment wings, fangs, prominent ears
    const flapAngle = Math.sin(t * 0.015) * 0.6;

    ctx.save();
    ctx.translate(x, y);

    // Lumpy body (not a perfect circle)
    const bodyR = halfW * 0.55;
    const grad = ctx.createRadialGradient(-2, -2, 0, 0, 0, bodyR);
    grad.addColorStop(0, lightenColor(color, 0.25));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const bump = 1 + Math.sin(angle * 3) * 0.08;
      const px = Math.cos(angle) * bodyR * bump;
      const py = Math.sin(angle) * bodyR * bump;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 3-segment membrane wings (left)
    ctx.save();
    ctx.rotate(flapAngle);
    ctx.fillStyle = lightenColor(color, -0.1);
    const wingW = halfW * 1.3;
    const wingH = halfH * 0.9;
    // Wing membrane
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(-wingW * 0.4, -wingH * 0.8);
    ctx.lineTo(-wingW * 0.7, -wingH * 0.5);
    ctx.lineTo(-wingW, -wingH * 0.1);
    ctx.lineTo(-wingW * 0.9, wingH * 0.3);
    ctx.lineTo(-wingW * 0.5, wingH * 0.2);
    ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fill();
    // Bone lines
    ctx.strokeStyle = lightenColor(color, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -1);
    ctx.lineTo(-wingW * 0.4, -wingH * 0.8);
    ctx.moveTo(-3, 0);
    ctx.lineTo(-wingW * 0.7, -wingH * 0.5);
    ctx.moveTo(-3, 1);
    ctx.lineTo(-wingW, -wingH * 0.1);
    ctx.stroke();
    ctx.restore();

    // 3-segment membrane wings (right)
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.fillStyle = lightenColor(color, -0.1);
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(wingW * 0.4, -wingH * 0.8);
    ctx.lineTo(wingW * 0.7, -wingH * 0.5);
    ctx.lineTo(wingW, -wingH * 0.1);
    ctx.lineTo(wingW * 0.9, wingH * 0.3);
    ctx.lineTo(wingW * 0.5, wingH * 0.2);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = lightenColor(color, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, -1);
    ctx.lineTo(wingW * 0.4, -wingH * 0.8);
    ctx.moveTo(3, 0);
    ctx.lineTo(wingW * 0.7, -wingH * 0.5);
    ctx.moveTo(3, 1);
    ctx.lineTo(wingW, -wingH * 0.1);
    ctx.stroke();
    ctx.restore();

    // Prominent pointed ears
    ctx.fillStyle = lightenColor(color, 0.1);
    ctx.beginPath();
    ctx.moveTo(-5, -bodyR * 0.6);
    ctx.lineTo(-9, -bodyR * 1.3);
    ctx.lineTo(-2, -bodyR * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -bodyR * 0.6);
    ctx.lineTo(9, -bodyR * 1.3);
    ctx.lineTo(2, -bodyR * 0.7);
    ctx.closePath();
    ctx.fill();

    // Eyes (red with white glow)
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-3, -2.5, 1, 0, Math.PI * 2);
    ctx.arc(3, -2.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Fangs (white triangles below eyes)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-3, 1);
    ctx.lineTo(-2, 5);
    ctx.lineTo(-4, 1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 1);
    ctx.lineTo(2, 5);
    ctx.lineTo(4, 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else if (enemy.type === "ranged_basic") {
    // Mage — flowing bell robe, curved wizard hat, floating hands, orb glow
    const hover = Math.sin(t * 0.004) * 2;

    ctx.save();
    ctx.translate(x, y + hover);

    // Flowing bell-shaped robe
    const robeGrad = ctx.createLinearGradient(0, -halfH * 0.3, 0, halfH);
    robeGrad.addColorStop(0, lightenColor(color, 0.2));
    robeGrad.addColorStop(0.6, color);
    robeGrad.addColorStop(1, lightenColor(color, -0.1));
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -halfH * 0.3);
    ctx.quadraticCurveTo(halfW * 0.3, -halfH * 0.1, halfW * 0.9, halfH * 0.7);
    ctx.quadraticCurveTo(halfW * 0.7, halfH, 0, halfH);
    ctx.quadraticCurveTo(-halfW * 0.7, halfH, -halfW * 0.9, halfH * 0.7);
    ctx.quadraticCurveTo(-halfW * 0.3, -halfH * 0.1, 0, -halfH * 0.3);
    ctx.closePath();
    ctx.fill();

    // Hem line
    ctx.strokeStyle = lightenColor(color, 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.85, halfH * 0.75);
    ctx.quadraticCurveTo(0, halfH + 2, halfW * 0.85, halfH * 0.75);
    ctx.stroke();

    // Robe shadow side
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(0, -halfH * 0.3);
    ctx.quadraticCurveTo(halfW * 0.3, -halfH * 0.1, halfW * 0.9, halfH * 0.7);
    ctx.quadraticCurveTo(halfW * 0.7, halfH, 0, halfH);
    ctx.lineTo(0, -halfH * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = "#fdd9b5";
    ctx.beginPath();
    ctx.arc(0, -halfH + 4, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Wizard hat — tall, curved, bent tip
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(4, -halfH - 16);
    ctx.quadraticCurveTo(2, -halfH - 8, 8, -halfH + 2);
    ctx.lineTo(-8, -halfH + 2);
    ctx.quadraticCurveTo(-2, -halfH - 8, 4, -halfH - 16);
    ctx.closePath();
    ctx.fill();

    // Hat band
    ctx.fillStyle = lightenColor(color, 0.3);
    ctx.fillRect(-8, -halfH + 0, 16, 3);

    // Hat highlight
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(2, -halfH - 14);
    ctx.quadraticCurveTo(0, -halfH - 6, -4, -halfH + 1);
    ctx.lineTo(-2, -halfH + 1);
    ctx.quadraticCurveTo(1, -halfH - 6, 2, -halfH - 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Glowing eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-2.5, -halfH + 4, 1.8, 0, Math.PI * 2);
    ctx.arc(2.5, -halfH + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Floating hands (casting gesture)
    const handBob = Math.sin(t * 0.005) * 1.5;
    ctx.fillStyle = "#fdd9b5";
    ctx.beginPath();
    ctx.arc(-halfW * 0.8, halfH * 0.1 + handBob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(halfW * 0.8, halfH * 0.1 - handBob, 3, 0, Math.PI * 2);
    ctx.fill();

    // Staff with orb
    const orbPulse = 0.7 + Math.sin(t * 0.006) * 0.3;
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(halfW * 0.8, halfH * 0.1 - handBob + 3);
    ctx.lineTo(halfW * 0.8, halfH);
    ctx.stroke();

    // Orb on staff
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = lightenColor(color, 0.5);
    ctx.beginPath();
    ctx.arc(halfW * 0.8, halfH * 0.1 - handBob - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(100, 181, 246, ${orbPulse})`;
    ctx.beginPath();
    ctx.arc(halfW * 0.8, halfH * 0.1 - handBob - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Orb glow on robe (subtle overlay)
    ctx.save();
    ctx.globalAlpha = 0.08 * orbPulse;
    const glowGrad = ctx.createRadialGradient(
      halfW * 0.5,
      halfH * 0.1,
      0,
      halfW * 0.5,
      halfH * 0.1,
      halfW,
    );
    glowGrad.addColorStop(0, "#64b5f6");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);
    ctx.restore();

    ctx.restore();
  } else if (enemy.type === "ranged_spread") {
    // Spider — cephalothorax + abdomen, 2-segment legs, pedipalps, eye cluster
    ctx.save();
    ctx.translate(x, y);

    // Abdomen (rear, larger)
    const abdR = halfW * 0.4;
    const abdY = halfH * 0.25;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, abdY, abdR, abdR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen pattern (chevron markings)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = lightenColor(color, 0.3);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const py = abdY - abdR * 0.3 + i * (abdR * 0.35);
      ctx.beginPath();
      ctx.moveTo(-abdR * 0.4, py);
      ctx.lineTo(0, py + abdR * 0.2);
      ctx.lineTo(abdR * 0.4, py);
      ctx.stroke();
    }
    ctx.restore();

    // Cephalothorax (front, slightly smaller)
    const cephR = halfW * 0.35;
    const cephY = -halfH * 0.2;
    const cephGrad = ctx.createRadialGradient(
      -2,
      cephY - 2,
      0,
      0,
      cephY,
      cephR,
    );
    cephGrad.addColorStop(0, lightenColor(color, 0.3));
    cephGrad.addColorStop(1, color);
    ctx.fillStyle = cephGrad;
    ctx.beginPath();
    ctx.ellipse(0, cephY, cephR, cephR * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2-segment legs (4 per side), animated gait
    const legTime = t * 0.008;
    ctx.strokeStyle = lightenColor(color, -0.1);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const gait =
          Math.sin(legTime + i * Math.PI * 0.5) * 3 * (i % 2 === 0 ? 1 : -1);
        const baseY = cephY + i * 4 - 3;
        // Joint (elbow)
        const jointX = side * (cephR + 5 + i);
        const jointY = baseY - 4 + gait;
        // Foot
        const footX = side * (halfW + 6 + i * 2.5);
        const footY = baseY + 5 + gait * 0.5;

        // Upper segment
        ctx.beginPath();
        ctx.moveTo(side * cephR * 0.5, baseY);
        ctx.lineTo(jointX, jointY);
        ctx.stroke();
        // Lower segment
        ctx.beginPath();
        ctx.moveTo(jointX, jointY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";

    // Pedipalps (small front appendages)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-cephR * 0.3, cephY - cephR * 0.5);
    ctx.lineTo(-cephR * 0.5, cephY - cephR);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cephR * 0.3, cephY - cephR * 0.5);
    ctx.lineTo(cephR * 0.5, cephY - cephR);
    ctx.stroke();

    // Eye cluster with size variation and red glow
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(0, cephY - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ff0000";
    const eyes: [number, number, number][] = [
      [-3.5, cephY - 3, 2],
      [3.5, cephY - 3, 2],
      [-5.5, cephY - 1, 1.5],
      [5.5, cephY - 1, 1.5],
      [0, cephY - 5, 1.8],
    ];
    for (const [ex, ey, er] of eyes) {
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
    // Eye highlights
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (const [ex, ey, er] of eyes) {
      ctx.beginPath();
      ctx.arc(ex - er * 0.3, ey - er * 0.3, er * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawBossBody(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  x: number,
  y: number,
  color: string,
): void {
  const config = getBossConfig(enemy.type);
  const accentColor = config?.accentColor ?? "#ffffff";
  const r = enemy.size.width / 2;
  const phase = enemy.bossPhase ?? 1;
  const pulseSpeed = phase === 3 ? 0.18 : phase === 2 ? 0.12 : 0.07;
  const t = Date.now();
  const isWindup = enemy.attackWindup > 0;

  // Outer glow ring (enhanced)
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.003 * pulseSpeed * 10);
  const gradient = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.7);
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(0.6, `${accentColor}40`);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (enemy.type === "boss_golem") {
    // Golem: irregular rock chunks overlapping, blocky arms, animated rune lines

    // Arms (blocky, extending from sides)
    const armW = r * 0.35;
    const armH = r * 0.7;
    const armGlow = isWindup ? 0.6 : 0;
    for (const side of [-1, 1]) {
      const armX = x + side * (r * 0.75);
      const armY = y + r * 0.1;

      // Arm shape (blocky irregular)
      ctx.fillStyle = lightenColor(color, -0.1);
      ctx.beginPath();
      ctx.moveTo(armX - armW * 0.4 * side, armY - armH * 0.5);
      ctx.lineTo(armX + armW * 0.6 * side, armY - armH * 0.3);
      ctx.lineTo(armX + armW * 0.7 * side, armY + armH * 0.5);
      ctx.lineTo(armX - armW * 0.3 * side, armY + armH * 0.4);
      ctx.closePath();
      ctx.fill();

      // Fist (glows during windup)
      if (armGlow > 0) {
        ctx.save();
        ctx.globalAlpha = armGlow;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(armX + armW * 0.3 * side, armY + armH * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = lightenColor(color, 0.05);
      ctx.beginPath();
      ctx.arc(armX + armW * 0.3 * side, armY + armH * 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body — irregular polygon rock chunks overlapping
    const chunks: [number, number, number][] = [
      [0, 0, r],
      [-r * 0.25, -r * 0.15, r * 0.6],
      [r * 0.2, r * 0.1, r * 0.55],
    ];
    for (const [cx, cy, cr] of chunks) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 8 + cx * 0.01;
        const wobble = 0.9 + ((i * 3 + Math.round(cx)) % 3) * 0.07;
        const rx2 = x + cx + Math.cos(angle) * cr * wobble;
        const ry2 = y + cy + Math.sin(angle) * cr * wobble;
        if (i === 0) ctx.moveTo(rx2, ry2);
        else ctx.lineTo(rx2, ry2);
      }
      ctx.closePath();
      const golemGrad = ctx.createRadialGradient(
        x + cx - cr * 0.2,
        y + cy - cr * 0.2,
        0,
        x + cx,
        y + cy,
        cr,
      );
      golemGrad.addColorStop(0, lightenColor(color, 0.25));
      golemGrad.addColorStop(1, color);
      ctx.fillStyle = golemGrad;
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const wobble = 0.95 + (i % 3) * 0.04;
      const rx2 = x + Math.cos(angle) * r * wobble;
      const ry2 = y + Math.sin(angle) * r * wobble;
      if (i === 0) ctx.moveTo(rx2, ry2);
      else ctx.lineTo(rx2, ry2);
    }
    ctx.closePath();
    ctx.stroke();

    // Animated rune lines (dash pattern)
    ctx.save();
    ctx.globalAlpha = 0.5 + phase * 0.1;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -t * 0.02;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.4);
    ctx.lineTo(x + r * 0.2, y - r * 0.1);
    ctx.lineTo(x + r * 0.4, y + r * 0.35);
    ctx.moveTo(x - r * 0.3, y + r * 0.2);
    ctx.lineTo(x + r * 0.5, y + r * 0.15);
    ctx.moveTo(x - r * 0.15, y - r * 0.5);
    ctx.lineTo(x - r * 0.4, y + r * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Glowing eyes
    const eyeColor = phase >= 2 ? "#ff4400" : "#ffcc00";
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.15, 5, 0, Math.PI * 2);
    ctx.arc(x + r * 0.2, y - r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.15, 8, 0, Math.PI * 2);
    ctx.arc(x + r * 0.2, y - r * 0.15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (enemy.type === "boss_dragon") {
    // Dragon: body with scale pattern, head/snout/horns, membrane wings, tail, fire glow

    // Tail (curved line from back)
    ctx.strokeStyle = lightenColor(color, -0.15);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const tailSway = Math.sin(t * 0.003) * 8;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.5);
    ctx.quadraticCurveTo(
      x + tailSway,
      y + r * 1.1,
      x + tailSway * 1.5,
      y + r * 1.4,
    );
    ctx.stroke();
    // Tail tip
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(x + tailSway * 1.5, y + r * 1.4);
    ctx.lineTo(x + tailSway * 1.5 - 4, y + r * 1.35);
    ctx.lineTo(x + tailSway * 1.5 + 4, y + r * 1.35);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = "butt";

    // Wings (large membrane with bone structure)
    const wingFlap = Math.sin(t * 0.004) * 0.15;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(x, y - r * 0.1);
      ctx.scale(side, 1);

      ctx.fillStyle = lightenColor(color, -0.1);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.2);
      ctx.lineTo(r * 0.8, -r * 0.9 + wingFlap * r);
      ctx.lineTo(r * 1.2, -r * 0.5 + wingFlap * r * 0.5);
      ctx.lineTo(r * 1.3, r * 0.1);
      ctx.lineTo(r * 0.9, r * 0.3);
      ctx.lineTo(r * 0.3, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // Wing bone lines
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = lightenColor(color, 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.1);
      ctx.lineTo(r * 0.8, -r * 0.9 + wingFlap * r);
      ctx.moveTo(r * 0.3, 0);
      ctx.lineTo(r * 1.2, -r * 0.5 + wingFlap * r * 0.5);
      ctx.moveTo(r * 0.3, r * 0.05);
      ctx.lineTo(r * 1.3, r * 0.1);
      ctx.stroke();
      ctx.restore();
    }

    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
    const dragonGrad = ctx.createRadialGradient(
      x - r * 0.2,
      y - r * 0.2,
      0,
      x,
      y,
      r * 0.85,
    );
    dragonGrad.addColorStop(0, lightenColor(color, 0.25));
    dragonGrad.addColorStop(1, color);
    ctx.fillStyle = dragonGrad;
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Scale pattern (overlapping arcs)
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = lightenColor(color, 0.3);
    ctx.lineWidth = 1;
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const sx = x + col * r * 0.25 + (row % 2) * r * 0.12;
        const sy = y + row * r * 0.2;
        const dx2 = sx - x;
        const dy2 = sy - y;
        if (
          (dx2 * dx2) / (r * 0.85 * r * 0.85) +
            (dy2 * dy2) / (r * 0.7 * r * 0.7) >
          0.8
        )
          continue;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.12, Math.PI * 0.8, Math.PI * 0.2, true);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Head (snout extending from top)
    const headX = x;
    const headY = y - r * 0.65;
    ctx.fillStyle = lightenColor(color, 0.1);
    ctx.beginPath();
    ctx.ellipse(headX, headY, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = lightenColor(color, 0.15);
    ctx.beginPath();
    ctx.ellipse(headX, headY - r * 0.2, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(headX - 4, headY - r * 0.22, 2, 0, Math.PI * 2);
    ctx.arc(headX + 4, headY - r * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(headX - r * 0.2, headY - r * 0.15);
    ctx.lineTo(headX - r * 0.35, headY - r * 0.5);
    ctx.lineTo(headX - r * 0.1, headY - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.2, headY - r * 0.15);
    ctx.lineTo(headX + r * 0.35, headY - r * 0.5);
    ctx.lineTo(headX + r * 0.1, headY - r * 0.1);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.ellipse(headX - r * 0.12, headY - r * 0.05, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(headX + r * 0.12, headY - r * 0.05, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(headX - r * 0.12, headY - r * 0.05, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(headX + r * 0.12, headY - r * 0.05, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fire glow from mouth during attack windup
    if (isWindup) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const fireGrad = ctx.createRadialGradient(
        headX,
        headY - r * 0.3,
        0,
        headX,
        headY - r * 0.3,
        12,
      );
      fireGrad.addColorStop(0, "#ffaa00");
      fireGrad.addColorStop(0.5, "#ff4400");
      fireGrad.addColorStop(1, "transparent");
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(headX, headY - r * 0.3, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Invulnerable indicator
    if (enemy.bossInvulnerable) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else if (enemy.type === "boss_wizard") {
    // Wizard: large ornate robed figure, tall staff, rune circles, flowing cape

    const hover = Math.sin(t * 0.003) * 3;
    const capeSway = Math.sin(t * 0.004) * 4;

    // Flowing cape/robe
    const robeGrad = ctx.createLinearGradient(x, y - r * 0.5, x, y + r);
    robeGrad.addColorStop(0, lightenColor(color, 0.25));
    robeGrad.addColorStop(0.5, color);
    robeGrad.addColorStop(1, lightenColor(color, -0.15));
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y - r * 0.4 + hover);
    ctx.quadraticCurveTo(
      x - r * 0.5,
      y + r * 0.3,
      x - r * 0.8 + capeSway,
      y + r * 0.9,
    );
    ctx.lineTo(x + r * 0.8 + capeSway * 0.5, y + r * 0.9);
    ctx.quadraticCurveTo(
      x + r * 0.5,
      y + r * 0.3,
      x + r * 0.4,
      y - r * 0.4 + hover,
    );
    ctx.closePath();
    ctx.fill();

    // Cape sway animated bottom edge
    ctx.strokeStyle = lightenColor(color, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8 + capeSway, y + r * 0.9);
    ctx.quadraticCurveTo(
      x,
      y + r * 0.95 + Math.sin(t * 0.005) * 2,
      x + r * 0.8 + capeSway * 0.5,
      y + r * 0.9,
    );
    ctx.stroke();

    // Shadow side of robe
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.4 + hover);
    ctx.quadraticCurveTo(
      x + r * 0.5,
      y + r * 0.3,
      x + r * 0.8 + capeSway * 0.5,
      y + r * 0.9,
    );
    ctx.lineTo(x, y + r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head
    const headY2 = y - r * 0.5 + hover;
    ctx.fillStyle = "#ddb892";
    ctx.beginPath();
    ctx.arc(x, headY2, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Crown/elaborate headdress
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.25, headY2 - r * 0.08);
    ctx.lineTo(x - r * 0.15, headY2 - r * 0.45);
    ctx.lineTo(x - r * 0.05, headY2 - r * 0.3);
    ctx.lineTo(x, headY2 - r * 0.55);
    ctx.lineTo(x + r * 0.05, headY2 - r * 0.3);
    ctx.lineTo(x + r * 0.15, headY2 - r * 0.45);
    ctx.lineTo(x + r * 0.25, headY2 - r * 0.08);
    ctx.closePath();
    ctx.fill();

    // Crown gems
    ctx.fillStyle = "#ff44ff";
    ctx.beginPath();
    ctx.arc(x, headY2 - r * 0.35, 3, 0, Math.PI * 2);
    ctx.fill();

    // Wizard eyes (glowing)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - r * 0.08, headY2 + r * 0.02, 3.5, 0, Math.PI * 2);
    ctx.arc(x + r * 0.08, headY2 + r * 0.02, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(x - r * 0.08, headY2 + r * 0.02, 2, 0, Math.PI * 2);
    ctx.arc(x + r * 0.08, headY2 + r * 0.02, 2, 0, Math.PI * 2);
    ctx.fill();

    // Tall ornate staff (on one side)
    const staffX = x + r * 0.55;
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(staffX, y - r * 0.8 + hover);
    ctx.lineTo(staffX, y + r * 0.85);
    ctx.stroke();

    // Staff crystal
    const crystalY = y - r * 0.8 + hover;
    const crystalPulse = 0.7 + Math.sin(t * 0.005) * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.4 * crystalPulse;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(staffX, crystalY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(staffX, crystalY - 8);
    ctx.lineTo(staffX + 5, crystalY);
    ctx.lineTo(staffX, crystalY + 8);
    ctx.lineTo(staffX - 5, crystalY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(staffX, crystalY - 8);
    ctx.lineTo(staffX + 2, crystalY - 2);
    ctx.lineTo(staffX, crystalY);
    ctx.lineTo(staffX - 2, crystalY - 2);
    ctx.closePath();
    ctx.fill();

    // Orbiting rune circles (not just dots)
    for (let i = 0; i < 4; i++) {
      const orbitAngle = t * 0.002 + (i * Math.PI * 2) / 4;
      const orbitR = r * 0.85 + i * 5;
      const orbitX = x + Math.cos(orbitAngle) * orbitR;
      const orbitY = y + Math.sin(orbitAngle) * orbitR * 0.6 + hover;

      // Rune circle shape
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, 5, 0, Math.PI * 2);
      ctx.stroke();
      // Inner symbol (cross)
      ctx.beginPath();
      ctx.moveTo(orbitX - 3, orbitY);
      ctx.lineTo(orbitX + 3, orbitY);
      ctx.moveTo(orbitX, orbitY - 3);
      ctx.lineTo(orbitX, orbitY + 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Phase indicator dots
  const phaseColor =
    phase === 3 ? "#ff5252" : phase === 2 ? "#ffb74d" : "#69f0ae";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x - 12 + i * 12, y + r + 10, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i < phase ? phaseColor : "rgba(255,255,255,0.15)";
    ctx.fill();
    if (i < phase) {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

function drawAttackWarning(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  state: GameState,
  progress: number,
): void {
  const { x, y } = enemy.position;
  const playerX = state.player.position.x;
  const playerY = state.player.position.y;

  const dx = playerX - x;
  const dy = playerY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 0) return;

  const dirX = dx / dist;
  const dirY = dy / dist;

  const lineLen = Math.min(dist, 60);
  const alpha = 0.3 + progress * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLORS.projectileEnemy;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dirX * lineLen, y + dirY * lineLen);
  ctx.stroke();
  ctx.setLineDash([]);

  // Glow around enemy
  const glowRadius =
    Math.max(enemy.size.width, enemy.size.height) / 2 + 4 + progress * 4;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.projectileEnemy;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function getProjectileEffectColor(proj: Projectile): string | null {
  if (proj.effects.includes("poison")) return "rgba(105, 240, 174, 0.4)";
  if (proj.effects.includes("freeze")) return "rgba(100, 181, 246, 0.4)";
  if (proj.effects.includes("burn")) return "rgba(255, 102, 0, 0.4)";
  return null;
}

// Projectiles with feathered arrows, spinning enemy orbs, effect trails
function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[],
): void {
  const t = Date.now();

  for (const proj of projectiles) {
    if (!proj.alive) continue;

    const { x, y } = proj.position;
    const isPlayer = proj.owner === "player";

    const speed = Math.sqrt(
      proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y,
    );
    if (speed <= 0) continue;

    const dirX = proj.velocity.x / speed;
    const dirY = proj.velocity.y / speed;
    const perpX = -dirY;
    const perpY = dirX;

    // Effect trailing particles (poison/freeze/burn)
    if (proj.effects.length > 0) {
      ctx.save();
      for (const effect of proj.effects) {
        let pColor = "";
        if (effect === "poison") pColor = "#69f0ae";
        else if (effect === "freeze") pColor = "#64b5f6";
        else if (effect === "burn") pColor = "#ff6600";

        for (let i = 0; i < 3; i++) {
          const offset = i * 5 + Math.sin(t * 0.01 + i * 2) * 2;
          const px =
            x - dirX * offset + Math.sin(t * 0.008 + i * 3) * 3 * perpX;
          const py =
            y - dirY * offset + Math.sin(t * 0.008 + i * 3) * 3 * perpY;
          const alpha = 0.4 - i * 0.12;
          const size = 2 - i * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = pColor;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (isPlayer) {
      // Player arrow with feathered tail
      const arrowLen = PROJECTILE_SIZE * 2.5;
      const arrowW = PROJECTILE_SIZE * 0.8;

      // Trail
      const trailLen = 16;
      const trailGrad = ctx.createLinearGradient(
        x,
        y,
        x - dirX * trailLen,
        y - dirY * trailLen,
      );
      trailGrad.addColorStop(0, "rgba(255, 215, 0, 0.5)");
      trailGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dirX * trailLen, y - dirY * trailLen);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = PROJECTILE_SIZE * 0.6;
      ctx.stroke();

      // Arrow head
      const tipX = x + dirX * arrowLen * 0.5;
      const tipY = y + dirY * arrowLen * 0.5;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        x - dirX * arrowLen * 0.5 + perpX * arrowW,
        y - dirY * arrowLen * 0.5 + perpY * arrowW,
      );
      ctx.lineTo(x - dirX * arrowLen * 0.3, y - dirY * arrowLen * 0.3);
      ctx.lineTo(
        x - dirX * arrowLen * 0.5 - perpX * arrowW,
        y - dirY * arrowLen * 0.5 - perpY * arrowW,
      );
      ctx.closePath();
      ctx.fillStyle = "#ffd700";
      ctx.fill();

      // Feathered tail (2-3 short angled lines at back)
      const tailX = x - dirX * arrowLen * 0.5;
      const tailY = y - dirY * arrowLen * 0.5;
      ctx.strokeStyle = "#daa520";
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        const featherAngle = 0.3 * i;
        const fDirX =
          -dirX * Math.cos(featherAngle) - perpX * Math.sin(featherAngle);
        const fDirY =
          -dirY * Math.cos(featherAngle) - perpY * Math.sin(featherAngle);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tailX + fDirX * 6, tailY + fDirY * 6);
        ctx.stroke();
      }

      // Effect glow
      const effectColor = getProjectileEffectColor(proj);
      if (effectColor) {
        ctx.beginPath();
        ctx.arc(x, y, PROJECTILE_SIZE + 5, 0, Math.PI * 2);
        ctx.fillStyle = effectColor;
        ctx.fill();
      }

      // Bright core
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else {
      // Enemy projectile — red orb with spinning inner highlight
      const trailLen = 14;
      const trailGrad = ctx.createLinearGradient(
        x,
        y,
        x - dirX * trailLen,
        y - dirY * trailLen,
      );
      trailGrad.addColorStop(0, "rgba(255, 68, 68, 0.6)");
      trailGrad.addColorStop(1, "rgba(255, 68, 68, 0)");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dirX * trailLen, y - dirY * trailLen);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = PROJECTILE_SIZE * 1.2;
      ctx.stroke();

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, PROJECTILE_SIZE + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 68, 68, 0.2)";
      ctx.fill();

      // Orb body
      const orbGrad = ctx.createRadialGradient(
        x - 1,
        y - 1,
        0,
        x,
        y,
        PROJECTILE_SIZE,
      );
      orbGrad.addColorStop(0, "#ff8888");
      orbGrad.addColorStop(0.6, "#ff4444");
      orbGrad.addColorStop(1, "#cc0000");
      ctx.beginPath();
      ctx.arc(x, y, PROJECTILE_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Spinning inner highlight dot (orbits center)
      const spinAngle = t * 0.01;
      const hlR = PROJECTILE_SIZE * 0.45;
      const hlX = x + Math.cos(spinAngle) * hlR;
      const hlY = y + Math.sin(spinAngle) * hlR;
      ctx.beginPath();
      ctx.arc(hlX, hlY, PROJECTILE_SIZE * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fill();
    }
  }
}

function drawEntityHpBars(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.spawnTimer > 0) continue;
    if (enemy.hp >= enemy.maxHp) continue;

    const barWidth = enemy.size.width + 10;
    const barHeight = 5;
    const barX = enemy.position.x - barWidth / 2;
    const barY = enemy.position.y - enemy.size.height / 2 - 10;
    const hpRatio = enemy.hp / enemy.maxHp;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 2);
    ctx.fill();

    // Fill
    const hpColor =
      hpRatio > 0.5 ? "#00c853" : hpRatio > 0.25 ? "#ffd740" : "#ff5252";
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * hpRatio, barHeight, 1.5);
    ctx.fill();

    // Shine highlight
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight * 0.4);
    ctx.restore();
  }
}

// Improved damage numbers with outlines and color coding
function drawDamageNumbers(
  ctx: CanvasRenderingContext2D,
  damageNumbers: DamageNumber[],
): void {
  for (const dmg of damageNumbers) {
    if (!dmg.alive) continue;

    const alpha = dmg.lifetime / dmg.maxLifetime;
    const scale = dmg.isCrit ? 1.5 : 1;
    const fontSize = Math.round(14 * scale);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";

    const text = dmg.value === 0 ? "DODGE" : `${dmg.value}`;

    // Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(text, dmg.position.x, dmg.position.y);

    // Fill
    if (dmg.value === 0) {
      ctx.fillStyle = "#aaaaaa";
    } else if (dmg.isCrit) {
      ctx.fillStyle = "#ff6600";
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillText(text, dmg.position.x, dmg.position.y);

    // Crit indicator
    if (dmg.isCrit && dmg.value > 0) {
      ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
      ctx.fillStyle = "#ffcc00";
      ctx.strokeText(
        "!",
        dmg.position.x + fontSize * 0.6,
        dmg.position.y - fontSize * 0.3,
      );
      ctx.fillText(
        "!",
        dmg.position.x + fontSize * 0.6,
        dmg.position.y - fontSize * 0.3,
      );
    }

    ctx.restore();
  }
}

// Improved drop rendering
function drawDrops(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const drop of state.drops) {
    if (!drop.alive) continue;

    const { x, y } = drop.position;
    const bobOffset = Math.sin(state.frameCount * 0.1 + x) * 2;
    const dy = y + bobOffset;

    ctx.save();

    if (drop.type === "xp") {
      // XP gem — rotating diamond with sparkle particles
      const size = 6;
      const sparkle = 0.8 + Math.sin(state.frameCount * 0.15 + x) * 0.2;
      const rotation = Math.sin(state.frameCount * 0.05 + x * 0.1) * 0.25;

      // Outer glow
      ctx.globalAlpha = 0.3 * sparkle;
      ctx.fillStyle = "#69f0ae";
      ctx.beginPath();
      ctx.arc(x, dy, size + 4, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle particles around gem
      ctx.globalAlpha = sparkle * 0.7;
      for (let i = 0; i < 3; i++) {
        const sAngle = state.frameCount * 0.08 + (i * Math.PI * 2) / 3;
        const sR = size + 5 + Math.sin(state.frameCount * 0.12 + i) * 2;
        const sx = x + Math.cos(sAngle) * sR;
        const sy = dy + Math.sin(sAngle) * sR;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        // Star sparkle shape
        ctx.moveTo(sx, sy - 1.5);
        ctx.lineTo(sx + 0.5, sy - 0.5);
        ctx.lineTo(sx + 1.5, sy);
        ctx.lineTo(sx + 0.5, sy + 0.5);
        ctx.lineTo(sx, sy + 1.5);
        ctx.lineTo(sx - 0.5, sy + 0.5);
        ctx.lineTo(sx - 1.5, sy);
        ctx.lineTo(sx - 0.5, sy - 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // Diamond shape with rotation (skew)
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(x, dy);
      ctx.rotate(rotation);
      ctx.fillStyle = "#69f0ae";
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineTo(0, size * 0.6);
      ctx.lineTo(-size * 0.7, 0);
      ctx.closePath();
      ctx.fill();

      // Facet highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.3, -size * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size * 0.3, -size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (drop.type === "coin") {
      // Coin with "$" emblem visible during spin
      const size = 5;
      const spin = Math.sin(state.frameCount * 0.08 + x * 0.1);
      const scaleX = 0.5 + Math.abs(spin) * 0.5;

      ctx.save();
      ctx.translate(x, dy);
      ctx.scale(scaleX, 1);

      // Outer glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#ffd740";
      ctx.beginPath();
      ctx.arc(0, 0, size + 3, 0, Math.PI * 2);
      ctx.fill();

      // Coin body
      ctx.globalAlpha = 1;
      const coinGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, size);
      coinGrad.addColorStop(0, "#fff59d");
      coinGrad.addColorStop(0.5, "#ffd740");
      coinGrad.addColorStop(1, "#f9a825");
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      // "$" emblem (visible when face is showing, i.e. scaleX > 0.7)
      if (scaleX > 0.65) {
        ctx.globalAlpha = (scaleX - 0.65) * 2.5;
        ctx.fillStyle = "#b8860b";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 0.5);
      }

      // Edge highlight
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffee58";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    } else if (drop.type === "hp") {
      // Heart with pulse animation (scale throb)
      const size = 5;
      const pulse = 1 + Math.sin(state.frameCount * 0.15 + x) * 0.12;

      // Glow (pulsing)
      ctx.globalAlpha = 0.25 + Math.sin(state.frameCount * 0.15 + x) * 0.1;
      ctx.fillStyle = "#ff5252";
      ctx.beginPath();
      ctx.arc(x, dy, (size + 4) * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Heart (pulsing scale)
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(x, dy);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ff5252";
      ctx.beginPath();
      ctx.moveTo(0, size * 0.6);
      ctx.bezierCurveTo(
        -size * 1.2,
        -size * 0.2,
        -size * 0.6,
        -size * 1.0,
        0,
        -size * 0.3,
      );
      ctx.bezierCurveTo(
        size * 0.6,
        -size * 1.0,
        size * 1.2,
        -size * 0.2,
        0,
        size * 0.6,
      );
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(-2, -2.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

function drawAbilityEffects(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const effect of state.abilityEffects) {
    const { x, y } = effect.position;
    const progress = effect.timer / getEffectMaxTimer(effect.type);

    ctx.save();

    if (effect.type === "circle") {
      const alpha = progress;
      const radius = effect.radius * (1.2 - progress * 0.2);
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = "#7c4dff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillStyle = "#7c4dff";
      ctx.fill();
    } else if (effect.type === "meteor") {
      const alpha = progress;
      const radius = effect.radius * (1.5 - progress * 0.5);

      ctx.globalAlpha = alpha * 0.6;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "#ff6600");
      gradient.addColorStop(0.5, "rgba(255, 102, 0, 0.3)");
      gradient.addColorStop(1, "rgba(255, 102, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Impact scorch mark
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = "#331100";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, radius * 0.6, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect.type === "sword_spin") {
      const alpha = progress;
      const angle = (1 - progress) * Math.PI * 4;
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, effect.radius, angle, angle + Math.PI * 1.5);
      ctx.stroke();
    } else if (effect.type === "shield_break") {
      const alpha = progress;
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = "#64b5f6";
      ctx.lineWidth = 3;
      const r = effect.radius + (1 - progress) * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Shield bubble
  if (state.player.alive && state.player.shieldActive) {
    const { x, y } = state.player.position;
    const pulse = 0.8 + 0.2 * Math.sin(state.frameCount * 0.1);

    // Hexagonal shield effect
    ctx.save();
    ctx.globalAlpha = 0.2 * pulse;
    const shieldR = PLAYER_SIZE / 2 + 8;
    ctx.strokeStyle = "#64b5f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + state.frameCount * 0.02;
      const px = x + Math.cos(angle) * shieldR;
      const py = y + Math.sin(angle) * shieldR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.06 * pulse;
    ctx.fillStyle = "#64b5f6";
    ctx.fill();
    ctx.restore();
  }
}

function getEffectMaxTimer(type: AbilityEffect["type"]): number {
  switch (type) {
    case "circle":
      return 0.3;
    case "meteor":
      return 0.5;
    case "sword_spin":
      return 0.3;
    case "shield_break":
      return 0.3;
  }
}

function drawStatusEffectIndicators(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.statusEffects.length === 0) continue;

    const { x, y } = enemy.position;
    const halfH = enemy.size.height / 2;

    let offsetX = (-6 * (enemy.statusEffects.length - 1)) / 2;

    for (const effect of enemy.statusEffects) {
      let color = "";
      if (effect.type === "poison") color = "#69f0ae";
      else if (effect.type === "freeze") color = "#64b5f6";
      else if (effect.type === "burn") color = "#ff6600";

      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + offsetX, y - halfH - 14, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x + offsetX, y - halfH - 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      offsetX += 8;
    }
  }
}

// Portal door with swirling effect
function drawDoor(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { x, y } = state.doorPosition;
  const halfW = DOOR_WIDTH / 2;
  const halfH = DOOR_HEIGHT / 2;
  const pulse = 0.5 + 0.5 * Math.sin(state.frameCount * 0.08);
  const time = state.frameCount * 0.03;

  // Outer glow
  ctx.save();
  ctx.globalAlpha = 0.15 + pulse * 0.1;
  const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, halfW + 20);
  glowGrad.addColorStop(0, "#4fc3f7");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, halfW + 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Portal frame
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - halfW, y - halfH, DOOR_WIDTH, DOOR_HEIGHT, 8);
  ctx.strokeStyle = "#4fc3f7";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner swirl
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    x - halfW + 4,
    y - halfH + 4,
    DOOR_WIDTH - 8,
    DOOR_HEIGHT - 8,
    6,
  );
  ctx.clip();

  // Swirling blue background
  const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, halfW);
  innerGrad.addColorStop(0, `rgba(79, 195, 247, ${0.4 + pulse * 0.2})`);
  innerGrad.addColorStop(0.5, `rgba(30, 136, 229, ${0.3 + pulse * 0.15})`);
  innerGrad.addColorStop(1, "rgba(13, 71, 161, 0.2)");
  ctx.fillStyle = innerGrad;
  ctx.fillRect(x - halfW + 4, y - halfH + 4, DOOR_WIDTH - 8, DOOR_HEIGHT - 8);

  // Swirl lines
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = "#b3e5fc";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const spiralR = 8 + i * 6;
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const sr = spiralR * (1 - a / (Math.PI * 8));
      const sx = x + Math.cos(a + time + i) * sr;
      const sy = y + Math.sin(a + time + i) * sr;
      if (a === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  ctx.restore();

  ctx.restore();
}

// Archero-style top HUD: level, progress bar, room counter, coins, HP/XP bars
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  const player = state.player;
  const hudY = 8;
  const barCenterX = viewportWidth / 2;

  // Level label
  ctx.save();
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  const levelText = `Lv.${player.level}`;
  ctx.strokeText(levelText, barCenterX, hudY + 14);
  ctx.fillText(levelText, barCenterX, hudY + 14);

  // XP progress bar (yellowish)
  const progressBarW = 120;
  const progressBarH = 8;
  const progressBarX = barCenterX - progressBarW / 2;
  const progressBarY = hudY + 20;
  const xpProgressRatio = Math.min(1, player.xp / player.xpToNextLevel);

  // Bar background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(progressBarX, progressBarY, progressBarW, progressBarH, 4);
  ctx.fill();

  // Bar fill (yellow gradient)
  if (xpProgressRatio > 0) {
    const fillGrad = ctx.createLinearGradient(
      progressBarX,
      0,
      progressBarX + progressBarW * xpProgressRatio,
      0,
    );
    fillGrad.addColorStop(0, "#f9a825");
    fillGrad.addColorStop(1, "#fdd835");
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(
      progressBarX,
      progressBarY,
      progressBarW * xpProgressRatio,
      progressBarH,
      4,
    );
    ctx.fill();
  }

  // Bar border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(progressBarX, progressBarY, progressBarW, progressBarH, 4);
  ctx.stroke();

  // Wave indicator below bar
  const room = getRoomConfig(state.chapterId, state.currentRoom - 1);
  const totalWaves = room ? room.waves.length : 1;
  const displayWave = Math.min(state.currentWave + 1, totalWaves);
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "center";
  ctx.fillText(
    `Wave ${displayWave}/${totalWaves}`,
    barCenterX,
    progressBarY + progressBarH + 11,
  );

  // Coin counter — top right
  const coinText = `${player.coins}`;
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "right";
  const coinTextX = viewportWidth - 14;
  const coinTextY = hudY + 14;

  // Coin icon (small gold circle)
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(
    coinTextX - ctx.measureText(coinText).width - 10,
    coinTextY - 4,
    6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "#ffab00";
  ctx.beginPath();
  ctx.arc(
    coinTextX - ctx.measureText(coinText).width - 10,
    coinTextY - 4,
    4,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 6px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "$",
    coinTextX - ctx.measureText(coinText).width - 10,
    coinTextY - 2,
  );

  // Coin count
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "right";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.strokeText(coinText, coinTextX, coinTextY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(coinText, coinTextX, coinTextY);

  // Player HP bar — below HUD strip
  const hpBarY = hudY + 42;
  const hpBarW = viewportWidth * 0.5;
  const hpBarH = 6;
  const hpBarX = (viewportWidth - hpBarW) / 2;
  const hpRatio = Math.max(0, player.hp / player.maxHp);

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 3);
  ctx.fill();

  if (hpRatio > 0) {
    const hpColor =
      hpRatio > 0.5 ? "#4caf50" : hpRatio > 0.25 ? "#ff9800" : "#f44336";
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 3);
    ctx.fill();
  }

  // HP label
  ctx.font = "bold 8px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textAlign = "right";
  ctx.fillText("HP", hpBarX - 4, hpBarY + hpBarH - 0.5);

  ctx.restore();
}

// Pulsing arrow guiding player toward the portal
function drawPortalArrow(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  _viewportWidth: number,
  _viewportHeight: number,
): void {
  const player = state.player;
  if (!player.alive) return;

  const door = state.doorPosition;
  const dx = door.x - player.position.x;
  const dy = door.y - player.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 20) return;

  const angle = Math.atan2(dy, dx);
  const pulse = 0.6 + 0.4 * Math.sin(state.frameCount * 0.1);

  // Position the arrow above the player in screen space
  const screenX = player.position.x - state.camera.x;
  const screenY = player.position.y - state.camera.y - 30;

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.translate(screenX, screenY);
  ctx.rotate(angle);

  // Arrow shape — chevron pointing right (rotated to face portal)
  const arrowLen = 14;
  const arrowW = 8;
  ctx.fillStyle = "#4fc3f7";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(arrowLen, 0);
  ctx.lineTo(-arrowLen * 0.3, -arrowW);
  ctx.lineTo(-arrowLen * 0.1, 0);
  ctx.lineTo(-arrowLen * 0.3, arrowW);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glow
  ctx.shadowColor = "#4fc3f7";
  ctx.shadowBlur = 10;
  ctx.fill();

  ctx.restore();
}

// Boss HP bar with gradient
function drawBossHPBar(
  ctx: CanvasRenderingContext2D,
  boss: EnemyState,
  _state: GameState,
  viewportWidth: number,
): void {
  const config = getBossConfig(boss.type);
  const barWidth = viewportWidth * 0.55;
  const barHeight = 16;
  const barX = (viewportWidth - barWidth) / 2;
  const barY = 62;
  const hpRatio = Math.max(0, boss.hp / boss.maxHp);
  const phase = boss.bossPhase ?? 1;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  ctx.roundRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 4);
  ctx.fill();

  // HP fill with gradient
  if (hpRatio > 0) {
    const fillGrad = ctx.createLinearGradient(
      barX,
      barY,
      barX + barWidth * hpRatio,
      barY,
    );
    if (phase === 3) {
      fillGrad.addColorStop(0, "#ff5252");
      fillGrad.addColorStop(1, "#d32f2f");
    } else if (phase === 2) {
      fillGrad.addColorStop(0, "#ff9800");
      fillGrad.addColorStop(1, "#e65100");
    } else {
      fillGrad.addColorStop(0, "#ef5350");
      fillGrad.addColorStop(1, "#b71c1c");
    }
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * hpRatio, barHeight, 3);
    ctx.fill();
  }

  // Shine
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(barX + 2, barY + 1, barWidth - 4, barHeight * 0.4, 2);
  ctx.fill();
  ctx.restore();

  // Phase threshold markers
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(barX + barWidth * 0.5, barY);
  ctx.lineTo(barX + barWidth * 0.5, barY + barHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(barX + barWidth * 0.25, barY);
  ctx.lineTo(barX + barWidth * 0.25, barY + barHeight);
  ctx.stroke();
  ctx.restore();

  // Border
  ctx.strokeStyle = "#cc0000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 3);
  ctx.stroke();

  // Boss name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    config?.name ?? boss.type,
    viewportWidth / 2,
    barY + barHeight + 14,
  );

  // Phase indicator
  const phaseText = phase === 3 ? "ENRAGED" : phase === 2 ? "PHASE 2" : "";
  if (phaseText) {
    ctx.fillStyle = phase === 3 ? "#ff5252" : "#ff9800";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(phaseText, viewportWidth / 2, barY + barHeight + 25);
  }
}

// Archero-style joystick — large, centered at bottom, with directional chevrons
function drawJoystick(
  ctx: CanvasRenderingContext2D,
  joystick: JoystickState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const ghostX = viewportWidth / 2;
  const ghostY = viewportHeight - JOYSTICK_RADIUS - 30;

  const cX = joystick.active ? joystick.centerX : ghostX;
  const cY = joystick.active ? joystick.centerY : ghostY;
  const kX = joystick.active ? joystick.knobX : ghostX;
  const kY = joystick.active ? joystick.knobY : ghostY;
  const baseAlpha = joystick.active ? 0.92 : 0.38;

  ctx.save();
  ctx.globalAlpha = baseAlpha;

  // Outer ring — soft blue gradient fill
  const outerGrad = ctx.createRadialGradient(
    cX,
    cY,
    JOYSTICK_RADIUS * 0.15,
    cX,
    cY,
    JOYSTICK_RADIUS,
  );
  outerGrad.addColorStop(0, "rgba(50, 140, 220, 0.25)");
  outerGrad.addColorStop(0.5, "rgba(30, 100, 200, 0.30)");
  outerGrad.addColorStop(0.85, "rgba(15, 65, 160, 0.35)");
  outerGrad.addColorStop(1, "rgba(5, 35, 100, 0.42)");
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cX, cY, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring border
  ctx.strokeStyle = "rgba(100, 190, 255, 0.65)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Cardinal direction chevron markers (>, <, ^, v)
  const chevronR = JOYSTICK_RADIUS * 0.72;
  const chevronSize = 12;
  ctx.strokeStyle = "rgba(160, 210, 255, 0.55)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const ax = cX + Math.cos(angle) * chevronR;
    const ay = cY + Math.sin(angle) * chevronR;
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    ctx.beginPath();
    ctx.moveTo(
      ax - Math.cos(angle) * chevronSize * 0.35 + perpX * chevronSize * 0.5,
      ay - Math.sin(angle) * chevronSize * 0.35 + perpY * chevronSize * 0.5,
    );
    ctx.lineTo(
      ax + Math.cos(angle) * chevronSize * 0.35,
      ay + Math.sin(angle) * chevronSize * 0.35,
    );
    ctx.lineTo(
      ax - Math.cos(angle) * chevronSize * 0.35 - perpX * chevronSize * 0.5,
      ay - Math.sin(angle) * chevronSize * 0.35 - perpY * chevronSize * 0.5,
    );
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // Inner knob — solid blue with gradient
  const knobGrad = ctx.createRadialGradient(
    kX - 4,
    kY - 4,
    0,
    kX,
    kY,
    JOYSTICK_KNOB_RADIUS,
  );
  knobGrad.addColorStop(0, "rgba(90, 170, 255, 0.85)");
  knobGrad.addColorStop(0.4, "rgba(40, 120, 230, 0.75)");
  knobGrad.addColorStop(1, "rgba(15, 60, 170, 0.70)");
  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.arc(kX, kY, JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Knob border
  ctx.strokeStyle = "rgba(140, 210, 255, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Knob center dark circle
  ctx.fillStyle = "rgba(10, 50, 140, 0.65)";
  ctx.beginPath();
  ctx.arc(kX, kY, JOYSTICK_KNOB_RADIUS * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Obstacle rendering — blocky shapes
function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const obs of state.obstacles) {
    const { x, y } = obs.position;
    const { width: w, height: h } = obs;

    if (obs.type === "rock") {
      // Stone block — solid rectangular with 3D face
      const topColor =
        state.chapterId === 2
          ? "#b09070"
          : state.chapterId === 3
            ? "#8a7aae"
            : "#8a8a8a";
      const faceColor =
        state.chapterId === 2
          ? "#8a6a4a"
          : state.chapterId === 3
            ? "#6a5a8e"
            : "#6a6a6a";
      const darkColor =
        state.chapterId === 2
          ? "#6a4a2a"
          : state.chapterId === 3
            ? "#4a3a6e"
            : "#4a4a4a";
      const depth = 6;

      // Dark bottom/right face
      ctx.fillStyle = darkColor;
      ctx.fillRect(x + depth, y + depth, w, h);

      // Front face
      ctx.fillStyle = faceColor;
      ctx.fillRect(x, y, w, h);

      // Top face (lighter)
      ctx.fillStyle = topColor;
      ctx.fillRect(x, y, w, depth);

      // Left edge highlight
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 3, h);
      ctx.restore();

      // Crack details
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + h * 0.2);
      ctx.lineTo(x + w * 0.4, y + h * 0.5);
      ctx.lineTo(x + w * 0.35, y + h * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.6, y + h * 0.1);
      ctx.lineTo(x + w * 0.65, y + h * 0.4);
      ctx.stroke();
      ctx.restore();

      // Border
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    } else if (obs.type === "water") {
      // Water pool — rounded rectangle with animated ripples
      const t = state.frameCount * 0.03;
      const shimmer = Math.sin(t + x * 0.05) * 0.1;
      const r = 6;

      // Soft shadow underneath
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#0a3050";
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w, h, r);
      ctx.fill();
      ctx.restore();

      // Main water body with gradient
      const waterGrad = ctx.createLinearGradient(x, y, x, y + h);
      waterGrad.addColorStop(0, "#48c8f0");
      waterGrad.addColorStop(0.35, "#2ea0d8");
      waterGrad.addColorStop(0.7, "#1e80b8");
      waterGrad.addColorStop(1, "#165a88");
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();

      // Animated ripple rings
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.clip();

      // Wave lines flowing across the surface
      ctx.globalAlpha = 0.2 + shimmer;
      ctx.strokeStyle = "#90e0ff";
      ctx.lineWidth = 1.2;
      for (let wy = y + 6; wy < y + h - 2; wy += 7) {
        ctx.beginPath();
        ctx.moveTo(x, wy);
        for (let wx = x; wx <= x + w; wx += 4) {
          const wave = Math.sin(t + wx * 0.1 + wy * 0.06) * 1.8;
          ctx.lineTo(wx, wy + wave);
        }
        ctx.stroke();
      }

      // Specular highlights
      ctx.globalAlpha = 0.25 + shimmer * 0.5;
      ctx.fillStyle = "#ffffff";
      const hlX = x + w * 0.15 + Math.sin(t * 0.7) * 3;
      const hlY = y + 4;
      ctx.beginPath();
      ctx.ellipse(hlX, hlY + 3, w * 0.2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.15;
      const hl2X = x + w * 0.6 + Math.sin(t * 0.5 + 2) * 2;
      ctx.beginPath();
      ctx.ellipse(hl2X, y + h * 0.4, w * 0.12, 2, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Soft rounded border
      ctx.strokeStyle = "rgba(10, 60, 100, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.stroke();
    }
  }
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
}
