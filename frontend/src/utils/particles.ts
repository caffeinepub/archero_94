import type { Particle, Vector2 } from "./types";

let nextParticleId = 0;

export interface ParticleBurstOptions {
  count?: number;
  speed?: number;
  speedVariance?: number;
  lifetime?: number;
  lifetimeVariance?: number;
  size?: number;
  sizeDecay?: number;
  gravity?: number;
  spreadAngle?: number; // full spread in radians, default = 2*PI (full circle)
  directionAngle?: number; // base direction angle
}

export function createParticleBurst(
  position: Vector2,
  color: string,
  options: ParticleBurstOptions = {},
): Particle[] {
  const count = options.count ?? 8;
  const speed = options.speed ?? 80;
  const speedVariance = options.speedVariance ?? 40;
  const lifetime = options.lifetime ?? 0.5;
  const lifetimeVariance = options.lifetimeVariance ?? 0.2;
  const size = options.size ?? 4;
  const sizeDecay = options.sizeDecay ?? 0.9;
  const gravity = options.gravity ?? 0;
  const spreadAngle = options.spreadAngle ?? Math.PI * 2;
  const directionAngle = options.directionAngle ?? 0;

  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle =
      directionAngle + (i / count) * spreadAngle + (Math.random() - 0.5) * 0.5;
    const s = speed + (Math.random() - 0.5) * speedVariance;
    const lt = lifetime + (Math.random() - 0.5) * lifetimeVariance;

    particles.push({
      id: `p_${nextParticleId++}`,
      position: {
        x: position.x + (Math.random() - 0.5) * 4,
        y: position.y + (Math.random() - 0.5) * 4,
      },
      velocity: { x: Math.cos(angle) * s, y: Math.sin(angle) * s },
      color,
      size: size * (0.7 + Math.random() * 0.6),
      lifetime: lt,
      maxLifetime: lt,
      gravity,
      sizeDecay,
      alive: true,
    });
  }

  return particles;
}

export function createHitSpark(
  position: Vector2,
  isPlayer = false,
): Particle[] {
  const color = isPlayer ? "#ff5252" : "#ffffff";
  return createParticleBurst(position, color, {
    count: 6,
    speed: 120,
    speedVariance: 60,
    lifetime: 0.25,
    lifetimeVariance: 0.1,
    size: 3,
    sizeDecay: 0.85,
    gravity: 50,
  });
}

export function createDeathBurst(position: Vector2, color: string): Particle[] {
  return createParticleBurst(position, color, {
    count: 16,
    speed: 150,
    speedVariance: 80,
    lifetime: 0.6,
    lifetimeVariance: 0.2,
    size: 5,
    sizeDecay: 0.88,
    gravity: 60,
  });
}

export function createLevelUpSparkles(position: Vector2): Particle[] {
  const particles: Particle[] = [];
  // Golden sparkles that float upward
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    const lt = 0.6 + Math.random() * 0.4;

    particles.push({
      id: `p_${nextParticleId++}`,
      position: {
        x: position.x + (Math.random() - 0.5) * 20,
        y: position.y + (Math.random() - 0.5) * 20,
      },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 60 },
      color: Math.random() < 0.5 ? "#ffd700" : "#fff176",
      size: 3 + Math.random() * 3,
      lifetime: lt,
      maxLifetime: lt,
      gravity: 30,
      sizeDecay: 0.92,
      alive: true,
    });
  }
  return particles;
}

export function createCoinCollectSparkle(position: Vector2): Particle[] {
  return createParticleBurst(position, "#ffd740", {
    count: 4,
    speed: 60,
    speedVariance: 30,
    lifetime: 0.3,
    lifetimeVariance: 0.1,
    size: 2,
    sizeDecay: 0.9,
    gravity: -20,
  });
}

export function createXpCollectSparkle(position: Vector2): Particle[] {
  return createParticleBurst(position, "#69f0ae", {
    count: 4,
    speed: 50,
    speedVariance: 25,
    lifetime: 0.25,
    lifetimeVariance: 0.1,
    size: 2,
    sizeDecay: 0.9,
    gravity: -20,
  });
}

export function createPlayerDeathExplosion(position: Vector2): Particle[] {
  const particles: Particle[] = [
    ...createParticleBurst(position, "#e94560", {
      count: 24,
      speed: 200,
      speedVariance: 100,
      lifetime: 0.8,
      lifetimeVariance: 0.3,
      size: 7,
      sizeDecay: 0.9,
      gravity: 80,
    }),
    ...createParticleBurst(position, "#ff6b81", {
      count: 12,
      speed: 120,
      speedVariance: 60,
      lifetime: 0.6,
      lifetimeVariance: 0.2,
      size: 4,
      sizeDecay: 0.88,
      gravity: 50,
    }),
  ];
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!p.alive) {
      particles.splice(i, 1);
      continue;
    }

    p.lifetime -= dt;
    if (p.lifetime <= 0) {
      p.alive = false;
      particles.splice(i, 1);
      continue;
    }

    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;

    // Apply gravity
    p.velocity.y += p.gravity * dt;

    // Apply air resistance
    p.velocity.x *= 0.98;
    p.velocity.y *= 0.98;

    // Size decay
    p.size *= p.sizeDecay;
  }
}
