import { useState } from "react";
import {
  useAllUpgradeLevels,
  useCoins,
  usePurchaseUpgrade,
  type UpgradeId,
} from "../hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  Heart,
  Swords,
  Zap,
  Target,
  Shield,
  Coins,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: LucideIcon;
  description: string;
  effectPerLevel: string;
  maxLevel: number;
  color: string;
}

const UPGRADES: UpgradeDef[] = [
  {
    id: "max_hp",
    name: "Vitality",
    icon: Heart,
    description: "Increase starting max HP",
    effectPerLevel: "+10 Max HP",
    maxLevel: 5,
    color: "text-rose-400",
  },
  {
    id: "attack_damage",
    name: "Power",
    icon: Swords,
    description: "Increase base attack damage",
    effectPerLevel: "+10% Attack Damage",
    maxLevel: 5,
    color: "text-amber-400",
  },
  {
    id: "attack_speed",
    name: "Swiftness",
    icon: Zap,
    description: "Increase base attack speed",
    effectPerLevel: "+8% Attack Speed",
    maxLevel: 5,
    color: "text-yellow-300",
  },
  {
    id: "crit_chance",
    name: "Precision",
    icon: Target,
    description: "Increase base crit chance",
    effectPerLevel: "+3% Crit Chance",
    maxLevel: 5,
    color: "text-teal-400",
  },
  {
    id: "damage_reduction",
    name: "Armor",
    icon: Shield,
    description: "Reduce incoming damage from the start",
    effectPerLevel: "+1 Damage Reduction",
    maxLevel: 5,
    color: "text-emerald-400",
  },
];

function getCost(currentLevel: number): number {
  return 20 + currentLevel * 10;
}

export function UpgradeShop() {
  const { data: coins, isError: coinsError } = useCoins();
  const { data: levels, isError: levelsError } = useAllUpgradeLevels();
  const { mutate: purchase, isPending } = usePurchaseUpgrade();

  const [pendingId, setPendingId] = useState<UpgradeId | null>(null);

  const handlePurchase = (id: UpgradeId) => {
    setPendingId(id);
    purchase(id, {
      onSuccess: () => {
        setPendingId(null);
      },
      onError: () => {
        setPendingId(null);
      },
    });
  };

  return (
    <div className="flex flex-col">
      {(coinsError || levelsError) && (
        <div className="text-destructive text-xs text-center p-4">
          Failed to load upgrade data.
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        {UPGRADES.map((upgrade) => {
          const currentLevel = levels?.[upgrade.id] ?? 0;
          const isMaxed = currentLevel >= upgrade.maxLevel;
          const cost = getCost(currentLevel);
          const canAfford = (coins ?? 0) >= cost;
          const isBuying = pendingId === upgrade.id;
          const Icon = upgrade.icon;

          return (
            <div
              key={upgrade.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 p-4 bg-gradient-to-br from-card to-surface transition-all",
                isMaxed ? "border-accent/40" : "border-border",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center bg-foreground/5",
                )}
              >
                <Icon className={cn("w-5 h-5", upgrade.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-foreground font-bold text-sm">
                    {upgrade.name}
                  </span>
                  {isMaxed && (
                    <span className="text-accent text-[10px] font-bold bg-accent/15 rounded-full px-2 py-0.5">
                      MAX
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  {upgrade.description}
                </div>

                {/* Level progress bar */}
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: upgrade.maxLevel }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all",
                        i < currentLevel ? "bg-emerald-500" : "bg-secondary",
                      )}
                    />
                  ))}
                </div>

                <div className="text-teal-400 text-[10px] mt-1">
                  {currentLevel > 0
                    ? `Lv.${currentLevel}/${upgrade.maxLevel}`
                    : ""}{" "}
                  {upgrade.effectPerLevel}
                </div>
              </div>

              {!isMaxed && (
                <button
                  onClick={() => handlePurchase(upgrade.id)}
                  disabled={!canAfford || isBuying || isPending}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 font-display font-bold text-[11px] transition-all whitespace-nowrap border-0",
                    canAfford && !isBuying
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-foreground hover:brightness-110 cursor-pointer shadow-[0_2px_12px_rgba(16,185,129,0.25)]"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {isBuying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Coins className="w-3 h-3" />
                  )}
                  {isBuying ? "..." : cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
