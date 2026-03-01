import { useEffect } from "react";
import { useRecordRunEnd } from "../hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Skull,
  Coins,
  Clock,
  Swords,
  DoorOpen,
  RotateCcw,
  Home,
  Sparkles,
} from "lucide-react";

export interface RunStats {
  coins: number;
  kills: number;
  roomsCleared: number;
  totalRooms: number;
  chapterId: number;
  chapterName: string;
  runTime: number;
  skills: string[];
  type: "death" | "victory";
}

interface GameOverScreenProps {
  stats: RunStats;
  onRetry: () => void;
  onHub: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function GameOverScreen({ stats, onRetry, onHub }: GameOverScreenProps) {
  const { mutate: recordRunEnd } = useRecordRunEnd();

  useEffect(() => {
    recordRunEnd({
      coins: stats.coins,
      kills: stats.kills,
      chapter: stats.chapterId,
    });
  }, []);

  const isVictory = stats.type === "victory";

  return (
    <div className="fixed inset-0 bg-black/92 flex flex-col items-center justify-center z-[200] p-5">
      <div
        className={cn(
          "animate-slide-up-fade w-full max-w-md rounded-2xl border-2 p-7 flex flex-col gap-5",
          "bg-gradient-to-b from-card to-background",
          isVictory ? "border-accent/60" : "border-destructive/40",
        )}
      >
        {/* Title */}
        <div className="text-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center",
              isVictory ? "bg-accent/15" : "bg-destructive/15",
            )}
          >
            {isVictory ? (
              <Trophy className="w-8 h-8 text-accent" />
            ) : (
              <Skull className="w-8 h-8 text-destructive" />
            )}
          </div>
          <h2
            className={cn(
              "text-xl font-bold tracking-wider",
              isVictory ? "text-accent" : "text-destructive",
            )}
          >
            {isVictory ? "CHAPTER COMPLETE!" : "GAME OVER"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.chapterName}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              label: "Rooms Cleared",
              value: `${stats.roomsCleared}/${stats.totalRooms}`,
              icon: DoorOpen,
              color: "text-teal-400",
            },
            {
              label: "Enemies Killed",
              value: stats.kills,
              icon: Swords,
              color: "text-rose-400",
            },
            {
              label: "Coins Earned",
              value: stats.coins,
              icon: Coins,
              color: "text-amber-400",
            },
            {
              label: "Run Time",
              value: formatTime(stats.runTime),
              icon: Clock,
              color: "text-emerald-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-foreground/[0.03] border border-border rounded-lg p-3 text-center"
            >
              <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
              <div className="text-foreground font-bold text-base">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-[10px] mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Skills acquired */}
        {stats.skills.length > 0 && (
          <div>
            <div className="text-muted-foreground text-[10px] font-bold tracking-widest mb-2">
              SKILLS ACQUIRED
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-teal-500/15 border border-teal-500/30 rounded-md px-2 py-1 text-teal-300 text-[10px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Coins saved */}
        <div className="flex items-center justify-center gap-2 bg-accent/8 border border-accent/20 rounded-lg p-2.5">
          <Coins className="w-4 h-4 text-accent" />
          <span className="text-accent text-xs font-medium">
            {stats.coins} coins saved to your account
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onHub}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-border py-3 text-muted-foreground font-bold text-sm hover:border-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Hub
          </button>
          <button
            onClick={onRetry}
            className={cn(
              "flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-all cursor-pointer border-0",
              isVictory
                ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:brightness-110"
                : "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:brightness-110",
            )}
          >
            {isVictory ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {isVictory ? "Next Chapter" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}
