import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useAllUpgradeLevels, useSelectedHero } from "./hooks/useQueries";
import { setMusicVolume, setSFXVolume } from "./utils/audio";
import type { PermanentBonuses } from "./utils/types";
import type { UpgradeId } from "./hooks/useQueries";
import { GameCanvas } from "./components/GameCanvas";
import { GameLayout } from "./components/GameLayout";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginScreen } from "./components/LoginScreen";
import { HubScreen } from "./components/HubScreen";
import { UpgradeShop } from "./components/UpgradeShop";
import { HeroSelect } from "./components/HeroSelect";

type Screen = "hub" | "game" | "upgrades" | "heroes";

function computeBonuses(levels: Record<UpgradeId, number>): PermanentBonuses {
  return {
    maxHpBonus: (levels.max_hp ?? 0) * 10,
    attackDamagePercent: (levels.attack_damage ?? 0) * 0.1,
    attackSpeedPercent: (levels.attack_speed ?? 0) * 0.08,
    critChanceBonus: (levels.crit_chance ?? 0) * 0.03,
    damageReductionBonus: levels.damage_reduction ?? 0,
  };
}

const App = () => {
  const { identity, isInitializing } = useInternetIdentity();
  const [screen, setScreen] = useState<Screen>("hub");
  const [chapterId, setChapterId] = useState(1);

  const { data: upgradeLevels } = useAllUpgradeLevels();
  const { data: selectedHero } = useSelectedHero();

  // Load saved audio settings on startup
  useEffect(() => {
    try {
      const music = localStorage.getItem("archero_music_volume");
      if (music !== null) setMusicVolume(parseFloat(music));
      const sfx = localStorage.getItem("archero_sfx_volume");
      if (sfx !== null) setSFXVolume(parseFloat(sfx));
    } catch {}
  }, []);

  // Still loading auth state
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Not authenticated — show login
  if (!identity) {
    return <LoginScreen />;
  }

  const bonuses = upgradeLevels ? computeBonuses(upgradeLevels) : undefined;

  const handlePlay = (id: number) => {
    setChapterId(id);
    setScreen("game");
  };

  if (screen === "game") {
    return (
      <GameCanvas
        chapterId={chapterId}
        permanentBonuses={bonuses}
        heroId={selectedHero}
        onGameEnd={() => setScreen("hub")}
      />
    );
  }

  const titles: Record<string, string> = {
    hub: "ARCHERO",
    upgrades: "UPGRADES",
    heroes: "HEROES",
  };

  return (
    <>
      <GameLayout
        title={titles[screen]}
        showBack={screen !== "hub"}
        onBack={screen !== "hub" ? () => setScreen("hub") : undefined}
        screen={screen}
      >
        {screen === "hub" && (
          <HubScreen
            onPlay={handlePlay}
            onUpgrades={() => setScreen("upgrades")}
            onHeroes={() => setScreen("heroes")}
          />
        )}
        {screen === "upgrades" && <UpgradeShop />}
        {screen === "heroes" && <HeroSelect />}
      </GameLayout>
      <Toaster position="bottom-center" />
    </>
  );
};

export default App;
