import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialGameState, updateGameState } from "../utils/engine";
import {
  createInputState,
  createJoystickState,
  setupKeyboardInput,
  setupTouchInput,
  setupMouseInput,
} from "../utils/input";
import { renderFrame } from "../utils/renderer";
import { FIXED_TIMESTEP, JOYSTICK_RADIUS, MAX_DELTA } from "../utils/constants";
import type { GameState, PermanentBonuses, SkillId } from "../utils/types";
import { acquireSkill } from "../utils/skills";
import { getChapter } from "../utils/chapters";
import { isBossType } from "../utils/bosses";
import { playSFX, playMusic, stopAllMusic, resumeAudio } from "../utils/audio";
import { SkillSelection } from "./SkillSelection";
import { GameOverScreen, type RunStats } from "./GameOverScreen";
import { SettingsOverlay } from "./SettingsOverlay";
import { Pause } from "lucide-react";

// Portrait panel dimensions matching a mobile phone viewport
const PANEL_WIDTH = 390;
const PANEL_MAX_HEIGHT = 844;

export interface GameCanvasProps {
  chapterId: number;
  permanentBonuses?: PermanentBonuses;
  heroId?: string;
  onGameEnd: () => void;
}

export function GameCanvas({
  chapterId,
  permanentBonuses,
  heroId,
  onGameEnd,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(
    createInitialGameState(chapterId, permanentBonuses, heroId),
  );
  const inputRef = useRef(createInputState());
  const joystickRef = useRef(createJoystickState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const panelSizeRef = useRef({ width: 0, height: 0 });

  // Compute isMobile eagerly so it's available for JSX on first render
  const [isMobile] = useState(
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
  );
  const isMobileRef = useRef(isMobile);

  // Screen shake state
  const shakeRef = useRef({ x: 0, y: 0, timer: 0, intensity: 0 });

  // Game over capture guard (prevents multiple state updates)
  const gameOverCapturedRef = useRef(false);

  // Skill selection via ref to avoid gameLoop recreating on state change
  const showSkillSelectionRef = useRef(false);

  // FPS tracking
  const fpsRef = useRef(0);
  const fpsFrameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const showFPSRef = useRef(false);

  // React state for overlay rendering
  const [showSkillSelection, setShowSkillSelection] = useState(false);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    panelSizeRef.current = { width, height };

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const handleRetry = useCallback(() => {
    gameStateRef.current = createInitialGameState(
      chapterId,
      permanentBonuses,
      heroId,
    );
    gameOverCapturedRef.current = false;
    showSkillSelectionRef.current = false;
    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    setRunStats(null);
    setShowSkillSelection(false);
  }, [chapterId, permanentBonuses, heroId]);

  const handleOpenSettings = useCallback(() => {
    gameStateRef.current.isPaused = true;
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    try {
      showFPSRef.current = localStorage.getItem("archero_show_fps") === "true";
    } catch {}
    gameStateRef.current.isPaused = false;
    setShowSettings(false);
  }, []);

  const handleQuit = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    stopAllMusic();
    onGameEnd();
  }, [onGameEnd]);

  const handleSkillSelect = useCallback((skillId: SkillId) => {
    const state = gameStateRef.current;
    acquireSkill(state.player, skillId);
    state.isSkillSelection = false;
    showSkillSelectionRef.current = false;
    setShowSkillSelection(false);
    playSFX("skill_select");
  }, []);

  // Use empty deps — everything accessed via refs
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;

    let delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    if (delta > MAX_DELTA) delta = MAX_DELTA;
    accumulatorRef.current += delta;

    // FPS tracking
    fpsFrameCountRef.current++;
    const fpsDelta = timestamp - fpsTimerRef.current;
    if (fpsDelta >= 1000) {
      fpsRef.current = Math.round((fpsFrameCountRef.current * 1000) / fpsDelta);
      fpsFrameCountRef.current = 0;
      fpsTimerRef.current = timestamp;
    }

    const viewportWidth = panelSizeRef.current.width || window.innerWidth;
    const viewportHeight = panelSizeRef.current.height || window.innerHeight;
    const state = gameStateRef.current;

    // Update game state only when active
    const isGameActive = !state.gameOver && !state.victory;
    if (isGameActive && !state.isPaused) {
      while (accumulatorRef.current >= FIXED_TIMESTEP) {
        updateGameState(
          state,
          inputRef.current,
          FIXED_TIMESTEP,
          viewportWidth,
          viewportHeight,
        );
        accumulatorRef.current -= FIXED_TIMESTEP;
      }
    } else {
      accumulatorRef.current = 0;
    }

    // Process screen shake events
    for (const event of state.screenShakeEvents) {
      shakeRef.current.intensity = Math.max(
        shakeRef.current.intensity,
        event.intensity,
      );
      shakeRef.current.timer = Math.max(shakeRef.current.timer, event.duration);
    }
    state.screenShakeEvents = [];

    // Update shake offset
    const shake = shakeRef.current;
    if (shake.timer > 0) {
      shake.timer -= delta;
      const scale = Math.max(0, shake.timer / 0.3);
      shake.x = (Math.random() * 2 - 1) * shake.intensity * scale;
      shake.y = (Math.random() * 2 - 1) * shake.intensity * scale;
      if (shake.timer <= 0) {
        shake.x = 0;
        shake.y = 0;
        shake.intensity = 0;
      }
    }

    // Process audio events
    for (const event of state.audioEvents) {
      playSFX(event);
    }
    state.audioEvents = [];

    // Handle music (chapter vs boss)
    const inBossRoom = state.enemies.some((e) => e.alive && isBossType(e.type));
    const musicTrack = inBossRoom ? 3 : state.chapterId - 1;
    playMusic(musicTrack);

    // Skill selection
    if (state.isSkillSelection && !showSkillSelectionRef.current) {
      showSkillSelectionRef.current = true;
      setShowSkillSelection(true);
    }

    // Detect game over / victory
    if ((state.gameOver || state.victory) && !gameOverCapturedRef.current) {
      gameOverCapturedRef.current = true;
      const chapter = getChapter(state.chapterId);
      setRunStats({
        coins: state.player.coins,
        kills: state.killCount,
        roomsCleared: state.victory
          ? state.currentRoom
          : Math.max(0, state.currentRoom - 1),
        totalRooms: state.totalRooms,
        chapterId: state.chapterId,
        chapterName: chapter.name,
        runTime: state.runTimer,
        skills: state.player.skills.map((s) => s.name),
        type: state.gameOver ? "death" : "victory",
      });
    }

    // Render
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(shake.x, shake.y);
    renderFrame(ctx, state, viewportWidth, viewportHeight, joystickRef.current);
    ctx.restore();

    // FPS overlay — reapply DPR scale (no shake) so font sizes are correct
    if (showFPSRef.current) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#00ff00";
      ctx.fillText(`${fpsRef.current} FPS`, 10, 20);
      ctx.restore();
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    // Load saved settings
    try {
      showFPSRef.current = localStorage.getItem("archero_show_fps") === "true";
    } catch {}

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const cleanupKeyboard = setupKeyboardInput(inputRef.current);
    let cleanupTouch: (() => void) | undefined;
    let cleanupMouse: (() => void) | undefined;

    const canvas = canvasRef.current;
    if (canvas) {
      cleanupTouch = setupTouchInput(
        inputRef.current,
        joystickRef.current,
        canvas,
        JOYSTICK_RADIUS,
      );
      cleanupMouse = setupMouseInput(
        inputRef.current,
        joystickRef.current,
        canvas,
        JOYSTICK_RADIUS,
      );
    }

    // Resume audio context on first user interaction
    const handleFirstInteraction = () => {
      resumeAudio();
    };
    window.addEventListener("touchstart", handleFirstInteraction, {
      once: true,
    });
    window.addEventListener("click", handleFirstInteraction, { once: true });

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("click", handleFirstInteraction);
      cleanupKeyboard();
      cleanupTouch?.();
      cleanupMouse?.();
      cancelAnimationFrame(animFrameRef.current);
      stopAllMusic();
    };
  }, [gameLoop, resizeCanvas]);

  return (
    <>
      {/* Dark backdrop for non-mobile desktop view */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#050508",
            zIndex: 0,
          }}
        />
      )}

      {/* Portrait game panel — centered on desktop, full-screen on mobile */}
      <div
        ref={containerRef}
        style={
          isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "hidden",
                zIndex: 1,
              }
            : {
                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: `${PANEL_WIDTH}px`,
                height: "100vh",
                maxHeight: `${PANEL_MAX_HEIGHT}px`,
                overflow: "hidden",
                zIndex: 1,
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.06), 0 0 80px rgba(0,0,0,0.9)",
              }
        }
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            position: "absolute",
            top: 0,
            left: 0,
            touchAction: "none",
          }}
        />

        {/* Pause button — top-left, matching reference Archero layout */}
        {!runStats && !showSettings && (
          <button
            onClick={handleOpenSettings}
            style={{ position: "absolute", top: 8, left: 8, zIndex: 100 }}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/60 border border-white/15 text-zinc-200 hover:text-white hover:bg-black/75 hover:border-white/30 transition-all cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Full-screen overlays rendered above the game panel */}
      {showSkillSelection && (
        <SkillSelection
          currentSkills={gameStateRef.current.player.skills}
          onSelect={handleSkillSelect}
        />
      )}

      <SettingsOverlay
        open={showSettings}
        onClose={handleCloseSettings}
        onQuit={handleQuit}
        skills={gameStateRef.current.player.skills}
      />

      {runStats && (
        <GameOverScreen
          stats={runStats}
          onRetry={handleRetry}
          onHub={onGameEnd}
        />
      )}
    </>
  );
}
