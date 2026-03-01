import { useState, useEffect } from "react";
import {
  getMusicVolume,
  getSFXVolume,
  setMusicVolume,
  setSFXVolume,
} from "../utils/audio";
import { cn } from "@/lib/utils";
import {
  Settings,
  X,
  Music,
  Volume2,
  Activity,
  LogOut,
  Zap,
  DoorOpen,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { ActiveSkill } from "../utils/types";
import { getSkillDefinition } from "../utils/skills";

interface SettingsOverlayProps {
  open: boolean;
  onClose: () => void;
  onQuit?: () => void;
  skills?: ActiveSkill[];
}

export function SettingsOverlay({
  open,
  onClose,
  onQuit,
  skills,
}: SettingsOverlayProps) {
  const { clear } = useInternetIdentity();
  const [musicVol, setMusicVol] = useState(getMusicVolume);
  const [sfxVol, setSfxVol] = useState(getSFXVolume);
  const [showFPS, setShowFPS] = useState(false);

  useEffect(() => {
    try {
      const fp = localStorage.getItem("archero_show_fps");
      if (fp !== null) setShowFPS(fp === "true");
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      setMusicVol(getMusicVolume());
      setSfxVol(getSFXVolume());
    }
  }, [open]);

  if (!open) return null;

  const handleMusicChange = (v: number[]) => {
    const val = v[0];
    setMusicVol(val);
    setMusicVolume(val);
    try {
      localStorage.setItem("archero_music_volume", String(val));
    } catch {}
  };

  const handleSFXChange = (v: number[]) => {
    const val = v[0];
    setSfxVol(val);
    setSFXVolume(val);
    try {
      localStorage.setItem("archero_sfx_volume", String(val));
    } catch {}
  };

  const handleFPSToggle = () => {
    const next = !showFPS;
    setShowFPS(next);
    try {
      localStorage.setItem("archero_show_fps", String(next));
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[300]"
      onClick={onClose}
    >
      <div
        className="animate-slide-up-fade bg-gradient-to-b from-card to-background border-2 border-border rounded-2xl p-6 max-w-sm w-full mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <h2 className="text-accent font-bold text-base tracking-wider">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Power-ups */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-teal-400" />
            <span className="text-teal-400 font-bold text-sm tracking-wider">
              Power-ups
            </span>
          </div>
          {skills && skills.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {skills.map((skill) => {
                const def = getSkillDefinition(skill.id);
                return (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50"
                  >
                    <span className="text-base leading-none">
                      {def?.icon ?? "?"}
                    </span>
                    <span className="text-foreground text-sm flex-1">
                      {skill.name}
                    </span>
                    {skill.level > 1 && (
                      <span className="text-teal-400 text-xs font-bold">
                        Lv.{skill.level}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic px-3">
              No power-ups yet
            </p>
          )}
        </div>

        {/* Music volume */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-sm">Music Volume</span>
            </div>
            <span className="text-foreground text-sm font-bold">
              {Math.round(musicVol * 100)}%
            </span>
          </div>
          <Slider
            value={[musicVol]}
            onValueChange={handleMusicChange}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* SFX volume */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-sm">SFX Volume</span>
            </div>
            <span className="text-foreground text-sm font-bold">
              {Math.round(sfxVol * 100)}%
            </span>
          </div>
          <Slider
            value={[sfxVol]}
            onValueChange={handleSFXChange}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* FPS toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">FPS Counter</span>
          </div>
          <button
            onClick={handleFPSToggle}
            className={cn(
              "px-4 py-1.5 rounded-lg font-bold text-xs transition-all border-0 cursor-pointer",
              showFPS
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {showFPS ? "ON" : "OFF"}
          </button>
        </div>

        {/* Quit run / Sign out */}
        <div className="border-t border-border pt-4 mt-1 flex flex-col gap-2">
          {onQuit && (
            <Button
              variant="ghost"
              onClick={onQuit}
              className="w-full text-teal-400/70 hover:text-teal-400 hover:bg-teal-500/10 cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              Quit Run
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={clear}
            className="w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
