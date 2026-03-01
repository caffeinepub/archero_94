import {
  useCoins,
  useHighestChapter,
  useTotalKills,
  useTotalRuns,
} from "../hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Skull,
  ArrowUp,
  Users,
  Lock,
  Play,
  Mountain,
  Flame,
  Sparkles,
} from "lucide-react";

interface HubScreenProps {
  onPlay: (chapterId: number) => void;
  onUpgrades: () => void;
  onHeroes: () => void;
}

const CHAPTER_ICONS = [Mountain, Flame, Sparkles];

export function HubScreen({ onPlay, onUpgrades, onHeroes }: HubScreenProps) {
  const { isError: coinsError } = useCoins();
  const { data: highestChapter, isError: chapterError } = useHighestChapter();
  const { data: totalRuns, isError: runsError } = useTotalRuns();
  const { data: totalKills, isError: killsError } = useTotalKills();
  const chapters = [
    {
      id: 1,
      name: "The Dark Caves",
      color: "from-emerald-950 to-teal-950",
      accent: "border-emerald-600",
    },
    {
      id: 2,
      name: "The Scorched Halls",
      color: "from-amber-950 to-orange-950",
      accent: "border-amber-600",
    },
    {
      id: 3,
      name: "The Arcane Tower",
      color: "from-purple-950 to-indigo-950",
      accent: "border-purple-600",
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-5 min-h-full">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          {
            label: "Total Runs",
            value: totalRuns ?? "...",
            icon: Play,
            color: "text-teal-400",
          },
          {
            label: "Total Kills",
            value: totalKills ?? "...",
            icon: Skull,
            color: "text-rose-400",
          },
          {
            label: "Best Chapter",
            value: highestChapter ?? 0,
            icon: Trophy,
            color: "text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gradient-to-br from-card to-surface border border-border rounded-xl p-3 text-center"
          >
            <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
            <div className="font-display text-foreground font-bold text-lg">
              {stat.value}
            </div>
            <div className="text-muted-foreground text-[10px] mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {(coinsError || chapterError || runsError || killsError) && (
        <div className="text-destructive text-xs text-center">
          Failed to load progress data.
        </div>
      )}

      {/* Chapter selection */}
      <div>
        <h2 className="text-muted-foreground text-[11px] font-bold tracking-widest mb-3">
          SELECT CHAPTER
        </h2>
        <div className="flex flex-col gap-2.5">
          {chapters.map((chapter) => {
            const isUnlocked = chapter.id <= (highestChapter ?? 0) + 1;
            const ChapterIcon = CHAPTER_ICONS[chapter.id - 1];
            return (
              <button
                key={chapter.id}
                onClick={() => isUnlocked && onPlay(chapter.id)}
                disabled={!isUnlocked}
                className={cn(
                  "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
                  "bg-gradient-to-r",
                  isUnlocked
                    ? cn(
                        chapter.color,
                        chapter.accent,
                        "hover:brightness-125 hover:scale-[1.02] cursor-pointer",
                      )
                    : "from-muted to-background border-border opacity-50 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    isUnlocked ? "bg-foreground/10" : "bg-foreground/5",
                  )}
                >
                  {isUnlocked ? (
                    <ChapterIcon className="w-6 h-6 text-foreground" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                <div>
                  <div
                    className={cn(
                      "font-display text-sm font-bold",
                      isUnlocked
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                    )}
                  >
                    Chapter {chapter.id}: {chapter.name}
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    {isUnlocked
                      ? "Tap to play"
                      : `Clear Chapter ${chapter.id - 1} to unlock`}
                  </div>
                </div>
                {isUnlocked && (
                  <Play className="w-5 h-5 text-foreground/50 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={onUpgrades}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-gradient-to-br from-card to-surface p-4 hover:border-emerald-500 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <ArrowUp className="w-6 h-6 text-emerald-400" />
          <span className="font-display text-foreground text-xs font-bold">
            Upgrades
          </span>
          <span className="text-muted-foreground text-[10px]">
            Permanent boosts
          </span>
        </button>

        <button
          onClick={onHeroes}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-gradient-to-br from-card to-surface p-4 hover:border-amber-500 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <Users className="w-6 h-6 text-amber-400" />
          <span className="font-display text-foreground text-xs font-bold">
            Heroes
          </span>
          <span className="text-muted-foreground text-[10px]">
            Choose your hero
          </span>
        </button>
      </div>
    </div>
  );
}
