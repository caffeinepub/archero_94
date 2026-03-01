import { useMemo } from "react";
import type { ActiveSkill, SkillId } from "../utils/types";
import { getRandomSkillChoices, getSkillDefinition } from "../utils/skills";
import { cn } from "@/lib/utils";
import {
  Swords,
  Target,
  Zap,
  Flame,
  Snowflake,
  Shield,
  Heart,
  Wind,
  Crosshair,
  ArrowUpRight,
  ArrowDown,
  RotateCw,
  Sparkles,
  CircleDot,
  Bomb,
  Tornado,
  Activity,
  type LucideIcon,
} from "lucide-react";

// Map skill IDs to lucide icons and rarity
const SKILL_ICON_MAP: Record<string, LucideIcon> = {
  multishot: Target,
  diagonal_arrows: ArrowUpRight,
  rear_arrow: ArrowDown,
  piercing: Swords,
  bounce: RotateCw,
  ricochet: Sparkles,
  homing: Crosshair,
  poison: Bomb,
  freeze: Snowflake,
  burn: Flame,
  attack_speed_up: Zap,
  damage_up: Swords,
  crit_chance_up: Target,
  hp_up: Heart,
  shield: Shield,
  circle_damage: CircleDot,
  meteor: Flame,
  sword_spin: Tornado,
  hp_regen: Activity,
  dodge_chance: Wind,
  damage_reduction: Shield,
};

type Rarity = "common" | "fine" | "rare" | "epic";

function getSkillRarity(id: SkillId): Rarity {
  const rareSkills: SkillId[] = [
    "multishot",
    "piercing",
    "shield",
    "homing",
    "meteor",
  ];
  const epicSkills: SkillId[] = ["ricochet", "sword_spin"];
  const fineSkills: SkillId[] = [
    "bounce",
    "freeze",
    "burn",
    "poison",
    "circle_damage",
    "diagonal_arrows",
    "rear_arrow",
  ];
  if (epicSkills.includes(id)) return "epic";
  if (rareSkills.includes(id)) return "rare";
  if (fineSkills.includes(id)) return "fine";
  return "common";
}

const RARITY_CONFIG = {
  common: {
    label: "Common",
    badgeClass: "bg-muted text-foreground",
    cardBorder: "border-muted",
    cardBg: "from-muted/80 to-card/80",
    iconBg: "from-muted to-card",
    glow: "",
  },
  fine: {
    label: "Fine",
    badgeClass: "bg-emerald-700 text-emerald-100",
    cardBorder: "border-emerald-500/60",
    cardBg: "from-emerald-900/50 to-emerald-950/70",
    iconBg: "from-emerald-700 to-emerald-900",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  },
  rare: {
    label: "Rare",
    badgeClass: "bg-blue-600 text-blue-100",
    cardBorder: "border-blue-400/60",
    cardBg: "from-blue-900/50 to-blue-950/70",
    iconBg: "from-blue-600 to-blue-800",
    glow: "shadow-[0_0_16px_rgba(59,130,246,0.25)]",
  },
  epic: {
    label: "Epic",
    badgeClass: "bg-purple-600 text-purple-100",
    cardBorder: "border-purple-400/60",
    cardBg: "from-purple-900/50 to-purple-950/70",
    iconBg: "from-purple-600 to-purple-800",
    glow: "shadow-[0_0_20px_rgba(147,51,234,0.3)]",
  },
};

interface SkillSelectionProps {
  currentSkills: ActiveSkill[];
  onSelect: (skillId: SkillId) => void;
}

export function SkillSelection({
  currentSkills,
  onSelect,
}: SkillSelectionProps) {
  const choices = useMemo(
    () => getRandomSkillChoices(currentSkills, 3),
    [currentSkills],
  );

  if (choices.length === 0) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-[100]">
      {/* Golden banner */}
      <div className="animate-banner-appear mb-2">
        <div className="relative px-12 py-2">
          {/* Banner ribbon shape via CSS */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 rounded-md skew-x-[-2deg]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-md skew-x-[-2deg]" />
          <h2 className="relative text-xl font-bold text-accent-foreground tracking-wider text-center">
            Level Up
          </h2>
        </div>
      </div>

      <p className="animate-slide-down-fade text-sm text-muted-foreground mb-6">
        Choose a new ability!
      </p>

      {/* Skill cards */}
      <div className="flex gap-3 px-4 flex-wrap justify-center">
        {choices.map((skill, idx) => {
          const currentLevel =
            currentSkills.find((s) => s.id === skill.id)?.level ?? 0;
          const nextLevel = currentLevel + 1;
          const rarity = getSkillRarity(skill.id);
          const config = RARITY_CONFIG[rarity];
          const Icon = SKILL_ICON_MAP[skill.id] ?? Sparkles;

          const animClass =
            idx === 0
              ? "animate-card-pop"
              : idx === 1
                ? "animate-card-pop-delay-1"
                : "animate-card-pop-delay-2";

          return (
            <button
              key={skill.id}
              onClick={() => onSelect(skill.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 w-[140px] rounded-xl border-2 p-4 pt-6 cursor-pointer transition-all duration-200",
                "bg-gradient-to-b backdrop-blur-sm",
                "hover:scale-105 hover:brightness-110 active:scale-95",
                config.cardBorder,
                config.cardBg,
                config.glow,
                animClass,
              )}
            >
              {/* Rarity badge */}
              <span
                className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase",
                  config.badgeClass,
                )}
              >
                {config.label}
              </span>

              {/* Icon circle */}
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br border border-white/10",
                  config.iconBg,
                )}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>

              {/* Skill name */}
              <span className="text-foreground text-xs font-bold text-center leading-tight">
                {skill.name}
              </span>

              {/* Level indicator */}
              {currentLevel > 0 && (
                <span className="text-purple-300 text-[10px] font-bold">
                  Lv.{currentLevel} → Lv.{nextLevel}
                </span>
              )}

              {/* Description */}
              <span className="text-muted-foreground text-[10px] text-center leading-tight">
                {skill.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
