import { useState, useEffect, useRef } from "react";
import {
  useCoins,
  useIsHeroUnlocked,
  useSelectedHero,
  useSelectHero,
  useUnlockHero,
  type HeroId,
} from "../hooks/useQueries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Crosshair,
  Wand2,
  Sword,
  Coins,
  Lock,
  Heart,
  Swords,
  Zap,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HeroDef {
  id: HeroId;
  name: string;
  icon: LucideIcon;
  description: string;
  cost: number;
  stats: { hp: string; damage: string; speed: string };
  startingSkill?: string;
  accentColor: string;
}

const ACCENT_STYLES: Record<
  string,
  {
    border: string;
    cardGradient: string;
    glow: string;
    text: string;
    iconBg: string;
    radial: string;
  }
> = {
  emerald: {
    border: "border-emerald-500/50",
    cardGradient: "from-hero-emerald-from via-hero-emerald-via to-background",
    glow: "shadow-[0_0_30px_var(--hero-emerald-glow)]",
    text: "text-emerald-400",
    iconBg: "from-emerald-800/80 to-emerald-950",
    radial:
      "radial-gradient(circle, var(--hero-emerald-glow) 0%, transparent 70%)",
  },
  blue: {
    border: "border-blue-500/50",
    cardGradient: "from-hero-blue-from via-hero-blue-via to-background",
    glow: "shadow-[0_0_30px_var(--hero-blue-glow)]",
    text: "text-blue-400",
    iconBg: "from-blue-800/80 to-blue-950",
    radial:
      "radial-gradient(circle, var(--hero-blue-glow) 0%, transparent 70%)",
  },
  orange: {
    border: "border-orange-500/50",
    cardGradient: "from-hero-orange-from via-hero-orange-via to-background",
    glow: "shadow-[0_0_30px_var(--hero-orange-glow)]",
    text: "text-orange-400",
    iconBg: "from-orange-800/80 to-orange-950",
    radial:
      "radial-gradient(circle, var(--hero-orange-glow) 0%, transparent 70%)",
  },
};

const HEROES: HeroDef[] = [
  {
    id: "archer",
    name: "Archer",
    icon: Crosshair,
    description: "A balanced hero with high attack speed and range.",
    cost: 0,
    stats: { hp: "100", damage: "10", speed: "200" },
    accentColor: "emerald",
  },
  {
    id: "mage",
    name: "Mage",
    icon: Wand2,
    description: "High damage output but fragile. Starts with Homing Arrows.",
    cost: 100,
    stats: { hp: "80", damage: "12", speed: "200" },
    startingSkill: "Homing Arrows",
    accentColor: "blue",
  },
  {
    id: "warrior",
    name: "Warrior",
    icon: Sword,
    description: "Tanky melee specialist. Slow attacks but massive HP pool.",
    cost: 150,
    stats: { hp: "130", damage: "10", speed: "200" },
    startingSkill: "Sword Spin",
    accentColor: "orange",
  },
];

const STAT_ICONS: Record<string, LucideIcon> = {
  hp: Heart,
  damage: Swords,
  speed: Zap,
};
const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  damage: "DMG",
  speed: "SPD",
};

export function HeroSelect() {
  const { data: coins, isError: coinsError } = useCoins();
  const { data: selectedHero, isError: selectedError } = useSelectedHero();
  const { mutate: selectHero, isPending: isSelecting } = useSelectHero();
  const { mutate: unlockHero, isPending: isUnlocking } = useUnlockHero();

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (selectedHero) {
      const idx = HEROES.findIndex((h) => h.id === selectedHero);
      if (idx >= 0) setActiveIndex(idx);
    }
  }, [selectedHero]);

  const { data: archerUnlocked, isError: archerError } =
    useIsHeroUnlocked("archer");
  const { data: mageUnlocked, isError: mageError } = useIsHeroUnlocked("mage");
  const { data: warriorUnlocked, isError: warriorError } =
    useIsHeroUnlocked("warrior");

  const unlockStatus: Record<HeroId, boolean> = {
    archer: archerUnlocked ?? true,
    mage: mageUnlocked ?? false,
    warrior: warriorUnlocked ?? false,
  };

  const hero = HEROES[activeIndex];
  const isSelected = selectedHero === hero.id;
  const canAfford = (coins ?? 0) >= hero.cost;

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < HEROES.length) setActiveIndex(idx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      goTo(activeIndex + (dx < 0 ? 1 : -1));
    }
  };

  const handleSelect = (heroId: HeroId) => {
    selectHero(heroId, {
      onError: () => toast.error("Failed to select hero"),
    });
  };

  const handleUnlock = (heroId: HeroId) => {
    unlockHero(heroId, {
      onError: () => toast.error("Failed to unlock hero"),
    });
  };

  return (
    <div className="flex flex-col min-h-full py-4 overflow-hidden">
      {(coinsError ||
        selectedError ||
        archerError ||
        mageError ||
        warriorError) && (
        <div className="text-destructive text-xs text-center mb-2">
          Failed to load hero data.
        </div>
      )}

      {/* Card carousel */}
      <div
        className="flex-1 relative flex items-center justify-center min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Cards */}
        {HEROES.map((h, i) => {
          const offset = i - activeIndex;
          const hAccent = ACCENT_STYLES[h.accentColor] ?? ACCENT_STYLES.emerald;
          const hUnlocked = unlockStatus[h.id];
          const hSelected = h.id === selectedHero;
          const isActive = i === activeIndex;
          const HIcon = h.icon;

          return (
            <div
              key={h.id}
              onClick={() => !isActive && goTo(i)}
              className={cn(
                "absolute w-[min(280px,75vw)] transition-all duration-500 ease-out",
                !isActive && "cursor-pointer",
              )}
              style={{
                transform: `translateX(${offset * 78}%) scale(${isActive ? 1 : 0.85})`,
                opacity: Math.abs(offset) > 1 ? 0 : isActive ? 1 : 0.45,
                zIndex: isActive ? 10 : 5 - Math.abs(offset),
                pointerEvents: Math.abs(offset) > 1 ? "none" : "auto",
              }}
            >
              <div
                className={cn(
                  "rounded-2xl border-2 p-5 flex flex-col items-center bg-gradient-to-b transition-all duration-500",
                  isActive &&
                    hUnlocked &&
                    cn(hAccent.border, hAccent.cardGradient, hAccent.glow),
                  isActive &&
                    !hUnlocked &&
                    "border-border/50 from-muted/90 via-muted/70 to-background shadow-[0_0_20px_rgba(100,100,100,0.08)]",
                  !isActive && "border-muted from-surface to-background",
                )}
              >
                {/* Hero icon */}
                <div className="relative mt-2 mb-4">
                  {isActive && hUnlocked && (
                    <div
                      className="absolute inset-0 w-28 h-28 rounded-full blur-2xl opacity-50"
                      style={{
                        transform: "translate(-6px, -6px)",
                        background: hAccent.radial,
                      }}
                    />
                  )}
                  <div
                    className={cn(
                      "relative w-20 h-20 rounded-full flex items-center justify-center border-2 bg-gradient-to-br",
                      hUnlocked
                        ? cn(
                            hAccent.iconBg,
                            isActive ? hAccent.border : "border-transparent",
                          )
                        : "from-muted/60 to-card border-border/30",
                    )}
                  >
                    {hUnlocked ? (
                      <HIcon
                        className={cn(
                          "w-10 h-10 drop-shadow-md",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      />
                    ) : (
                      <Lock className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                </div>

                {/* Selected badge */}
                {hSelected && (
                  <div className="font-display text-[10px] font-bold text-accent bg-accent/10 border border-accent/30 rounded-full px-3 py-0.5 mb-2 tracking-widest">
                    ACTIVE
                  </div>
                )}

                {/* Name */}
                <h3
                  className={cn(
                    "font-display text-xl font-bold tracking-wide",
                    hUnlocked
                      ? isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                      : "text-muted-foreground/50",
                  )}
                >
                  {h.name}
                </h3>

                {/* Description */}
                <p
                  className={cn(
                    "text-xs text-center mt-2 leading-relaxed min-h-[2.5rem]",
                    isActive
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50",
                  )}
                >
                  {h.description}
                </p>

                {/* Starting skill */}
                {h.startingSkill && (
                  <div
                    className={cn(
                      "mt-2 text-[11px] rounded-full px-2.5 py-1 flex items-center gap-1 border",
                      isActive && hUnlocked
                        ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                        : "bg-muted/30 text-muted-foreground/50 border-border/20",
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    {h.startingSkill}
                  </div>
                )}

                {/* Spacer for heroes without skills */}
                {!h.startingSkill && <div className="h-[26px]" />}

                {/* Stats */}
                <div className="flex gap-4 mt-4 w-full">
                  {(["hp", "damage", "speed"] as const).map((key) => {
                    const StatIcon = STAT_ICONS[key];
                    return (
                      <div
                        key={key}
                        className="flex-1 flex flex-col items-center"
                      >
                        <StatIcon
                          className={cn(
                            "w-3.5 h-3.5 mb-0.5",
                            isActive && hUnlocked
                              ? hAccent.text
                              : "text-muted-foreground/50",
                          )}
                        />
                        <span
                          className={cn(
                            "font-display font-bold text-base leading-none",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {h.stats[key]}
                        </span>
                        <span className="text-muted-foreground/50 text-[8px] uppercase tracking-widest mt-0.5">
                          {STAT_LABELS[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action button (only on active card) */}
                {isActive && (
                  <div className="w-full mt-5">
                    {hUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(hero.id);
                        }}
                        disabled={isSelected || isSelecting}
                        className={cn(
                          "w-full rounded-xl py-3 font-display font-bold text-sm tracking-wide transition-all cursor-pointer border-2",
                          isSelected
                            ? "bg-accent/10 text-accent border-accent/30 cursor-default"
                            : "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground border-accent/50 hover:brightness-110",
                          (isSelected || isSelecting) &&
                            "opacity-70 cursor-not-allowed",
                        )}
                      >
                        {isSelecting && (
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        )}
                        {isSelected
                          ? "Selected"
                          : isSelecting
                            ? "Selecting..."
                            : "Select Hero"}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlock(hero.id);
                        }}
                        disabled={!canAfford || isUnlocking}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display font-bold text-sm tracking-wide transition-all border-2",
                          canAfford && !isUnlocking
                            ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-foreground border-emerald-500/50 hover:brightness-110 cursor-pointer shadow-[0_2px_12px_rgba(16,185,129,0.25)]"
                            : "bg-muted/30 text-muted-foreground border-border/30 cursor-not-allowed",
                        )}
                      >
                        {isUnlocking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Coins className="w-4 h-4" />
                        )}
                        {isUnlocking
                          ? "Unlocking..."
                          : canAfford
                            ? `Unlock · ${hero.cost}`
                            : `Need ${hero.cost} coins`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 pt-4 pb-1">
        {HEROES.map((h, i) => (
          <button
            key={h.id}
            onClick={() => goTo(i)}
            className={cn(
              "rounded-full transition-all duration-300 border-0 cursor-pointer p-0",
              i === activeIndex
                ? cn(
                    "w-6 h-2",
                    ACCENT_STYLES[h.accentColor]?.text.replace("text-", "bg-"),
                  )
                : "w-2 h-2 bg-muted hover:bg-muted-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}
