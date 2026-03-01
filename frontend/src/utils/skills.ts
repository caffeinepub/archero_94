import type {
  SkillDefinition,
  SkillId,
  PlayerState,
  ActiveSkill,
} from "./types";

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // Attack modifiers
  {
    id: "multishot",
    name: "Multishot",
    description: "Fire additional projectiles in a spread pattern",
    maxLevel: 3,
    icon: "🏹",
    category: "attack",
    apply() {},
  },
  {
    id: "diagonal_arrows",
    name: "Diagonal Arrows",
    description: "Fire additional projectiles at 45-degree angles",
    maxLevel: 1,
    icon: "↗",
    category: "attack",
    apply() {},
  },
  {
    id: "rear_arrow",
    name: "Rear Arrow",
    description: "Fire an additional projectile backward",
    maxLevel: 1,
    icon: "⬇",
    category: "attack",
    apply() {},
  },
  {
    id: "piercing",
    name: "Piercing Shot",
    description: "Projectiles pass through enemies",
    maxLevel: 1,
    icon: "🗡",
    category: "attack",
    apply() {},
  },

  // Projectile effects
  {
    id: "bounce",
    name: "Bouncing Shot",
    description: "Projectiles bounce off walls (+1 bounce per level)",
    maxLevel: 3,
    icon: "🔄",
    category: "projectile",
    apply() {},
  },
  {
    id: "ricochet",
    name: "Ricochet",
    description: "Projectiles ricochet to nearby enemies on hit",
    maxLevel: 2,
    icon: "💫",
    category: "projectile",
    apply() {},
  },
  {
    id: "homing",
    name: "Homing Arrows",
    description: "Projectiles slightly track toward enemies",
    maxLevel: 2,
    icon: "🎯",
    category: "projectile",
    apply() {},
  },
  {
    id: "poison",
    name: "Poison Touch",
    description: "Projectiles apply poison (damage over time)",
    maxLevel: 3,
    icon: "☠",
    category: "projectile",
    apply() {},
  },
  {
    id: "freeze",
    name: "Frost Shot",
    description: "Projectiles slow enemies on hit",
    maxLevel: 3,
    icon: "❄",
    category: "projectile",
    apply() {},
  },
  {
    id: "burn",
    name: "Fire Shot",
    description: "Projectiles ignite enemies (AoE damage over time)",
    maxLevel: 3,
    icon: "🔥",
    category: "projectile",
    apply() {},
  },

  // Stat boosts
  {
    id: "attack_speed_up",
    name: "Attack Speed Up",
    description: "+15% attack speed per level",
    maxLevel: 5,
    icon: "⚡",
    category: "stat",
    apply(player, level) {
      player.attackSpeed *= 1 + 0.15 * level;
    },
  },
  {
    id: "damage_up",
    name: "Damage Up",
    description: "+20% attack damage per level",
    maxLevel: 5,
    icon: "⚔",
    category: "stat",
    apply(player, level) {
      player.attackDamage = Math.round(player.attackDamage * (1 + 0.2 * level));
    },
  },
  {
    id: "crit_chance_up",
    name: "Critical Strike",
    description: "+10% crit chance per level",
    maxLevel: 5,
    icon: "💥",
    category: "stat",
    apply(player, level) {
      player.critChance += 0.1 * level;
    },
  },
  {
    id: "hp_up",
    name: "Vitality",
    description: "+20 max HP per level",
    maxLevel: 5,
    icon: "❤",
    category: "stat",
    apply(player, level) {
      const bonus = 20 * level;
      player.maxHp += bonus;
      player.hp += bonus;
    },
  },

  // Abilities
  {
    id: "shield",
    name: "Energy Shield",
    description: "Absorbs one hit every 8 seconds (-1s per level)",
    maxLevel: 3,
    icon: "🛡",
    category: "ability",
    apply() {},
  },
  {
    id: "circle_damage",
    name: "Circle of Pain",
    description: "Periodic AoE damage around player",
    maxLevel: 3,
    icon: "🌀",
    category: "ability",
    apply() {},
  },
  {
    id: "meteor",
    name: "Meteor Strike",
    description: "Periodic random meteors hit enemies",
    maxLevel: 3,
    icon: "☄",
    category: "ability",
    apply() {},
  },
  {
    id: "sword_spin",
    name: "Sword Spin",
    description: "Periodic close-range spin attack",
    maxLevel: 3,
    icon: "🌪",
    category: "ability",
    apply() {},
  },

  // Passives
  {
    id: "hp_regen",
    name: "Regeneration",
    description: "Regenerate 1 HP/sec per level",
    maxLevel: 3,
    icon: "💚",
    category: "passive",
    apply() {},
  },
  {
    id: "dodge_chance",
    name: "Dodge",
    description: "+8% dodge chance per level",
    maxLevel: 3,
    icon: "💨",
    category: "passive",
    apply(player, level) {
      player.dodgeChance += 0.08 * level;
    },
  },
  {
    id: "damage_reduction",
    name: "Armor",
    description: "Reduce incoming damage by 2 per level",
    maxLevel: 5,
    icon: "🛡",
    category: "passive",
    apply(player, level) {
      player.damageReduction += 2 * level;
    },
  },
];

export function getSkillDefinition(id: SkillId): SkillDefinition | undefined {
  return SKILL_DEFINITIONS.find((s) => s.id === id);
}

export function getRandomSkillChoices(
  currentSkills: ActiveSkill[],
  count: number = 3,
): SkillDefinition[] {
  // Filter out maxed-out skills
  const available = SKILL_DEFINITIONS.filter((def) => {
    const existing = currentSkills.find((s) => s.id === def.id);
    if (existing && existing.level >= def.maxLevel) return false;
    return true;
  });

  // Shuffle and pick
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function acquireSkill(player: PlayerState, skillId: SkillId): void {
  const def = getSkillDefinition(skillId);
  if (!def) return;

  const existing = player.skills.find((s) => s.id === skillId);
  if (existing) {
    if (existing.level < def.maxLevel) {
      existing.level++;
    }
  } else {
    player.skills.push({
      id: skillId,
      level: 1,
      name: def.name,
      description: def.description,
    });
  }

  // Re-apply all stat-based skills from scratch to avoid stacking errors
  reapplyStatSkills(player);
}

export function reapplyStatSkills(player: PlayerState): void {
  // Reset to base stats (hero + permanent upgrades) before re-applying in-run skills
  player.attackSpeed = player.baseAttackSpeed;
  player.attackDamage = player.baseAttackDamage;
  player.critChance = player.baseCritChance;
  player.dodgeChance = 0;
  player.damageReduction = player.baseDamageReduction;
  // Reset max HP carefully — keep the ratio
  const hpRatio = player.hp / player.maxHp;
  player.maxHp = player.baseMaxHp;

  for (const skill of player.skills) {
    const def = getSkillDefinition(skill.id);
    if (!def) continue;
    def.apply(player, skill.level);
  }

  // Restore HP based on new max
  player.hp = Math.round(hpRatio * player.maxHp);
}

export function getSkillLevel(player: PlayerState, skillId: SkillId): number {
  const skill = player.skills.find((s) => s.id === skillId);
  return skill?.level ?? 0;
}

export function hasSkill(player: PlayerState, skillId: SkillId): boolean {
  return getSkillLevel(player, skillId) > 0;
}
