import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  variant?: "fullscreen" | "overlay";
}

export function LoadingScreen({ variant = "fullscreen" }: LoadingScreenProps) {
  if (variant === "overlay") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1
          className={cn(
            "font-display text-4xl text-accent tracking-[0.3em] uppercase",
            "rounded-lg px-4 py-2 animate-glow-pulse",
          )}
        >
          ARCHERO
        </h1>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    </div>
  );
}
