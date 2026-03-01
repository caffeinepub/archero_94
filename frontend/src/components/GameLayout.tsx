import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCoins } from "../hooks/useQueries";
import { CurrencyBadge } from "./CurrencyBadge";
import { SettingsOverlay } from "./SettingsOverlay";
import { ArrowLeft, Coins, Settings } from "lucide-react";

interface GameLayoutProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  screen: string;
}

export function GameLayout({
  title,
  showBack,
  onBack,
  children,
  screen,
}: GameLayoutProps) {
  const { data: coins, isError: coinsError } = useCoins();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const contentRef = useRef<React.ReactNode>(children);
  const currentScreenRef = useRef(screen);

  // Keep content ref updated for same-screen re-renders
  if (screen === currentScreenRef.current && !transitioning) {
    contentRef.current = children;
  }

  useEffect(() => {
    if (screen === currentScreenRef.current) return;

    setTransitioning(true);

    const timer = setTimeout(() => {
      contentRef.current = children;
      currentScreenRef.current = screen;
      setTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-b from-card to-transparent">
        {/* Left: back button or title */}
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={onBack}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-display text-accent font-bold text-base tracking-wider">
            {title}
          </h2>
        </div>

        {/* Right: currencies + settings */}
        <div className="flex items-center gap-2">
          <CurrencyBadge
            icon={<Coins className="w-3.5 h-3.5 text-accent" />}
            amount={coinsError ? null : (coins ?? null)}
          />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-accent transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content with fade transition */}
      <div
        className={cn(
          "flex-1 overflow-y-auto transition-opacity duration-150 ease-out",
          transitioning ? "opacity-0" : "opacity-100",
        )}
      >
        {contentRef.current}
      </div>

      {/* Settings overlay */}
      <SettingsOverlay
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
